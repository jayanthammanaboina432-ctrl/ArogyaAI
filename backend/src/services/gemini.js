import { AppError } from '../middleware/errorHandler.js';

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';

// Try the primary (fast) model first; each Gemini model tracks its own
// separate free-tier daily quota, so if the primary is exhausted (429) we
// fall through to the next one instead of failing the request outright.
// GEMINI_MODEL can be a single id or a comma-separated list, fastest first.
const MODELS = (
  process.env.GEMINI_MODEL ||
  'gemini-3-flash-preview,gemini-3.1-flash-lite,gemini-flash-lite-latest'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

// Fail fast instead of making users stare at a spinner: cap each attempt and
// the whole request, then show a clear "service unavailable" message.
const ATTEMPT_TIMEOUT_MS = 15000;
const TOTAL_DEADLINE_MS = 40000;

export const SERVICE_UNAVAILABLE_MESSAGE =
  'ArogyaAI service is not available right now. Please try again in a few minutes.';


export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Low-level call to Gemini's generateContent endpoint.
 * `contents` is the full conversation array: [{ role, parts }, ...].
 * Returns the raw text of the first candidate. Throws AppError with
 * user-safe messages on any failure (network, overload, bad shape).
 *
 * Tries each model in MODELS in order. Within a model, a transient 503
 * (overload) is retried with backoff; a 429 (quota exhausted for that
 * model/day) moves on to the next model immediately, since backing off
 * won't help a daily cap.
 */
async function callGemini({ contents, systemInstruction, generationConfig }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new AppError(503, SERVICE_UNAVAILABLE_MESSAGE);
  }

  const body = { contents, generationConfig };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const startedAt = Date.now();
  let lastStatus;
  let lastDetail = '';

  // One attempt per model: a slow, overloaded (503) or quota-exhausted (429)
  // model won't recover within the request, so move straight to the next one.
  for (const model of MODELS) {
    if (Date.now() - startedAt > TOTAL_DEADLINE_MS - 3000) break;

    const url = `${API_ROOT}/${model}:generateContent?key=${key}`;
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(
          Math.min(ATTEMPT_TIMEOUT_MS, TOTAL_DEADLINE_MS - (Date.now() - startedAt))
        ),
      });
    } catch (err) {
      lastStatus = err.name;
      console.warn(`Gemini ${model} failed (${err.name}), trying next model.`);
      continue;
    }

    if (res.ok) return extractText(res, model, await res.json());

    lastStatus = res.status;
    lastDetail = await res.text().catch(() => '');
    console.warn(`Gemini ${model} returned ${res.status}, trying next model.`);
  }

  console.warn(`Gemini exhausted all models. Last status ${lastStatus}: ${lastDetail.slice(0, 300)}`);
  throw new AppError(503, SERVICE_UNAVAILABLE_MESSAGE);
}

async function extractText(res, model, payload) {
  const candidate = payload?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;

  // A candidate can come back with no text if it was blocked by safety
  // filters — treat that as "no usable response" rather than a hard error.
  if (typeof text !== 'string') {
    console.warn(`Gemini (${model}) response missing text:`, JSON.stringify(payload).slice(0, 500));
    throw new AppError(502, 'ArogyaAI could not process that response. Please try again.');
  }

  return text;
}

/**
 * Call Gemini and return parsed JSON constrained to `schema`.
 * `parts` lets callers send multimodal content (text + inline image data);
 * defaults to a single text part built from `prompt`.
 */
export async function generateJSON({
  prompt,
  parts,
  schema,
  temperature = 0.2,
  systemInstruction,
  maxOutputTokens = 1536,
}) {
  const text = await callGemini({
    contents: [{ role: 'user', parts: parts || [{ text: prompt }] }],
    systemInstruction,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature,
      maxOutputTokens,
    },
  });

  try {
    return JSON.parse(text);
  } catch {
    console.error('Gemini returned non-JSON text:', text.slice(0, 500));
    throw new AppError(502, 'ArogyaAI could not process that response. Please try again.');
  }
}

/**
 * Freeform conversational call. `history` is [{ role: 'user'|'model', text }].
 * Returns the assistant's plain-text reply.
 */
export async function generateText({ history, systemInstruction, temperature = 0.4 }) {
  const contents = history.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));

  const text = await callGemini({
    contents,
    systemInstruction,
    generationConfig: { temperature, maxOutputTokens: 800 },
  });

  return text.trim();
}

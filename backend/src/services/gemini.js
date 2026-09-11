import { AppError } from '../middleware/errorHandler.js';

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';

// Try the primary (fast) model first; each Gemini model tracks its own
// separate free-tier daily quota, so if the primary is exhausted (429) we
// fall through to the next one instead of failing the request outright.
// GEMINI_MODEL can be a single id or a comma-separated list, fastest first.
const MODELS = (process.env.GEMINI_MODEL || 'gemini-3.6-flash,gemini-flash-lite-latest')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    throw new AppError(503, 'AI service is not configured. Please try again later.');
  }

  const body = { contents, generationConfig };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const RETRIES_PER_MODEL = 2;
  let lastRes;

  for (const model of MODELS) {
    const url = `${API_ROOT}/${model}:generateContent?key=${key}`;

    for (let attempt = 1; attempt <= RETRIES_PER_MODEL; attempt++) {
      let res;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);
      } catch {
        if (attempt === RETRIES_PER_MODEL) break; // try next model
        await sleep(500 * attempt);
        continue;
      }

      if (res.ok) return extractText(res, model, await res.json());

      lastRes = res;

      if (res.status === 429) {
        // Daily quota for this model is exhausted — move to the next model.
        console.warn(`Gemini quota exhausted for ${model}, trying next model.`);
        break;
      }
      if (res.status === 503 && attempt < RETRIES_PER_MODEL) {
        await sleep(600 * attempt);
        continue;
      }
      break; // other error status — try next model
    }
  }

  const detail = lastRes ? await lastRes.text().catch(() => '') : '';
  console.warn(`Gemini exhausted all models. Last status ${lastRes?.status}: ${detail.slice(0, 300)}`);
  throw new AppError(503, 'AI service is temporarily unavailable. Please try again.');
}

async function extractText(res, model, payload) {
  const candidate = payload?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;

  // A candidate can come back with no text if it was blocked by safety
  // filters — treat that as "no usable response" rather than a hard error.
  if (typeof text !== 'string') {
    console.warn(`Gemini (${model}) response missing text:`, JSON.stringify(payload).slice(0, 500));
    throw new AppError(502, 'AI service returned an unexpected response. Please try again.');
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
    throw new AppError(502, 'AI service returned an unexpected response. Please try again.');
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

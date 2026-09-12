import { generateJSON } from '../services/gemini.js';
import { SymptomRecord } from '../models/SymptomRecord.js';
import { AppError } from '../middleware/errorHandler.js';

const SCHEMA = {
  type: 'object',
  properties: {
    offTopic: { type: 'boolean' },
    possibleCondition: { type: 'string' },
    symptomsConsidered: { type: 'array', items: { type: 'string' } },
    generalGuidance: { type: 'string' },
    urgencyNote: { type: 'string' },
  },
  required: ['offTopic', 'possibleCondition', 'symptomsConsidered', 'generalGuidance'],
};

const OUT_OF_SCOPE_MESSAGE =
  'I can only help with health and healthcare-related questions. Please describe physical or mental symptoms you are experiencing.';

function buildPrompt(symptomsText) {
  return [
    'You are ArogyaAI, a healthcare information assistant.',
    'A user typed this into a "describe your symptoms" box:',
    `"""${symptomsText}"""`,
    '',
    'First decide: is this actually describing health symptoms or a medical concern? If it is NOT (e.g. it is a programming, math, general knowledge, or unrelated question), set offTopic to true and leave the other fields as empty strings/arrays.',
    '',
    'If it IS a genuine symptom description, return a PRELIMINARY, non-diagnostic assessment as JSON with:',
    '- offTopic: false',
    '- possibleCondition: one short phrase for the most likely general category (e.g. "Flu-like illness"). Never state it as confirmed.',
    '- symptomsConsidered: the individual symptoms you extracted from the text.',
    '- generalGuidance: 2-4 sentences of general self-care and when to see a professional. No medicine names, no dosages.',
    '- urgencyNote: one sentence. If the text suggests a medical emergency, clearly tell the user to seek immediate emergency care.',
    '',
    'Do not diagnose. Do not prescribe. Keep it general and safe.',
  ].join('\n');
}

function validate(result) {
  const ok =
    result &&
    typeof result.offTopic === 'boolean' &&
    typeof result.possibleCondition === 'string' &&
    Array.isArray(result.symptomsConsidered) &&
    result.symptomsConsidered.every((s) => typeof s === 'string') &&
    typeof result.generalGuidance === 'string';
  if (!ok) {
    throw new AppError(502, 'AI service returned an unexpected response. Please try again.');
  }

  // Don't trust the model's own prose for an off-topic query — it can be
  // talked into "explaining" an unrelated topic instead of refusing.
  if (result.offTopic || !result.possibleCondition.trim()) {
    return {
      offTopic: true,
      possibleCondition: '',
      symptomsConsidered: [],
      generalGuidance: OUT_OF_SCOPE_MESSAGE,
      urgencyNote: '',
      disclaimer: 'This is a preliminary AI assessment and is not a confirmed medical diagnosis.',
    };
  }

  return {
    offTopic: false,
    possibleCondition: result.possibleCondition.trim(),
    symptomsConsidered: result.symptomsConsidered.map((s) => s.trim()).filter(Boolean),
    generalGuidance: result.generalGuidance.trim(),
    urgencyNote:
      typeof result.urgencyNote === 'string' && result.urgencyNote.trim()
        ? result.urgencyNote.trim()
        : 'If your symptoms are severe, worsening, or feel life-threatening, seek emergency care immediately.',
    disclaimer:
      'This is a preliminary AI assessment and is not a confirmed medical diagnosis.',
  };
}

export async function analyze(req, res, next) {
  try {
    const symptomsText = (req.body.symptoms || '').trim().replace(/\s+/g, ' ');

    if (!symptomsText) {
      throw new AppError(400, 'Please enter at least one symptom.');
    }
    if (symptomsText.length > 1000) {
      throw new AppError(400, 'Please keep your description under 1000 characters.');
    }

    const raw = await generateJSON({ prompt: buildPrompt(symptomsText), schema: SCHEMA });
    const assessment = validate(raw);

    // Persistence is best-effort and must not fail the request.
    SymptomRecord.create({
      userId: req.userId,
      symptomsText,
      prediction: assessment,
    }).catch((err) => console.error('Failed to save symptom record:', err.message));

    res.json({ assessment });
  } catch (err) {
    next(err);
  }
}

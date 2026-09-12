import { generateJSON } from '../services/gemini.js';
import { AppError } from '../middleware/errorHandler.js';

const SCHEMA = {
  type: 'object',
  properties: {
    recognized: { type: 'boolean' },
    conditionName: { type: 'string' },
    overview: { type: 'string' },
    commonMedicines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          genericName: { type: 'string' },
          commonBrandNames: { type: 'string' },
          purpose: { type: 'string' },
          precautions: { type: 'string' },
        },
        required: ['genericName', 'purpose', 'precautions'],
      },
    },
    whenToSeeADoctor: { type: 'string' },
  },
  required: ['recognized', 'conditionName', 'overview', 'commonMedicines', 'whenToSeeADoctor'],
};

function buildPrompt(query) {
  return [
    'You are ArogyaAI, a healthcare information assistant.',
    `A user wants general medicine guidance for this symptom or condition: "${query}"`,
    '',
    'Return JSON with:',
    '- recognized: true if this is a real, common symptom/condition; false otherwise.',
    '- conditionName: the corrected / canonical name (echo the query if unrecognized).',
    '- overview: 1-2 sentences describing the condition in plain language.',
    '- commonMedicines: 2-4 entries for over-the-counter medicine types commonly used for this condition. Each entry has:',
    '    genericName (e.g. "Paracetamol"), commonBrandNames (e.g. "Dolo 650, Crocin" — well-known brands sold in India; leave empty string if none well-known), purpose (why it helps with this condition), precautions (who should avoid it / be careful, e.g. allergies, liver disease, pregnancy).',
    '- whenToSeeADoctor: 1-2 sentences on symptoms/duration that mean the user should stop self-managing and see a professional.',
    '',
    'Do NOT include a dosage or frequency. Do NOT instruct the user to take a specific medicine — only describe what is commonly used and why, so the user can discuss it with a pharmacist or doctor.',
    'If the query is not a real symptom/condition, set recognized to false and keep commonMedicines as an empty array.',
  ].join('\n');
}

const OUT_OF_SCOPE_MESSAGE =
  'I can only help with health and healthcare-related questions. Please enter a symptom or medical condition, such as fever, headache, or cold.';

function validate(result, fallbackName) {
  const ok =
    result &&
    typeof result.conditionName === 'string' &&
    typeof result.overview === 'string' &&
    Array.isArray(result.commonMedicines) &&
    result.commonMedicines.every(
      (m) =>
        m &&
        typeof m.genericName === 'string' &&
        typeof m.purpose === 'string' &&
        typeof m.precautions === 'string'
    ) &&
    typeof result.whenToSeeADoctor === 'string';
  if (!ok) {
    throw new AppError(502, 'AI service returned an unexpected response. Please try again.');
  }

  // The model can be tricked into "explaining" an unrelated query (e.g. "what
  // is python") instead of refusing outright. Don't trust its prose in that
  // case — override with a fixed out-of-scope message regardless of what it
  // wrote for overview/whenToSeeADoctor.
  if (!result.recognized) {
    return {
      recognized: false,
      conditionName: fallbackName,
      overview: OUT_OF_SCOPE_MESSAGE,
      commonMedicines: [],
      whenToSeeADoctor: '',
      disclaimer:
        "This is general information, not a prescription. Follow your doctor's prescription or the medicine label, and consult a qualified healthcare professional or pharmacist before taking any medicine.",
    };
  }

  return {
    recognized: true,
    conditionName: result.conditionName.trim() || fallbackName,
    overview: result.overview.trim(),
    commonMedicines: result.commonMedicines.map((m) => ({
      genericName: m.genericName.trim(),
      commonBrandNames: typeof m.commonBrandNames === 'string' ? m.commonBrandNames.trim() : '',
      purpose: m.purpose.trim(),
      precautions: m.precautions.trim(),
    })),
    whenToSeeADoctor: result.whenToSeeADoctor.trim(),
    disclaimer:
      "This is general information, not a prescription. Follow your doctor's prescription or the medicine label, and consult a qualified healthcare professional or pharmacist before taking any medicine.",
  };
}

export async function search(req, res, next) {
  try {
    const query = (req.query.query || '').toString().trim().replace(/\s+/g, ' ');

    if (!query) {
      throw new AppError(400, 'Please enter a symptom or condition to search.');
    }
    if (query.length > 100) {
      throw new AppError(400, 'Please enter a shorter symptom or condition.');
    }

    const raw = await generateJSON({ prompt: buildPrompt(query), schema: SCHEMA });
    res.json({ result: validate(raw, query) });
  } catch (err) {
    next(err);
  }
}

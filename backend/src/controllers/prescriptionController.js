import crypto from 'crypto';
import { generateJSON } from '../services/gemini.js';
import { PrescriptionRecord } from '../models/PrescriptionRecord.js';
import { AppError } from '../middleware/errorHandler.js';

const UNCLEAR = 'Text unclear / unable to confidently read.';

const SCHEMA = {
  type: 'object',
  properties: {
    looksLikePrescription: { type: 'boolean' },
    medicineNames: { type: 'array', items: { type: 'string' } },
    dosage: { type: 'string' },
    frequency: { type: 'string' },
    instructions: { type: 'string' },
    doctorOrHospitalInfo: { type: 'string' },
  },
  required: [
    'looksLikePrescription',
    'medicineNames',
    'dosage',
    'frequency',
    'instructions',
    'doctorOrHospitalInfo',
  ],
};

const PROMPT = [
  'You are ArogyaAI, a healthcare information assistant reading a photo of a prescription or medicine label.',
  '',
  'Extract only what is ACTUALLY visible and legible in the image. Return JSON with:',
  '- looksLikePrescription: true if this image is a prescription, medicine label, or medical note; false if it is clearly something else.',
  '- medicineNames: array of medicine names you can clearly read (empty array if none legible).',
  '- dosage: dosage text as written (e.g. "500mg"). If not legible or not present, respond with exactly: "Text unclear / unable to confidently read."',
  '- frequency: how often to take it, as written (e.g. "twice daily"). Same unclear rule as above.',
  '- instructions: any other instructions as written (e.g. "after food"). Same unclear rule as above.',
  '- doctorOrHospitalInfo: doctor name / hospital / clinic info if visible. Same unclear rule as above.',
  '',
  `Do NOT guess, infer, or invent any text that is not actually visible. If a field is unreadable or absent, use exactly this text: "${UNCLEAR}"`,
  'If the image does not look like a prescription at all, set looksLikePrescription to false and use the unclear text for all fields.',
].join('\n');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export const uploadLimits = { fileSize: MAX_BYTES };

function fallbackField(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : UNCLEAR;
}

function validate(result) {
  const ok =
    result &&
    typeof result.looksLikePrescription === 'boolean' &&
    Array.isArray(result.medicineNames) &&
    result.medicineNames.every((s) => typeof s === 'string');
  if (!ok) {
    throw new AppError(502, 'AI service returned an unexpected response. Please try again.');
  }
  return {
    looksLikePrescription: result.looksLikePrescription,
    medicineNames: result.medicineNames.map((s) => s.trim()).filter(Boolean),
    dosage: fallbackField(result.dosage),
    frequency: fallbackField(result.frequency),
    instructions: fallbackField(result.instructions),
    doctorOrHospitalInfo: fallbackField(result.doctorOrHospitalInfo),
  };
}

export async function analyze(req, res, next) {
  try {
    const file = req.file;
    if (!file) {
      throw new AppError(400, 'Please upload a prescription image.');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new AppError(400, 'Please upload a JPEG, PNG, or WEBP image.');
    }

    const raw = await generateJSON({
      parts: [
        { text: PROMPT },
        { inlineData: { mimeType: file.mimetype, data: file.buffer.toString('base64') } },
      ],
      schema: SCHEMA,
    });
    const extracted = validate(raw);

    if (!extracted.looksLikePrescription && extracted.medicineNames.length === 0) {
      extracted.readError = 'The image could not be read. Please upload a clearer image.';
    }

    PrescriptionRecord.create({
      userId: req.userId,
      fileReference: crypto.randomUUID(),
      extractedText: extracted,
    }).catch((err) => console.error('Failed to save prescription record:', err.message));

    res.json({ extracted });
  } catch (err) {
    next(err);
  }
}

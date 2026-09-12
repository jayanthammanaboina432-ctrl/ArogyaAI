import mongoose from 'mongoose';
import { generateText } from '../services/gemini.js';
import { ChatSession } from '../models/ChatSession.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { AppError } from '../middleware/errorHandler.js';

const SYSTEM_INSTRUCTION = [
  'You are ArogyaAI, a healthcare information assistant.',
  '',
  'PRIMARY ROLE:',
  'You must answer ONLY questions related to health, healthcare, medicines, symptoms, diseases, medical tests, prescriptions, first aid, nutrition, fitness, mental wellbeing, prevention, and general medical information.',
  '',
  'ALLOWED TOPICS:',
  '- Symptoms and common health conditions',
  '- Medicines and tablets: general uses, precautions, common side effects, and general safety information',
  '- Prescription and medicine information',
  '- Medical tests and their general purpose',
  '- First aid and basic health guidance',
  '- Nutrition and healthy lifestyle',
  '- Fitness and exercise related to health',
  '- Disease prevention and health awareness',
  '- General healthcare terminology',
  '- Hospitals, pharmacies, and healthcare navigation',
  '- ArogyaAI application features related to healthcare',
  '',
  'NOT ALLOWED:',
  '- Programming or coding questions',
  '- Mathematics',
  '- Physics, chemistry, or other academic questions',
  '- Politics',
  '- News and current events',
  '- Sports',
  '- Movies, music, entertainment, or games',
  '- Business, finance, trading, or investment advice',
  '- Travel recommendations',
  '- General conversation unrelated to healthcare',
  '- Any other topic that is not related to health or healthcare',
  '',
  'OUT-OF-SCOPE RESPONSE:',
  'If the user asks a question unrelated to health or healthcare, do not answer the question.',
  'Reply exactly:',
  '"I can only help with health and healthcare-related questions. Please ask me about symptoms, medicines, tablets, diseases, prescriptions, medical tests, nutrition, or other healthcare topics."',
  '',
  'MEDICAL SAFETY:',
  'Do not claim to be a doctor.',
  'Do not claim to provide a confirmed diagnosis.',
  'Do not replace professional medical care.',
  'Do not tell the user to ignore serious symptoms.',
  'Do not provide unsupported medication decisions.',
  'Do not prescribe medicines based only on symptoms.',
  'Do not provide personalized dosage instructions.',
  'For medicines, provide general educational information and advise following the prescription, package label, or advice of a qualified healthcare professional.',
  'For emergencies or serious symptoms, encourage immediate professional or emergency help.',
  '',
  'ArogyaAI FEATURES:',
  'You can help users navigate these healthcare features:',
  '- Check Symptoms',
  '- Medicine Guidance',
  '- Hospital & Pharmacy Finder',
  '- Prescription Reader',
  '- Emergency/SOS',
  '',
  'RESPONSE STYLE:',
  'Keep responses concise and easy to understand.',
  'Use a few sentences unless the user asks for more detail.',
  'Do not discuss topics outside healthcare.',
].join('\n');

const MAX_MESSAGE_LENGTH = 2000;
const HISTORY_LIMIT = 20; // most recent turns sent to Gemini for context

export async function sendMessage(req, res, next) {
  try {
    const message = (req.body.message || '').trim();
    const sessionId = (req.body.sessionId || '').toString().trim();

    if (!message) {
      throw new AppError(400, 'Please enter a message.');
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new AppError(400, 'Please keep your message under 2000 characters.');
    }

    let session;
    let isNewSession = false;
    if (sessionId) {
      if (!mongoose.isValidObjectId(sessionId)) {
        throw new AppError(404, 'Chat session not found.');
      }
      session = await ChatSession.findOne({ _id: sessionId, userId: req.userId });
      if (!session) {
        throw new AppError(404, 'Chat session not found.');
      }
    } else {
      // Don't persist the session until we know Gemini actually answered —
      // otherwise a failed first message leaves an empty orphan session.
      isNewSession = true;
      session = new ChatSession({ userId: req.userId, title: message.slice(0, 60) });
    }

    const priorMessages = isNewSession
      ? []
      : await ChatMessage.find({ sessionId: session._id })
          .sort({ createdAt: 1 })
          .limit(HISTORY_LIMIT)
          .lean();

    const history = [
      ...priorMessages.map((m) => ({ role: m.role, text: m.message })),
      { role: 'user', text: message },
    ];

    const reply = await generateText({ history, systemInstruction: SYSTEM_INSTRUCTION });

    if (isNewSession) {
      await session.save();
    }
    await ChatMessage.insertMany([
      { sessionId: session._id, role: 'user', message },
      { sessionId: session._id, role: 'model', message: reply },
    ]);
    session.updatedAt = new Date();
    await session.save();

    res.json({ sessionId: session._id.toString(), reply });
  } catch (err) {
    next(err);
  }
}

export async function listSessions(req, res, next) {
  try {
    const sessions = await ChatSession.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      sessions: sessions.map((s) => ({
        id: s._id.toString(),
        title: s.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getSession(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError(404, 'Chat session not found.');
    }

    const session = await ChatSession.findOne({ _id: id, userId: req.userId }).lean();
    if (!session) {
      throw new AppError(404, 'Chat session not found.');
    }

    const messages = await ChatMessage.find({ sessionId: id }).sort({ createdAt: 1 }).lean();

    res.json({
      session: { id: session._id.toString(), title: session.title, createdAt: session.createdAt },
      messages: messages.map((m) => ({
        role: m.role,
        message: m.message,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

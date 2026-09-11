import mongoose from 'mongoose';
import { generateText } from '../services/gemini.js';
import { ChatSession } from '../models/ChatSession.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { AppError } from '../middleware/errorHandler.js';

const SYSTEM_INSTRUCTION = [
  'You are ArogyaAI, a healthcare information assistant.',
  'Provide general educational information.',
  'Do not claim to diagnose users or replace clinicians.',
  'For emergencies or serious symptoms, encourage immediate professional or emergency help.',
  '',
  'You must not:',
  '- Claim to be a doctor.',
  '- Give a confirmed diagnosis.',
  '- Replace professional care.',
  '- Encourage users to ignore emergency symptoms.',
  '- Make unsupported medication decisions (no dosages, no "take this now").',
  '',
  'You can: explain health terminology, answer general healthcare questions,',
  'and help users navigate the ArogyaAI app (Check Symptoms, Medicine Guidance,',
  'Hospital & Pharmacy Finder, Prescription Reader, Emergency/SOS).',
  'Keep replies concise (a few sentences) unless the user asks for more detail.',
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

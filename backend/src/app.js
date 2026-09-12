import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import symptomRoutes from './routes/symptoms.js';
import medicineRoutes from './routes/medicines.js';
import healthcareRoutes from './routes/healthcare.js';
import chatRoutes from './routes/chat.js';
import prescriptionRoutes from './routes/prescriptions.js';
import emergencyRoutes from './routes/emergency.js';
import { geminiConfigured } from './services/gemini.js';
import { notFound, errorHandler, AppError } from './middleware/errorHandler.js';

// Accepts one or more comma-separated origins in FRONTEND_URL and strips
// any trailing slash from each — a bare trailing "/" is a very easy typo
// to make in a dashboard env var, and it silently breaks CORS matching
// (browsers never send a trailing slash in the Origin header) with no
// clear error pointing at the real cause. Normalizing here means a typo
// in the hosting dashboard can't take the whole API down.
function parseAllowedOrigins(raw) {
  const list = (raw || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return list;
}

export function createApp() {
  const app = express();
  const allowedOrigins = parseAllowedOrigins(process.env.FRONTEND_URL);

  // Disable CSP here: this is a pure JSON API, not an HTML-serving app, and
  // a default CSP can interfere with API responses/tools for no benefit.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header (curl, server-to-server, same-origin) — allow.
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        console.warn(`CORS blocked origin: ${origin} (allowed: ${allowedOrigins.join(', ')})`);
        callback(new AppError(403, 'This origin is not permitted to access the API.'));
      },
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'arogyaai-backend',
      aiConfigured: geminiConfigured(),
      // Safe diagnostics only — no credentials, just enough to confirm this
      // deployment is wired to the database/config we expect it to be.
      mongoDatabase: mongoose.connection?.db?.databaseName || null,
      mongoReadyState: mongoose.connection?.readyState ?? null, // 1 = connected
      jwtSecretConfigured: Boolean(process.env.JWT_SECRET),
      frontendUrlConfigured: process.env.FRONTEND_URL || null,
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/symptoms', symptomRoutes);
  app.use('/api/medicines', medicineRoutes);
  app.use('/api/healthcare', healthcareRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/prescriptions', prescriptionRoutes);
  app.use('/api/emergency', emergencyRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

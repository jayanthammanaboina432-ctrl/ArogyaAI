import express from 'express';
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
import { notFound, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Disable CSP here: this is a pure JSON API, not an HTML-serving app, and
  // a default CSP can interfere with API responses/tools for no benefit.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'arogyaai-backend',
      aiConfigured: geminiConfigured(),
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

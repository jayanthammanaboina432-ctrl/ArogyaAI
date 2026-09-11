import { Router } from 'express';
import { analyze } from '../controllers/symptomsController.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.post('/analyze', requireAuth, aiLimiter, analyze);

export default router;

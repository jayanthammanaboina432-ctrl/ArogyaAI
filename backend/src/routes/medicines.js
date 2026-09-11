import { Router } from 'express';
import { search } from '../controllers/medicinesController.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.get('/search', requireAuth, aiLimiter, search);

export default router;

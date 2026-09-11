import { Router } from 'express';
import { sendMessage, listSessions, getSession } from '../controllers/chatController.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.post('/', requireAuth, aiLimiter, sendMessage);
router.get('/sessions', requireAuth, listSessions);
router.get('/sessions/:id', requireAuth, getSession);

export default router;

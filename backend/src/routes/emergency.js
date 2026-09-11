import { Router } from 'express';
import { getConfig } from '../controllers/emergencyController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/config', requireAuth, getConfig);

export default router;

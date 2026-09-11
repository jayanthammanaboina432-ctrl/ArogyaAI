import { Router } from 'express';
import { search, getById } from '../controllers/healthcareController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/search', requireAuth, search);
router.get('/:id', requireAuth, getById);

export default router;

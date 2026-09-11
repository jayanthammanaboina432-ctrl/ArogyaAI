import { Router } from 'express';
import multer from 'multer';
import { analyze, uploadLimits } from '../controllers/prescriptionController.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiters.js';
import { AppError } from '../middleware/errorHandler.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: uploadLimits,
});

const router = Router();

router.post('/analyze', requireAuth, aiLimiter, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(400, 'Image is too large. Please upload a file under 5MB.'));
      }
      return next(new AppError(400, 'Could not process the uploaded file. Please try again.'));
    }
    if (err) return next(err);
    next();
  });
}, analyze);

export default router;

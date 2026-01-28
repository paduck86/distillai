import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as imageController from '../controllers/image.controller.js';

const router = Router();

// Multer config for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// POST /api/image/analyze - 이미지 분석
router.post('/analyze', authMiddleware, upload.single('image'), imageController.analyzeImage);

export default router;

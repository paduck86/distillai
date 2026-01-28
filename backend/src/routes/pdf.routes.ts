import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as pdfController from '../controllers/pdf.controller.js';

const router = Router();

// Multer config for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// POST /api/pdf/summarize - PDF 파일 요약
router.post('/summarize', authMiddleware, upload.single('file'), pdfController.summarizePdf);

export default router;

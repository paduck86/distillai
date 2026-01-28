import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as audioController from '../controllers/audio.controller.js';

const router = Router();

// Multer config for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

// POST /api/audio/transcribe - 오디오 전사
router.post('/transcribe', authMiddleware, upload.single('audio'), audioController.transcribeAudio);

// POST /api/audio/summarize - 오디오 전사 + 요약
router.post('/summarize', authMiddleware, upload.single('audio'), audioController.summarizeAudio);

export default router;

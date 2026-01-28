import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as youtubeController from '../controllers/youtube.controller.js';

const router = Router();

// POST /api/youtube/summarize - YouTube URL 요약
router.post('/summarize', authMiddleware, youtubeController.summarizeYoutube);

export default router;

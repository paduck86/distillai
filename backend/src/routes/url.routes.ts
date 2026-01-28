import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as urlController from '../controllers/url.controller.js';

const router = Router();

// POST /api/url/summarize - URL 웹페이지 요약
router.post('/summarize', authMiddleware, urlController.summarizeUrl);

export default router;

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as bookmarkController from '../controllers/bookmark.controller.js';

const router = Router();

// GET /api/bookmark/preview?url=... - URL 메타데이터 프리뷰 (북마크용)
router.get('/preview', authMiddleware, bookmarkController.getBookmarkPreview);

export default router;

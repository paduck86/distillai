import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';

// Import route handlers
import folderRoutes from './folder.routes.js';
import lectureRoutes from './lecture.routes.js';
import chatRoutes from './chat.routes.js';
import categoryRoutes from './category.routes.js';

const router = Router();

// Public routes (no auth required)
router.get('/', (req, res) => {
  res.json({
    name: 'Distillai API',
    version: '0.1.0',
    docs: '/api/docs',
  });
});

// Protected routes
router.use('/folders', authMiddleware, folderRoutes);
router.use('/lectures', authMiddleware, lectureRoutes);
router.use('/chat', authMiddleware, chatRoutes);
router.use('/categories', authMiddleware, categoryRoutes);

export { router as routes };

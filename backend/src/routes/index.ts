import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';

// Import route handlers
import folderRoutes from './folder.routes.js';
import pageRoutes from './page.routes.js';
import chatRoutes from './chat.routes.js';
import categoryRoutes from './category.routes.js';
import blockRoutes from './block.routes.js';

const router = Router();

// Public routes (no auth required)
router.get('/', (req, res) => {
  res.json({
    name: 'Distillai API',
    version: '0.1.0',
    docs: '/api/docs',
  });
});

// Health check for Railway
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes
router.use('/folders', authMiddleware, folderRoutes);
router.use('/pages', authMiddleware, pageRoutes);
router.use('/chat', authMiddleware, chatRoutes);
router.use('/categories', authMiddleware, categoryRoutes);
router.use('/blocks', blockRoutes);  // auth middleware is inside

export { router as routes };

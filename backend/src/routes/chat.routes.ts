import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.middleware.js';
import * as chatController from '../controllers/chat.controller.js';

const router = Router();

// Validation schemas
const sendMessageSchema = z.object({
  distillationId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

// Routes
router.post('/', validate(sendMessageSchema), chatController.sendMessage);
router.get('/:distillationId/history', chatController.getChatHistory);
router.delete('/:distillationId', chatController.clearChatHistory);

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.middleware.js';
import * as folderController from '../controllers/folder.controller.js';

const router = Router();

// Validation schemas
const createFolderSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  parentId: z.string().uuid().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});

const updateFolderSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  parentId: z.string().uuid().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  position: z.number().int().min(0).optional(),
});

// Routes
router.get('/', folderController.getFolders);
router.get('/:id', folderController.getFolder);
router.post('/', validate(createFolderSchema), folderController.createFolder);
router.put('/:id', validate(updateFolderSchema), folderController.updateFolder);
router.delete('/:id', folderController.deleteFolder);

export default router;

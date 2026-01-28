import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { validate, validateQuery } from '../middleware/validation.middleware.js';
import * as pageController from '../controllers/page.controller.js';

const router = Router();

// Multer config for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      // Audio
      'audio/webm',
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/m4a',
      'audio/x-m4a',
      'audio/aac',
      'audio/flac',
      // Video
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      // PDF
      'application/pdf',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

// Multer config for image uploads (5MB max)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max for images
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid image type: ${file.mimetype}`));
    }
  },
});

// Validation schemas
const sourceTypeEnum = z.enum(['youtube', 'audio', 'video', 'url', 'recording', 'pdf', 'website', 'text', 'note', 'x_thread', 'clipboard']);

const confirmCategorySchema = z.object({
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

const createPageSchema = z.object({
  title: z.string().max(200).optional(),
  parentId: z.string().uuid().optional(),
  isFolder: z.boolean().optional(),
  pageIcon: z.string().max(100).optional(),
  sourceType: sourceTypeEnum.optional(),
  description: z.string().max(2000).optional(),
  folderId: z.string().uuid().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  sourceUrl: z.string().url().optional(),
});

const movePageSchema = z.object({
  parentId: z.string().uuid().nullable(),
  position: z.number().int().min(0),
});

const updatePageSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  parentId: z.string().uuid().nullable().optional(),
  pageIcon: z.string().max(100).nullable().optional(),
  pageCover: z.string().url().nullable().optional(),
  isFolder: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
  folderId: z.string().uuid().nullable().optional(),
  summaryMd: z.string().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

const reorderPagesSchema = z.object({
  pageIds: z.array(z.string().uuid()),
  parentId: z.string().uuid().nullable().optional(),
});

const listQuerySchema = z.object({
  folderId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['pending', 'uploading', 'processing', 'crystallized', 'failed']).optional(),
  sourceType: sourceTypeEnum.optional(),
  search: z.string().max(100).optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
});

// ============================================
// Page Hierarchy Routes (must be before /:id routes)
// ============================================
router.get('/tree', pageController.getPageTree);
router.post('/reorder', validate(reorderPagesSchema), pageController.reorderPagesHandler);

// ============================================
// Trash Routes (must be before /:id routes)
// ============================================
router.get('/trash', pageController.getTrashPages);
router.delete('/trash/empty', pageController.emptyTrash);

// Routes
router.get('/', validateQuery(listQuerySchema), pageController.getLectures);
router.get('/uncategorized', pageController.getUncategorizedLectures);
router.post('/', validate(createPageSchema), pageController.createPageHandler);

// YouTube import
router.post('/youtube', pageController.createFromYoutube);

// External URL import
router.post('/url', pageController.createFromUrl);

// Text import
router.post('/text', pageController.createFromText);

// Empty note creation
router.post('/note', pageController.createNote);

// Clipboard capture
router.post('/clipboard', pageController.createFromClipboard);

// X (Twitter) import
router.post('/x', pageController.createFromX);

// File upload (creates new distillation + uploads file)
router.post('/upload', upload.single('file'), pageController.uploadFile);

// Image upload (for block editor)
router.post('/upload/image', imageUpload.single('image'), pageController.uploadImageHandler);

// /:id routes (must be last to avoid matching other routes)
router.get('/:id', pageController.getLecture);
router.put('/:id', validate(updatePageSchema), pageController.updatePageHandler);
router.delete('/:id', pageController.deleteLecture);
router.post('/:id/upload', upload.single('audio'), pageController.uploadAudio);
router.post('/:id/summarize', pageController.summarizeLecture);
router.put('/:id/confirm-category', validate(confirmCategorySchema), pageController.confirmCategory);
router.put('/:id/move', validate(movePageSchema), pageController.movePageHandler);
router.put('/:id/collapse', pageController.toggleCollapseHandler);

// Trash operations for specific page
router.put('/:id/trash', pageController.moveToTrash);
router.put('/:id/restore', pageController.restoreFromTrash);
router.delete('/:id/permanent', pageController.deletePermanently);

export default router;

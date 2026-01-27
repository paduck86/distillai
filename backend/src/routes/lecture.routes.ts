import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { validate, validateQuery } from '../middleware/validation.middleware.js';
import * as lectureController from '../controllers/lecture.controller.js';

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

// Validation schemas
const sourceTypeEnum = z.enum(['youtube', 'audio', 'video', 'url', 'recording', 'pdf', 'website', 'text', 'note', 'x_thread', 'clipboard']);

const createLectureSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  folderId: z.string().uuid().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  sourceType: sourceTypeEnum.optional(),
  sourceUrl: z.string().url().optional(),
});

const updateLectureSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  folderId: z.string().uuid().nullable().optional(),
  summaryMd: z.string().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

const confirmCategorySchema = z.object({
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
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

// Routes
router.get('/', validateQuery(listQuerySchema), lectureController.getLectures);
router.get('/uncategorized', lectureController.getUncategorizedLectures);
router.get('/:id', lectureController.getLecture);
router.post('/', validate(createLectureSchema), lectureController.createLecture);
router.put('/:id', validate(updateLectureSchema), lectureController.updateLecture);
router.delete('/:id', lectureController.deleteLecture);

// YouTube import
router.post('/youtube', lectureController.createFromYoutube);

// External URL import
router.post('/url', lectureController.createFromUrl);

// Text import
router.post('/text', lectureController.createFromText);

// Empty note creation
router.post('/note', lectureController.createNote);

// Clipboard capture
router.post('/clipboard', lectureController.createFromClipboard);

// X (Twitter) import
router.post('/x', lectureController.createFromX);

// File upload (creates new distillation + uploads file)
router.post('/upload', upload.single('file'), lectureController.uploadFile);

// Audio upload & processing (for existing distillation)
router.post('/:id/upload', upload.single('audio'), lectureController.uploadAudio);
router.post('/:id/summarize', lectureController.summarizeLecture);

// AI Category
router.put('/:id/confirm-category', validate(confirmCategorySchema), lectureController.confirmCategory);

export default router;

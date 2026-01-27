import type { Request, Response, NextFunction } from 'express';
import * as lectureService from '../services/lecture.service.js';
import * as storageService from '../services/storage.service.js';
import * as aiService from '../services/gemini.service.js';
import type { SupportedLanguage } from '../services/gemini.service.js';
import * as categoryService from '../services/category.service.js';
import * as youtubeService from '../services/youtube.service.js';
import * as pdfService from '../services/pdf.service.js';
import type { CreateLecture, UpdateLecture } from '../types/index.js';
import { ValidationError, AppError } from '../middleware/error.middleware.js';

export async function getLectures(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const folderId = req.query.folderId as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const status = req.query.status as string | undefined;
    const sourceType = req.query.sourceType as string | undefined;
    const search = req.query.search as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await lectureService.getDistillations(userId, {
      folderId,
      categoryId,
      status,
      sourceType,
      search,
      page,
      limit,
    });

    res.json({
      data: result.distillations,
      meta: {
        page,
        limit,
        total: result.total,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getLecture(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const id = req.params.id!;
    const lecture = await lectureService.getLecture(userId, id);

    // Generate signed URL for audio if audioPath exists
    let audioUrl: string | null = null;
    if (lecture.audioPath) {
      try {
        audioUrl = await storageService.getSignedUrl(lecture.audioPath);
      } catch (err) {
        console.error('Failed to generate audio URL:', err);
      }
    }

    res.json({ data: { ...lecture, audioUrl } });
  } catch (error) {
    next(error);
  }
}

export async function createLecture(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data: CreateLecture = req.body;
    const lecture = await lectureService.createLecture(userId, data);

    res.status(201).json({ data: lecture });
  } catch (error) {
    next(error);
  }
}

export async function updateLecture(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const id = req.params.id!;
    const data: UpdateLecture = req.body;
    const lecture = await lectureService.updateLecture(userId, id, data);

    res.json({ data: lecture });
  } catch (error) {
    next(error);
  }
}

export async function deleteLecture(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const id = req.params.id!;
    await lectureService.deleteLecture(userId, id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function uploadAudio(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const id = req.params.id!;

    if (!req.file) {
      throw new ValidationError('No audio file provided');
    }

    // Update status to uploading
    await lectureService.updateStatus(userId, id, 'uploading');

    // Upload to storage
    const audioPath = await storageService.uploadAudio(
      userId,
      id,
      req.file.buffer,
      req.file.mimetype
    );

    // Update lecture with audio info (including duration if provided)
    const durationSeconds = req.body.durationSeconds ? parseInt(req.body.durationSeconds, 10) : undefined;
    const lecture = await lectureService.updateAudioInfo(userId, id, {
      audioPath,
      fileSize: req.file.size,
      durationSeconds: isNaN(durationSeconds!) ? undefined : durationSeconds,
    });

    res.json({ data: lecture });
  } catch (error) {
    // Revert status on error
    try {
      await lectureService.updateStatus(req.user!.id, req.params.id!, 'failed', String(error));
    } catch {
      // Ignore
    }
    next(error);
  }
}

/**
 * POST /api/lectures/upload
 * 파일 업로드와 함께 새 Distillation 생성
 */
export async function uploadFile(req: Request, res: Response, next: NextFunction) {
  let lectureId: string | null = null;

  try {
    const userId = req.user!.id;

    if (!req.file) {
      throw new ValidationError('No file provided');
    }

    // Get title, sourceType, and categoryId from form data
    const title = (req.body.title as string) || req.file.originalname.replace(/\.[^/.]+$/, '');
    const sourceType = (req.body.sourceType as string) || 'audio';
    const categoryId = req.body.categoryId as string | undefined;

    // Validate sourceType
    const validSourceTypes = ['youtube', 'audio', 'video', 'url', 'recording', 'pdf', 'website', 'text'];
    if (!validSourceTypes.includes(sourceType)) {
      throw new ValidationError(`Invalid source type: ${sourceType}`);
    }

    // Create new distillation
    const lecture = await lectureService.createDistillation(userId, {
      title,
      sourceType: sourceType as CreateLecture['sourceType'],
      categoryId,
    });
    lectureId = lecture.id;

    // Update status to uploading
    await lectureService.updateStatus(userId, lecture.id, 'uploading');

    // Upload to storage
    const audioPath = await storageService.uploadAudio(
      userId,
      lecture.id,
      req.file.buffer,
      req.file.mimetype
    );

    // Update lecture with audio info (including duration if provided)
    const durationSeconds = req.body.durationSeconds ? parseInt(req.body.durationSeconds, 10) : undefined;
    const updatedLecture = await lectureService.updateAudioInfo(userId, lecture.id, {
      audioPath,
      fileSize: req.file.size,
      durationSeconds: isNaN(durationSeconds!) ? undefined : durationSeconds,
    });

    res.status(201).json({ data: updatedLecture });
  } catch (error) {
    // Revert status on error if lecture was created
    if (lectureId) {
      try {
        await lectureService.updateStatus(req.user!.id, lectureId, 'failed', String(error));
      } catch {
        // Ignore
      }
    }
    next(error);
  }
}

/**
 * POST /api/lectures/youtube
 * YouTube URL에서 새 Distillation 생성
 */
export async function createFromYoutube(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { url, categoryId } = req.body;

    if (!url || typeof url !== 'string') {
      throw new ValidationError('YouTube URL is required');
    }

    // YouTube URL 유효성 검사 및 비디오 ID 추출
    const videoId = extractYoutubeVideoId(url);
    if (!videoId) {
      throw new ValidationError('Invalid YouTube URL');
    }

    // YouTube oEmbed API로 제목 가져오기
    let title = 'YouTube Video';
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl);
      if (response.ok) {
        const data = await response.json() as { title?: string };
        title = data.title || title;
      }
    } catch (err) {
      console.error('Failed to fetch YouTube title:', err);
    }

    // Distillation 생성
    const lecture = await lectureService.createDistillation(userId, {
      title,
      sourceType: 'youtube',
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      categoryId,
    });

    res.status(201).json({ data: lecture });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/lectures/url
 * 외부 URL에서 새 Distillation 생성
 */
export async function createFromUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { url, categoryId } = req.body;

    if (!url || typeof url !== 'string') {
      throw new ValidationError('URL is required');
    }

    // URL 유효성 검사
    try {
      new URL(url);
    } catch {
      throw new ValidationError('Invalid URL');
    }

    // URL에서 제목 추출 시도
    let title = new URL(url).hostname;
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Distillai/1.0' },
      });
      // 일부 사이트는 HEAD 요청을 거부하므로 hostname을 기본 제목으로 사용
    } catch {
      // Ignore
    }

    // Distillation 생성
    const lecture = await lectureService.createDistillation(userId, {
      title,
      sourceType: 'url',
      sourceUrl: url,
      categoryId,
    });

    res.status(201).json({ data: lecture });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/lectures/text
 * 텍스트에서 새 Distillation 생성
 */
export async function createFromText(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { title, text, categoryId } = req.body;

    if (!text || typeof text !== 'string') {
      throw new ValidationError('Text content is required');
    }

    if (text.trim().length < 50) {
      throw new ValidationError('Text must be at least 50 characters');
    }

    // 임시 제목 (요약 시 AI가 제목 추출해서 업데이트)
    const tempTitle = title?.trim() || text.trim().slice(0, 50) + (text.length > 50 ? '...' : '');

    // Distillation 생성 (텍스트와 함께)
    const lecture = await lectureService.createDistillationWithText(userId, {
      title: tempTitle,
      sourceType: 'text',
      categoryId,
      text: text.trim(),
    });

    res.status(201).json({ data: lecture });
  } catch (error) {
    next(error);
  }
}

/**
 * YouTube URL에서 비디오 ID 추출
 */
function extractYoutubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // 비디오 ID만 입력한 경우
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export async function summarizeLecture(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const id = req.params.id!;
    const language = (req.body.language || req.query.language || 'ko') as SupportedLanguage;

    // Get lecture
    const lecture = await lectureService.getLecture(userId, id);

    // Update status to processing
    await lectureService.updateStatus(userId, id, 'processing');

    let result;

    // YouTube 영상인 경우: 자막 우선, 없으면 오디오 다운로드
    if (lecture.sourceType === 'youtube' && lecture.sourceUrl) {
      const videoId = extractYoutubeVideoId(lecture.sourceUrl);
      if (!videoId) {
        throw new ValidationError('Invalid YouTube URL');
      }

      console.log(`Processing YouTube video: ${videoId}`);

      // 1. 먼저 자막 시도
      try {
        const transcript = await youtubeService.getTranscript(videoId);
        console.log(`YouTube transcript extracted. Language: ${transcript.language}, Auto-generated: ${transcript.isAutoGenerated}`);

        // 텍스트 기반 요약 수행
        result = await aiService.summarizeFromTranscriptWithCategory(transcript.text, lecture.title, language);
      } catch (ytError) {
        const errorMessage = ytError instanceof Error ? ytError.message : String(ytError);

        // 2. 자막이 없는 경우 오디오 다운로드로 폴백
        if (errorMessage === 'NO_CAPTIONS_AVAILABLE') {
          console.log('No captions available, falling back to audio download...');

          try {
            // yt-dlp로 오디오 다운로드
            const audioResult = await youtubeService.downloadAudio(videoId);
            console.log(`Audio downloaded: ${audioResult.buffer.length} bytes`);

            // Whisper로 전사
            const transcript = await aiService.transcribeAudioBuffer(
              audioResult.buffer,
              audioResult.mimeType
            );

            // 텍스트 기반 요약 수행
            result = await aiService.summarizeFromTranscriptWithCategory(transcript, lecture.title, language);
          } catch (dlError) {
            const dlMessage = dlError instanceof Error ? dlError.message : String(dlError);

            if (dlMessage === 'YT_DLP_NOT_INSTALLED') {
              throw new AppError(
                500,
                'YT_DLP_NOT_INSTALLED',
                '서버에 yt-dlp가 설치되어 있지 않습니다. 자막이 없는 영상은 처리할 수 없습니다.'
              );
            }

            throw new AppError(
              500,
              'AUDIO_DOWNLOAD_FAILED',
              `오디오 다운로드 실패: ${dlMessage}`
            );
          }
        } else {
          throw new AppError(
            500,
            'YOUTUBE_TRANSCRIPT_FAILED',
            `YouTube 자막 추출 실패: ${errorMessage}`
          );
        }
      }
    } else if (lecture.sourceType === 'text') {
      // 텍스트인 경우: fullTranscript에서 텍스트를 가져와서 요약
      if (!lecture.fullTranscript) {
        throw new ValidationError('No text content available');
      }

      console.log(`Processing text content: ${lecture.fullTranscript.length} characters`);

      // 텍스트 기반 요약 수행
      result = await aiService.summarizeFromTranscriptWithCategory(lecture.fullTranscript, lecture.title, language);
    } else if (lecture.sourceType === 'pdf') {
      // PDF 파일인 경우: 텍스트 추출 후 요약
      if (!lecture.audioPath) {
        throw new ValidationError('No PDF file uploaded');
      }

      console.log(`Processing PDF file: ${lecture.audioPath}`);

      try {
        // PDF 파일 다운로드
        const signedUrl = await storageService.getSignedUrl(lecture.audioPath);
        const response = await fetch(signedUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch PDF file');
        }
        const pdfBuffer = Buffer.from(await response.arrayBuffer());

        // PDF에서 텍스트 추출
        const pdfText = await pdfService.extractTextFromPdf(pdfBuffer);
        console.log(`PDF text extracted: ${pdfText.length} characters`);

        // 텍스트 기반 요약 수행
        result = await aiService.summarizeFromTranscriptWithCategory(pdfText, lecture.title, language);
      } catch (pdfError) {
        const errorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
        throw new AppError(
          500,
          'PDF_PROCESSING_FAILED',
          `PDF 처리 실패: ${errorMessage}`
        );
      }
    } else {
      // 일반 오디오/비디오 파일인 경우
      if (!lecture.audioPath) {
        throw new ValidationError('No audio file uploaded');
      }

      console.log(`Processing audio/video file: ${lecture.audioPath}`);

      // Get audio URL
      const audioUrl = await storageService.getSignedUrl(lecture.audioPath);

      // Process with Gemini (요약 + AI 카테고리 추출)
      result = await aiService.summarizeWithCategoryExtraction(audioUrl, lecture.title, language);
    }

    // AI 카테고리 slug로 카테고리 ID 조회
    let aiCategoryId: string | undefined;
    if (result.aiCategory?.category) {
      const category = await categoryService.getCategoryBySlug(userId, result.aiCategory.category);
      aiCategoryId = category?.id;
    }

    // Update lecture with results (AI 카테고리 정보 포함, 추천 제목도 포함)
    const updatedLecture = await lectureService.updateSummaryWithCategory(userId, id, {
      summaryMd: result.summary,
      fullTranscript: result.transcript,
      aiCategoryId,
      aiSuggestedTags: result.aiCategory?.suggestedTags,
      aiConfidence: result.aiCategory?.confidence,
      aiReasoning: result.aiCategory?.reasoning,
      title: result.suggestedTitle,  // AI가 추출한 제목 (텍스트 입력 시)
    });

    res.json({ data: updatedLecture });
  } catch (error) {
    // Update status on error
    try {
      await lectureService.updateStatus(req.user!.id, req.params.id!, 'failed', String(error));
    } catch {
      // Ignore
    }
    next(error);
  }
}

/**
 * PUT /api/lectures/:id/confirm-category
 * AI 추천 카테고리 확인/수정
 */
export async function confirmCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const id = req.params.id!;
    const { categoryId, tags } = req.body;

    const updatedLecture = await lectureService.confirmCategory(userId, id, {
      categoryId,
      tags,
    });

    res.json({ data: updatedLecture });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/lectures/uncategorized
 * 미분류 Distillation 목록
 */
export async function getUncategorizedLectures(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await lectureService.getUncategorizedDistillations(userId, {
      page,
      limit,
    });

    res.json({
      data: result.distillations,
      meta: {
        page,
        limit,
        total: result.total,
      },
    });
  } catch (error) {
    next(error);
  }
}

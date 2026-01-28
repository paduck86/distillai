import type { Request, Response, NextFunction } from 'express';
import * as pdfService from '../services/pdf.service.js';
import * as geminiService from '../services/gemini.service.js';
import type { SupportedLanguage } from '../services/gemini.service.js';
import { ValidationError } from '../middleware/error.middleware.js';

/**
 * POST /api/pdf/summarize
 * PDF 파일에서 텍스트 추출 후 요약
 */
export async function summarizePdf(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new ValidationError('No PDF file provided');
    }

    const language = (req.body.language || 'korean') as string;
    const lang: SupportedLanguage = language.includes('en') ? 'en' : 'ko';

    console.log(`Summarizing PDF: ${req.file.originalname}, size: ${req.file.size} bytes, language: ${lang}`);

    // 1. PDF에서 텍스트 추출
    const text = await pdfService.extractTextFromPdf(req.file.buffer);

    if (!text || text.trim().length < 100) {
      throw new ValidationError('PDF에서 충분한 텍스트를 추출할 수 없습니다. 스캔된 이미지 PDF일 수 있습니다.');
    }

    // 2. 메타데이터 추출 (제목용)
    const metadata = await pdfService.getPdfMetadata(req.file.buffer);
    const title = metadata.title || req.file.originalname || 'PDF Document';

    // 3. 요약 생성
    const result = await geminiService.summarizeFromTranscript(
      text,
      title,
      lang
    );

    res.json({
      data: {
        summary: result.summary,
        title: result.suggestedTitle || title,
        pages: metadata.pages,
        textLength: text.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

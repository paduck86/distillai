import type { Request, Response, NextFunction } from 'express';
import * as aiService from '../services/gemini.service.js';
import type { SupportedLanguage } from '../services/gemini.service.js';
import { ValidationError } from '../middleware/error.middleware.js';

/**
 * POST /api/audio/transcribe
 * 오디오 파일을 텍스트로 전사
 */
export async function transcribeAudio(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new ValidationError('No audio file provided');
    }

    const mimeType = req.file.mimetype || 'audio/webm';
    console.log(`Transcribing audio: ${req.file.size} bytes, ${mimeType}`);

    const transcript = await aiService.transcribeAudioBuffer(
      req.file.buffer,
      mimeType
    );

    res.json({
      data: { transcript },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/audio/summarize
 * 오디오 파일을 전사 후 요약
 */
export async function summarizeAudio(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new ValidationError('No audio file provided');
    }

    const language = (req.body.language || 'korean') as string;
    const lang: SupportedLanguage = language.includes('en') ? 'en' : 'ko';
    const mimeType = req.file.mimetype || 'audio/webm';

    console.log(`Summarizing audio: ${req.file.size} bytes, ${mimeType}, language: ${lang}`);

    // 1. 먼저 전사
    const transcript = await aiService.transcribeAudioBuffer(
      req.file.buffer,
      mimeType
    );

    // 2. 전사 결과로 요약 생성
    const result = await aiService.summarizeFromTranscript(
      transcript,
      '녹음',  // 임시 제목
      lang
    );

    res.json({
      data: {
        summary: result.summary,
        transcript: result.transcript,
      },
    });
  } catch (error) {
    next(error);
  }
}

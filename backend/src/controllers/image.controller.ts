import type { Request, Response, NextFunction } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { ValidationError, AppError } from '../middleware/error.middleware.js';

const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;

/**
 * POST /api/image/analyze
 * 이미지 분석
 */
export async function analyzeImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new ValidationError('No image file provided');
    }

    if (!genAI) {
      throw new AppError(500, 'GEMINI_NOT_CONFIGURED', 'Gemini API is not configured');
    }

    const prompt = req.body.prompt || '이 이미지를 분석하고 내용을 상세히 설명해주세요.';

    console.log(`Analyzing image: ${req.file.originalname}, size: ${req.file.size} bytes`);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // 이미지를 base64로 인코딩
    const base64Image = req.file.buffer.toString('base64');

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: base64Image,
        },
      },
      { text: prompt },
    ]);

    const analysis = result.response.text();

    res.json({
      data: {
        analysis,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
}

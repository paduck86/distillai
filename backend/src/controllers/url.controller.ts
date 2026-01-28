import type { Request, Response, NextFunction } from 'express';
import * as geminiService from '../services/gemini.service.js';
import type { SupportedLanguage } from '../services/gemini.service.js';
import { ValidationError } from '../middleware/error.middleware.js';

/**
 * HTML에서 텍스트 추출 (간단한 구현)
 */
function extractTextFromHtml(html: string): string {
  // script, style 태그 제거
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

  // HTML 태그 제거
  text = text.replace(/<[^>]+>/g, ' ');

  // HTML 엔티티 디코딩
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // 공백 정리
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * HTML에서 제목 추출
 */
function extractTitleFromHtml(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch?.[1]) {
    return titleMatch[1].trim();
  }

  // og:title 시도
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitleMatch?.[1]) {
    return ogTitleMatch[1].trim();
  }

  return null;
}

/**
 * POST /api/url/summarize
 * URL 웹페이지 요약
 */
export async function summarizeUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { url, language = 'korean' } = req.body;

    if (!url) {
      throw new ValidationError('URL is required');
    }

    // URL 유효성 검사
    try {
      new URL(url);
    } catch {
      throw new ValidationError('Invalid URL format');
    }

    const lang: SupportedLanguage = language.includes('en') ? 'en' : 'ko';

    console.log(`Summarizing URL: ${url}, language: ${lang}`);

    // 1. 웹페이지 가져오기
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new ValidationError(`웹페이지를 가져올 수 없습니다: ${response.status}`);
    }

    const html = await response.text();

    // 2. 텍스트와 제목 추출
    const text = extractTextFromHtml(html);
    const pageTitle = extractTitleFromHtml(html) || url;

    if (!text || text.length < 100) {
      throw new ValidationError('웹페이지에서 충분한 텍스트를 추출할 수 없습니다.');
    }

    // 텍스트가 너무 길면 잘라냄 (50,000자 제한)
    const truncatedText = text.length > 50000 ? text.slice(0, 50000) + '...' : text;

    // 3. 요약 생성
    const result = await geminiService.summarizeFromTranscript(
      truncatedText,
      pageTitle,
      lang
    );

    res.json({
      data: {
        summary: result.summary,
        title: result.suggestedTitle || pageTitle,
        url,
        textLength: text.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

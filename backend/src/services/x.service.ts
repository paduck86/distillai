/**
 * X (Twitter) Content Scraping Service
 *
 * X API 없이 공개 트윗/스레드의 콘텐츠를 가져오는 서비스
 * nitter 인스턴스 또는 직접 스크래핑 방식 사용
 */

import { AppError } from '../middleware/error.middleware.js';

export interface XTweetContent {
  tweetId: string;
  authorHandle: string;
  authorName: string;
  content: string;
  mediaUrls: string[];
  timestamp: string;
  isThread: boolean;
  threadTexts: string[];  // 스레드인 경우 각 트윗의 텍스트
}

/**
 * X URL에서 트윗 ID 추출
 */
export function extractTweetId(url: string): string | null {
  const patterns = [
    /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/i,
    /(?:twitter\.com|x\.com)\/i\/status\/(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * X URL에서 사용자 핸들 추출
 */
export function extractHandle(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/(\w+)(?:\/|$)/i);
  return match?.[1] ?? null;
}

/**
 * FxTwitter API를 사용하여 트윗 정보 가져오기
 * (공개 트윗만 가능)
 */
export async function fetchTweetFromFxTwitter(tweetId: string): Promise<XTweetContent> {
  // FxTwitter는 트위터 콘텐츠를 JSON으로 제공하는 서비스
  const apiUrl = `https://api.fxtwitter.com/status/${tweetId}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Distillai/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new AppError(404, 'TWEET_NOT_FOUND', '트윗을 찾을 수 없습니다. 삭제되었거나 비공개일 수 있습니다.');
      }
      throw new AppError(500, 'X_FETCH_FAILED', `X 콘텐츠 가져오기 실패: HTTP ${response.status}`);
    }

    const data = await response.json() as {
      tweet?: {
        id: string;
        text: string;
        author: {
          screen_name: string;
          name: string;
        };
        created_at: string;
        media?: {
          photos?: Array<{ url: string }>;
          videos?: Array<{ url: string }>;
        };
        replies?: Array<{
          text: string;
          author: { screen_name: string };
        }>;
      };
    };

    if (!data.tweet) {
      throw new AppError(404, 'TWEET_NOT_FOUND', '트윗을 찾을 수 없습니다.');
    }

    const tweet = data.tweet;
    const mediaUrls: string[] = [];

    // 사진 URL 추출
    if (tweet.media?.photos) {
      for (const photo of tweet.media.photos) {
        mediaUrls.push(photo.url);
      }
    }

    // 비디오 URL 추출
    if (tweet.media?.videos) {
      for (const video of tweet.media.videos) {
        mediaUrls.push(video.url);
      }
    }

    // 스레드 텍스트 (답글 형태로 있을 수 있음)
    const threadTexts: string[] = [tweet.text];
    const isThread = false;  // FxTwitter API는 스레드 전체를 가져오기 어려움

    return {
      tweetId: tweet.id,
      authorHandle: tweet.author.screen_name,
      authorName: tweet.author.name,
      content: tweet.text,
      mediaUrls,
      timestamp: tweet.created_at,
      isThread,
      threadTexts,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'X_FETCH_FAILED', `X 콘텐츠 가져오기 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Nitter 인스턴스를 통해 트윗 스크래핑
 * (백업 방식)
 */
export async function fetchTweetFromNitter(tweetId: string, handle: string): Promise<XTweetContent> {
  const nitterInstances = [
    'https://nitter.privacydev.net',
    'https://nitter.poast.org',
    'https://nitter.cz',
  ];

  for (const instance of nitterInstances) {
    try {
      const url = `${instance}/${handle}/status/${tweetId}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
      });

      if (!response.ok) continue;

      const html = await response.text();

      // HTML에서 콘텐츠 추출 (간단한 정규식 사용)
      const contentMatch = html.match(/<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      const nameMatch = html.match(/<a class="fullname"[^>]*>([^<]+)<\/a>/);
      const timeMatch = html.match(/<span class="tweet-date"[^>]*><a[^>]*title="([^"]+)"/);

      if (contentMatch?.[1]) {
        // HTML 태그 제거
        const content = contentMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();

        return {
          tweetId,
          authorHandle: handle,
          authorName: nameMatch?.[1] || handle,
          content,
          mediaUrls: [],  // Nitter에서 미디어 추출은 복잡
          timestamp: timeMatch?.[1] || new Date().toISOString(),
          isThread: false,
          threadTexts: [content],
        };
      }
    } catch {
      // 다음 인스턴스 시도
      continue;
    }
  }

  throw new AppError(500, 'NITTER_FETCH_FAILED', '모든 Nitter 인스턴스에서 가져오기 실패');
}

/**
 * X URL에서 콘텐츠 가져오기 (통합 함수)
 */
export async function fetchXContent(url: string): Promise<XTweetContent> {
  const tweetId = extractTweetId(url);
  const handle = extractHandle(url);

  if (!tweetId) {
    throw new AppError(400, 'INVALID_X_URL', '유효하지 않은 X URL입니다.');
  }

  // 1. 먼저 FxTwitter API 시도
  try {
    return await fetchTweetFromFxTwitter(tweetId);
  } catch (fxError) {
    console.warn('FxTwitter failed, trying Nitter:', fxError);

    // 2. FxTwitter 실패 시 Nitter로 폴백
    if (handle) {
      try {
        return await fetchTweetFromNitter(tweetId, handle);
      } catch (nitterError) {
        console.error('Nitter also failed:', nitterError);
      }
    }

    // 모든 방법 실패
    throw fxError;
  }
}

/**
 * X 콘텐츠를 읽기 좋은 텍스트로 포맷
 */
export function formatXContentForSummary(content: XTweetContent): string {
  let formatted = '';

  // 작성자 정보
  formatted += `Author: @${content.authorHandle} (${content.authorName})\n`;
  formatted += `Posted: ${content.timestamp}\n\n`;

  // 콘텐츠
  if (content.isThread && content.threadTexts.length > 1) {
    formatted += '=== Thread ===\n\n';
    content.threadTexts.forEach((text, index) => {
      formatted += `[${index + 1}/${content.threadTexts.length}]\n${text}\n\n`;
    });
  } else {
    formatted += content.content;
  }

  return formatted;
}

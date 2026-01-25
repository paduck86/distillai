import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';
import type { ChatMessage, SummarizeResult, ChatCompletionResult, CategoryExtractionResult } from '../types/index.js';

const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;

const SUMMARIZE_MODEL = 'gemini-1.5-flash';
const CHAT_MODEL = 'gemini-1.5-flash';

// 시스템 카테고리 slug 목록
const SYSTEM_CATEGORIES = ['lecture', 'meeting', 'podcast', 'interview', 'tech', 'other'] as const;

export async function summarizeLecture(
  audioUrl: string,
  title: string
): Promise<SummarizeResult> {
  if (!genAI) {
    throw new AppError(500, 'GEMINI_NOT_CONFIGURED', 'Gemini API is not configured');
  }
  try {
    const model = genAI.getGenerativeModel({ model: SUMMARIZE_MODEL });

    // Fetch audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch audio file');
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    // Determine mime type from URL or default to webm
    const mimeType = getMimeTypeFromUrl(audioUrl);

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Audio,
        },
      },
      {
        text: `당신은 전문 속기사이자 강의 요약 전문가입니다.

이 강의 "${title}"를 듣고 다음 두 가지를 제공해주세요:

## 1. TRANSCRIPT (전체 전사)
강의 내용을 있는 그대로 전사해주세요. 자연스러운 한국어로 작성하되, 말하는 사람의 의도를 최대한 살려주세요.

## 2. SUMMARY (구조화된 요약)
다음 형식으로 상세하게 요약해주세요:

### 개요
- 강의의 핵심 주제와 목표를 2-3문장으로 요약

### 목차
[타임스탬프] 섹션 제목의 형식으로 주요 섹션 나열

### 상세 내용
각 섹션별로:

#### [타임스탬프] 섹션 제목
- **핵심 개념**: 주요 개념 설명
- **세부 내용**:
  - 세부 포인트 1
  - 세부 포인트 2
- **예시/사례**: 언급된 예시나 사례
- **중요 인용**: "중요한 발언 그대로 인용"

### 핵심 정리
- 가장 중요한 takeaway 3-5개 bullet points

### 추가 학습 키워드
- 더 깊이 공부하면 좋을 관련 키워드

---

응답 형식:
TRANSCRIPT:
[전사 내용]

SUMMARY:
[구조화된 요약]

강의가 한국어면 한국어로, 영어면 영어로 응답해주세요.
타임스탬프는 [HH:MM:SS] 형식으로 표기해주세요.`,
      },
    ]);

    const text = result.response.text();

    // Parse response
    const transcriptMatch = text.match(/TRANSCRIPT:([\s\S]*?)(?=SUMMARY:|$)/i);
    const summaryMatch = text.match(/SUMMARY:([\s\S]*?)$/i);

    return {
      transcript: transcriptMatch?.[1]?.trim() ?? '',
      summary: summaryMatch?.[1]?.trim() ?? text,
    };
  } catch (error) {
    console.error('Gemini summarization error:', error);
    throw new AppError(
      500,
      'AI_PROCESSING_FAILED',
      `AI 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

interface ChatInput {
  lectureTitle: string;
  lectureSummary: string;
  lectureTranscript: string;
  chatHistory: ChatMessage[];
  userMessage: string;
}

export async function chat(input: ChatInput): Promise<ChatCompletionResult> {
  if (!genAI) {
    throw new AppError(500, 'GEMINI_NOT_CONFIGURED', 'Gemini API is not configured');
  }
  try {
    const model = genAI.getGenerativeModel({ model: CHAT_MODEL });

    // Build context
    const systemContext = `당신은 강의 학습 도우미 AI입니다.

현재 강의 정보:
- 제목: ${input.lectureTitle}

강의 요약:
${input.lectureSummary || '(요약 없음)'}

강의 전사 (일부):
${input.lectureTranscript?.substring(0, 10000) || '(전사 없음)'}

---

당신의 역할:
1. 강의 내용에 대한 질문에 답변
2. 특정 부분에 대한 자세한 설명 제공
3. 강의 내용을 표나 목록으로 재정리
4. 관련 개념 설명
5. 퀴즈나 복습 질문 생성

항상 친절하고 도움이 되게 답변하세요.
강의 내용에 없는 질문은 솔직하게 "강의에서 다루지 않은 내용입니다"라고 말해주세요.`;

    // Build chat history
    const history = input.chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemContext }] },
        { role: 'model', parts: [{ text: '네, 강의 학습 도우미로서 도와드리겠습니다. 강의 내용에 대해 궁금한 점이 있으시면 편하게 질문해주세요!' }] },
        ...history,
      ],
    });

    const result = await chat.sendMessage(input.userMessage);
    const response = result.response;

    return {
      content: response.text(),
      tokensUsed: response.usageMetadata?.totalTokenCount ?? 0,
      model: CHAT_MODEL,
    };
  } catch (error) {
    console.error('Gemini chat error:', error);
    throw new AppError(
      500,
      'AI_CHAT_FAILED',
      `AI 대화 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function getMimeTypeFromUrl(url: string): string {
  const extension = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  const extToMime: Record<string, string> = {
    webm: 'audio/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/m4a',
  };
  return extToMime[extension ?? ''] ?? 'audio/webm';
}

/**
 * AI 콘텐츠 분석으로 카테고리와 태그 추출
 */
export async function extractCategoryAndTags(
  title: string,
  summary: string,
  transcript?: string
): Promise<CategoryExtractionResult> {
  if (!genAI) {
    return {
      category: 'other',
      confidence: 0,
      suggestedTags: [],
      reasoning: 'Gemini API is not configured',
    };
  }
  try {
    const model = genAI.getGenerativeModel({ model: SUMMARIZE_MODEL });

    // transcript가 너무 길면 앞부분만 사용
    const transcriptSnippet = transcript?.substring(0, 3000) ?? '';

    const prompt = `당신은 오디오 콘텐츠 분류 전문가입니다.

다음 콘텐츠를 분석하고 가장 적합한 카테고리와 태그를 추천해주세요.

---
제목: ${title}

요약:
${summary.substring(0, 2000)}

내용 일부:
${transcriptSnippet}
---

## 카테고리 옵션 (반드시 이 중에서 선택):
- lecture: 강의, 교육 콘텐츠, 온라인 강좌, 수업, 세미나
- meeting: 회의, 미팅, 업무 논의, 팀 회의, 스탠드업
- podcast: 팟캐스트, 라디오, 토크쇼, 대담 프로그램
- interview: 인터뷰, 면접, 대담, 질의응답
- tech: 기술, 개발, IT, 프로그래밍, 소프트웨어
- other: 위 카테고리에 명확히 해당하지 않는 경우

## 응답 규칙:
1. category는 반드시 위 6개 중 하나의 slug만 사용
2. confidence는 0.0~1.0 사이 소수 (확신이 높을수록 1에 가깝게)
3. suggestedTags는 콘텐츠의 핵심 키워드 5개 (한국어로)
4. reasoning은 왜 이 카테고리로 분류했는지 1-2문장으로 설명

## 응답 형식 (JSON만, 다른 텍스트 없이):
{
  "category": "slug",
  "confidence": 0.85,
  "suggestedTags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
  "reasoning": "이 콘텐츠가 해당 카테고리로 분류된 이유"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // JSON 파싱 (마크다운 코드블록 제거)
    const jsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(jsonStr) as CategoryExtractionResult;

    // 유효성 검증
    if (!SYSTEM_CATEGORIES.includes(parsed.category as typeof SYSTEM_CATEGORIES[number])) {
      parsed.category = 'other';
    }
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0.5));
    parsed.suggestedTags = (parsed.suggestedTags ?? []).slice(0, 5);
    parsed.reasoning = parsed.reasoning ?? '';

    return parsed;
  } catch (error) {
    console.error('Category extraction error:', error);
    // 실패 시 기본값 반환 (에러를 throw하지 않음)
    return {
      category: 'other',
      confidence: 0,
      suggestedTags: [],
      reasoning: 'AI 분류 실패',
    };
  }
}

/**
 * 요약과 카테고리 추출을 함께 수행
 */
export async function summarizeWithCategoryExtraction(
  audioUrl: string,
  title: string
): Promise<SummarizeResult> {
  // 먼저 기존 요약 수행
  const result = await summarizeLecture(audioUrl, title);

  // 요약 결과로 카테고리 추출
  const aiCategory = await extractCategoryAndTags(
    title,
    result.summary,
    result.transcript
  );

  return {
    ...result,
    aiCategory,
  };
}

import OpenAI from 'openai';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';
import type { ChatMessage, SummarizeResult, ChatCompletionResult, CategoryExtractionResult } from '../types/index.js';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const CHAT_MODEL = 'gpt-4o-mini';
const WHISPER_MODEL = 'whisper-1';

// 시스템 카테고리 slug 목록
const SYSTEM_CATEGORIES = ['lecture', 'meeting', 'podcast', 'interview', 'tech', 'other'] as const;

/**
 * 오디오 버퍼를 Whisper로 전사합니다.
 */
export async function transcribeAudioBuffer(
  buffer: Buffer,
  mimeType: string = 'audio/mpeg'
): Promise<string> {
  const extension = mimeType === 'audio/mpeg' ? 'mp3' : 'webm';
  const audioBlob = new Blob([buffer], { type: mimeType });
  const audioFile = new File([audioBlob], `audio.${extension}`, { type: mimeType });

  console.log('Transcribing audio buffer with Whisper...');
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: WHISPER_MODEL,
    language: 'ko',
    response_format: 'text',
  });

  const transcript = transcription as string;
  console.log('Transcription complete. Length:', transcript.length);
  return transcript;
}

export async function summarizeLecture(
  audioUrl: string,
  title: string
): Promise<SummarizeResult> {
  try {
    // 1. Fetch audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch audio file');
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });

    // Create a File object for Whisper
    const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

    // 2. Transcribe with Whisper
    console.log('Transcribing audio with Whisper...');
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: WHISPER_MODEL,
      language: 'ko', // Korean
      response_format: 'text',
    });

    const transcript = transcription as string;
    console.log('Transcription complete. Length:', transcript.length);

    // 3. Summarize with GPT-4
    console.log('Generating summary with GPT-4...');
    const summaryResponse = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content: `당신은 전문 강의 요약 전문가입니다.
주어진 강의 전사본을 분석하여 구조화된 상세 요약을 제공해주세요.

다음 형식으로 요약해주세요:

### 개요
- 강의의 핵심 주제와 목표를 2-3문장으로 요약

### 목차
[타임스탬프] 섹션 제목의 형식으로 주요 섹션 나열 (타임스탬프는 대략적으로 추정)

### 상세 내용
각 섹션별로:

#### 섹션 제목
- **핵심 개념**: 주요 개념 설명
- **세부 내용**:
  - 세부 포인트 1
  - 세부 포인트 2
- **예시/사례**: 언급된 예시나 사례
- **중요 인용**: "중요한 발언 그대로 인용"

### 핵심 정리
- 가장 중요한 takeaway 3-5개 bullet points

### 추가 학습 키워드
- 더 깊이 공부하면 좋을 관련 키워드`
        },
        {
          role: 'user',
          content: `강의 제목: "${title}"

강의 전사본:
${transcript}

위 강의를 분석하고 구조화된 요약을 작성해주세요.`
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const summary = summaryResponse.choices[0]?.message?.content ?? '';
    console.log('Summary complete. Length:', summary.length);

    return {
      transcript,
      summary,
    };
  } catch (error) {
    console.error('OpenAI summarization error:', error);
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
  try {
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

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContext },
      ...input.chatHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: input.userMessage },
    ];

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    return {
      content: response.choices[0]?.message?.content ?? '',
      tokensUsed: response.usage?.total_tokens ?? 0,
      model: CHAT_MODEL,
    };
  } catch (error) {
    console.error('OpenAI chat error:', error);
    throw new AppError(
      500,
      'AI_CHAT_FAILED',
      `AI 대화 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * AI 콘텐츠 분석으로 카테고리와 태그 추출
 */
export async function extractCategoryAndTags(
  title: string,
  summary: string,
  transcript?: string
): Promise<CategoryExtractionResult> {
  try {
    const transcriptSnippet = transcript?.substring(0, 3000) ?? '';

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content: `당신은 오디오 콘텐츠 분류 전문가입니다.
콘텐츠를 분석하고 가장 적합한 카테고리와 태그를 추천합니다.

카테고리 옵션 (반드시 이 중에서 선택):
- lecture: 강의, 교육 콘텐츠, 온라인 강좌, 수업, 세미나
- meeting: 회의, 미팅, 업무 논의, 팀 회의, 스탠드업
- podcast: 팟캐스트, 라디오, 토크쇼, 대담 프로그램
- interview: 인터뷰, 면접, 대담, 질의응답
- tech: 기술, 개발, IT, 프로그래밍, 소프트웨어
- other: 위 카테고리에 명확히 해당하지 않는 경우

JSON 형식으로만 응답하세요.`
        },
        {
          role: 'user',
          content: `제목: ${title}

요약:
${summary.substring(0, 2000)}

내용 일부:
${transcriptSnippet}

다음 JSON 형식으로 응답해주세요:
{
  "category": "slug",
  "confidence": 0.85,
  "suggestedTags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
  "reasoning": "이 콘텐츠가 해당 카테고리로 분류된 이유"
}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const responseText = response.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(responseText) as CategoryExtractionResult;

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
  const result = await summarizeLecture(audioUrl, title);

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

/**
 * 텍스트 트랜스크립트에서 요약 생성 (YouTube 자막용)
 */
export async function summarizeFromTranscript(
  transcript: string,
  title: string
): Promise<SummarizeResult> {
  try {
    console.log('Generating summary from transcript with GPT-4...');
    const summaryResponse = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content: `당신은 전문 강의 요약 전문가입니다.
주어진 강의 전사본을 분석하여 구조화된 상세 요약을 제공해주세요.

다음 형식으로 요약해주세요:

### 개요
- 강의의 핵심 주제와 목표를 2-3문장으로 요약

### 목차
[타임스탬프] 섹션 제목의 형식으로 주요 섹션 나열 (타임스탬프는 대략적으로 추정)

### 상세 내용
각 섹션별로:

#### 섹션 제목
- **핵심 개념**: 주요 개념 설명
- **세부 내용**:
  - 세부 포인트 1
  - 세부 포인트 2
- **예시/사례**: 언급된 예시나 사례
- **중요 인용**: "중요한 발언 그대로 인용"

### 핵심 정리
- 가장 중요한 takeaway 3-5개 bullet points

### 추가 학습 키워드
- 더 깊이 공부하면 좋을 관련 키워드`
        },
        {
          role: 'user',
          content: `강의 제목: "${title}"

강의 전사본:
${transcript}

위 강의를 분석하고 구조화된 요약을 작성해주세요.`
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const summary = summaryResponse.choices[0]?.message?.content ?? '';
    console.log('Summary complete. Length:', summary.length);

    return {
      transcript,
      summary,
    };
  } catch (error) {
    console.error('OpenAI summarization error:', error);
    throw new AppError(
      500,
      'AI_PROCESSING_FAILED',
      `AI 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 텍스트 트랜스크립트에서 요약과 카테고리 추출을 함께 수행 (YouTube용)
 */
export async function summarizeFromTranscriptWithCategory(
  transcript: string,
  title: string
): Promise<SummarizeResult> {
  const result = await summarizeFromTranscript(transcript, title);

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

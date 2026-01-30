import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';
import type { ChatMessage, SummarizeResult, ChatCompletionResult, CategoryExtractionResult } from '../types/index.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;
const fileManager = env.GEMINI_API_KEY ? new GoogleAIFileManager(env.GEMINI_API_KEY) : null;

const SUMMARIZE_MODEL = 'gemini-3-flash-preview';  // 요약용 (멀티모달 지원)
const CHAT_MODEL = 'gemini-3-flash-preview';       // 채팅용 (빠름)

// 20MB 이상이면 File API 사용 (inlineData 제한)
const INLINE_DATA_LIMIT = 20 * 1024 * 1024;

// 시스템 카테고리 slug 목록
const SYSTEM_CATEGORIES = ['lecture', 'meeting', 'podcast', 'interview', 'tech', 'other'] as const;

/**
 * File API를 사용한 대용량 오디오 업로드 (3시간+ 강의 지원)
 */
async function uploadLargeAudioFile(
  audioBuffer: ArrayBuffer,
  mimeType: string
): Promise<{ uri: string; name: string }> {
  if (!fileManager) {
    throw new AppError(500, 'GEMINI_NOT_CONFIGURED', 'Gemini File Manager is not configured');
  }

  const tempDir = os.tmpdir();
  const tempId = crypto.randomBytes(8).toString('hex');
  const extension = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp3') ? 'mp3' : 'wav';
  const tempPath = path.join(tempDir, `audio_${tempId}.${extension}`);

  try {
    // 임시 파일에 저장
    await fs.writeFile(tempPath, Buffer.from(audioBuffer));

    // File API로 업로드
    const uploadResult = await fileManager.uploadFile(tempPath, {
      mimeType,
      displayName: `audio_${tempId}`,
    });


    // 파일 처리 완료 대기 (ACTIVE 상태가 될 때까지)
    let file = uploadResult.file;
    while (file.state === 'PROCESSING') {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 대기
      file = await fileManager.getFile(file.name);
    }

    if (file.state === 'FAILED') {
      throw new Error('File processing failed');
    }

    return { uri: file.uri, name: file.name };
  } finally {
    // 임시 파일 정리
    await fs.unlink(tempPath).catch(() => { });
  }
}

/**
 * 업로드된 파일 삭제 (정리용)
 */
async function deleteUploadedFile(fileName: string): Promise<void> {
  if (!fileManager) return;
  try {
    await fileManager.deleteFile(fileName);
  } catch (error) {
    console.warn(`Failed to delete file ${fileName}:`, error);
  }
}

export type SupportedLanguage = 'ko' | 'en';

export async function summarizeLecture(
  audioUrl: string,
  title: string,
  language: SupportedLanguage = 'ko'
): Promise<SummarizeResult> {
  if (!genAI) {
    throw new AppError(500, 'GEMINI_NOT_CONFIGURED', 'Gemini API is not configured');
  }

  let uploadedFileName: string | null = null;

  try {
    const model = genAI.getGenerativeModel({ model: SUMMARIZE_MODEL });

    // Fetch audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch audio file');
    }

    const audioBuffer = await response.arrayBuffer();
    const mimeType = getMimeTypeFromUrl(audioUrl);
    const fileSizeMB = audioBuffer.byteLength / 1024 / 1024;


    const langInstruction = language === 'ko'
      ? '모든 응답을 한국어로 작성해주세요.'
      : 'Write all responses in English.';

    const prompt = language === 'ko'
      ? `당신은 Lilys AI 스타일의 강의 요약 전문가입니다.

이 강의 "${title}"를 듣고 다음을 제공해주세요:

## 1. TRANSCRIPT (전체 전사)
강의 내용을 있는 그대로 전사해주세요. 강의 원본 언어 그대로 전사하되, 자연스럽게 작성해주세요.

## 2. SUMMARY (Lilys 스타일 상세 요약)
${langInstruction}

### 작성 원칙
1. **가치 중심 인트로**: 독자가 "왜 이걸 들어야 하는지" 알 수 있게 작성
2. **충분한 깊이**: 각 섹션 최소 10줄 이상, 피상적 설명 금지
3. **구체적 예시**: 코드, 명령어, 설정 값 등 실제 활용 가능한 정보 포함
4. **대화체 톤**: 친근하게 설명해주는 느낌 (예: "자바처럼 new를 사용할 필요가 없다", "토큰 비용이 너무 많이 발생하여 결국...")
5. **소주제(1.1, 1.2) 필수**: 모든 대주제(1, 2, 3) 아래에 **반드시 최소 2개의 소주제(1.1, 1.2)**를 포함. 소주제 없이 대주제만 나열하면 요약 실패.
6. **타임스탬프 제거**: [00:00:00] 형태 사용하지 않음, 깔끔한 번호 체계만 사용
7. **원본 충실성**: 강의에서 언급된 구체적 예시, 비유, 화자의 개인적 의견, 실무 경험담을 그대로 살려서 작성

### 상세화 규칙 (매우 중요!!!)
- **각 불릿 포인트는 3-5줄로 상세히 설명**하세요. 1-2줄 짧은 설명은 금지입니다.
- **강의에서 언급된 실제 이름을 그대로 사용**하세요 (클래스명, 메서드명, 설정값 등)
- **"왜" 이렇게 하는지 이유와 배경을 설명**하세요.
- **실무 팁, 주의사항, 노하우**를 반드시 포함하세요.

### 나쁜 예시 vs 좋은 예시
❌ 나쁜 예: "레파지토리 패턴을 사용하여 데이터 액세스 로직을 캡슐화합니다."
✅ 좋은 예: "레파지토리 레이어는 데이터베이스에서 데이터를 읽고(Read) 쓰고(Write) 하는 기능만 담당하는 레이어이다. IRepositories라는 부모 인터페이스를 미리 만들어 두었으며, 이는 가장 기본적인 CRUD (Get, Add, Change, Delete, Soft Delete) 인터페이스만 정의한다. 특별한 경우가 아니면 이 기본적인 CRUD 기능을 바로 사용한다."

❌ 나쁜 예: "DI 컨테이너에 서비스를 등록합니다."
✅ 좋은 예: "DI 컨테이너 등록은 Helper 폴더 내 DependencyInjection 클래스에서 수행한다. AddScope를 사용하여 등록하면 스코프가 생성될 때 인스턴스를 생성하고, 스코프가 끝날 때 제거하여 메모리를 절약한다. IOfferingService를 인터페이스로, OfferingService를 구현체로 페어 등록하면 DI 시스템 사용 준비가 완료된다."

❌ 나쁜 예: "컨트롤러에서 서비스를 호출합니다."
✅ 좋은 예: "컨트롤러 생성자에 IOfferingService를 주입받기만 하면, DI 컨테이너가 자동으로 OfferingService 인스턴스를 생성하고 주입해준다. 자바처럼 new 키워드를 사용할 필요가 없다. 주입받은 서비스 객체로 OfferingService.AdminGetByID() 등의 비즈니스 로직을 호출한다."

### 절대 규칙 (위반 시 요약 실패로 간주)
1. **1-2줄 불릿은 절대 금지**. 모든 불릿 포인트는 반드시 3줄 이상으로 작성.
2. **추상적 설명 금지**. "레파지토리 패턴", "서비스 레이어" 같은 추상적 표현 대신 "IOfferingRepository", "OfferingService.AdminGetByID()" 등 실제 이름 사용.
3. **이유 설명 필수**. 모든 설명에 "왜냐하면", "~하기 위함이다", "~때문에" 등 이유 포함.
4. **소주제 필수**. 모든 대주제(1, 2, 3...) 아래에 최소 2개의 소주제(1.1, 1.2, 2.1, 2.2...)를 반드시 작성.
5. **원본 내용 충실 반영**. 강의자가 언급한 구체적인 비유, 예시, 개인 경험, 팁을 요약에 그대로 포함.

### 대화체 톤 예시 (이런 느낌으로 작성)
- "자바처럼 new를 사용할 필요가 없다"
- "토큰 비용이 너무 많이 발생하여 결국 다른 방법을 찾았다"
- "처음에는 이게 뭔 소리인가 싶었는데, 직접 해보니 이해가 됐다"
- "이걸 안 하면 나중에 디버깅하다 머리 터진다"

### 금지사항
- 요약 끝에 "이 요약은...", "이상으로...", "Lilys AI 스타일의..." 같은 메타 코멘트 추가 금지
- 요약 본문만 작성하고 바로 끝낼 것

### 완전한 출력 예시 (반드시 이 형식을 따르세요)

## 전체 요약
닷넷(C#) 환경에서 데이터베이스 모델링부터 API 엔드포인트 구축까지의 전 과정을 다룹니다. 레파지토리 패턴으로 데이터 접근을 분리하고, 서비스 레이어에서 비즈니스 로직을 처리하며, DI 시스템으로 의존성을 관리하는 방법을 배웁니다.

## 목차
- 1. 레파지토리 레이어 구축
  - 1.1 DI 컨테이너 등록
  - 1.2 레파지토리 사용 패턴
- 2. 서비스 레이어 구축
  - 2.1 서비스 인터페이스 정의
  - 2.2 서비스 구현 클래스

---

1. 레파지토리 레이어 구축
레파지토리 레이어는 데이터베이스와의 직접적인 상호작용을 담당하는 계층이다. 비즈니스 로직과 데이터 접근 로직을 분리하여 코드의 유지보수성을 높이기 위함이다.

- **IRepositories 부모 인터페이스 정의**: 프로젝트에서는 IRepositories라는 부모 인터페이스를 미리 만들어 두었으며, 이 인터페이스는 가장 기본적인 CRUD 작업인 Get, Add, Change, Delete, Soft Delete 메서드만 정의한다. 새로운 테이블이 추가되더라도 이 기본 인터페이스를 상속받으면 별도의 구현 없이 CRUD 기능을 바로 사용할 수 있기 때문에 개발 시간을 크게 단축할 수 있다.

- **IOfferingRepository 생성**: 데이터베이스 테이블 이름을 따라 OfferingRepository 폴더를 만들고, 그 안에 IOfferingRepository 인터페이스를 생성한다. 이 인터페이스는 IRepositories<Offering>을 상속받아 오퍼링 테이블에 특화된 레파지토리가 된다. 기본 CRUD 외에 GetWithMembers() 같은 특화 메서드가 필요한 경우에만 추가로 정의하면 된다.

- **OfferingRepository 구현 클래스**: OfferingRepository 클래스를 만들고 부모 클래스인 Repository를 상속받으며, 동시에 IOfferingRepository 인터페이스도 구현한다. 가장 기본적인 생성자만 자동으로 구현하면 레파지토리 구축이 완료된다. 이 OfferingRepository를 통해 Get, GetAll, Add, Edit 등의 메서드를 모두 사용할 수 있게 되어 오퍼링 테이블의 데이터 읽기/쓰기가 가능해진다.

1.1 DI 컨테이너 등록
- **AddScope 등록 방식**: DI 컨테이너 등록은 Helper 폴더 내 DependencyInjection 클래스에서 수행한다. AddScope를 사용하여 등록하면 스코프(HTTP 요청)가 생성될 때 인스턴스를 생성하고, 스코프가 끝날 때 인스턴스를 제거하여 메모리를 절약한다. IOfferingRepository를 인터페이스로, OfferingRepository를 구현체로 페어 등록하면 DI 시스템 사용 준비가 완료된다.

1.2 레파지토리 사용 패턴
- **생성자 주입**: 서비스 클래스에서 레파지토리를 사용하려면 생성자에 IOfferingRepository를 선언하기만 하면 된다. 자바처럼 new 키워드로 직접 인스턴스를 생성할 필요가 없다. DI 컨테이너가 알아서 적절한 구현체(OfferingRepository)를 주입해주기 때문이다. 이렇게 하면 테스트할 때 Mock 객체를 쉽게 주입할 수 있어 단위 테스트가 편해진다.

2. 서비스 레이어 구축
서비스 레이어는 비즈니스 로직을 담당하는 계층이다. 컨트롤러가 직접 레파지토리를 호출하지 않고 서비스를 통해 호출하도록 설계한다.

2.1 서비스 인터페이스 정의
- **IOfferingService 생성**: Services 폴더에 IOfferingService 인터페이스를 만든다. GetOfferingsWithMembers(), CreateOffering(), DeleteOffering() 등 비즈니스 작업 단위의 메서드를 정의한다. 레파지토리의 CRUD와 달리 서비스 메서드는 "회원과 함께 오퍼링 조회"처럼 비즈니스 의미를 담은 이름을 사용한다.

2.2 서비스 구현 클래스
- **OfferingService 구현**: OfferingService 클래스를 만들고 IOfferingService를 구현한다. 생성자에서 IOfferingRepository를 주입받아 필드에 저장한다. GetOfferingsWithMembers() 메서드에서는 _repository.GetAll().Include(x => x.Members)처럼 레파지토리 메서드를 조합하여 비즈니스 로직을 구현한다. 여러 레파지토리를 조합하거나 트랜잭션 처리가 필요한 복잡한 로직은 모두 서비스에서 담당한다.

(위 형식과 동일하게 강의 전체 내용을 상세하게 작성하세요. 모든 대주제 아래에 반드시 소주제(1.1, 1.2, 2.1, 2.2...)를 포함하고, 각 불릿은 3줄 이상이어야 합니다.)

---

응답 형식:
TRANSCRIPT:
[전사 내용 - 원본 언어 그대로]

SUMMARY:
[한국어 요약 - 위 규칙을 철저히 준수]

타임스탬프([00:00:00] 형태)는 사용하지 마세요. 번호(1, 1.1, 2...)만 사용하세요.`
      : `You are a Lilys AI-style lecture summary expert.

Listen to this lecture "${title}" and provide the following:

## 1. TRANSCRIPT (Full Transcription)
Transcribe the lecture content as-is in its original language.

## 2. SUMMARY (Lilys-style Detailed Summary)
${langInstruction}

### Writing Principles
1. **Value-focused intro**: Help readers understand "why they should listen to this"
2. **Sufficient depth**: At least 10 lines per section, no superficial explanations
3. **Concrete examples**: Include code, commands, settings that can be used in practice
4. **Conversational tone**: Friendly explanation style (e.g., "unlike Java, you don't need to use new", "the token cost was too high so eventually...")
5. **Subtopics (1.1, 1.2) MANDATORY**: Every main topic (1, 2, 3) MUST have **at least 2 subtopics (1.1, 1.2)**. Summary without subtopics = FAILURE.
6. **No timestamps**: Don't use [00:00:00] format, use clean numbering only
7. **Faithfulness to original**: Preserve specific examples, metaphors, speaker's personal opinions, and real-world anecdotes from the lecture exactly as mentioned

### Detail Rules (VERY IMPORTANT!!!)
- **Each bullet point must be 3-5 lines of detailed explanation**. Short 1-2 line explanations are NOT allowed.
- **Use actual names mentioned in the lecture** (class names, method names, settings, etc.)
- **Explain "why"** - include reasons and background for each concept.
- **Include practical tips, caveats, and real-world advice**.

### Bad Example vs Good Example
❌ Bad: "Use the repository pattern to encapsulate data access logic."
✅ Good: "The repository layer is responsible only for reading and writing data from the database. We create a parent interface called IRepositories that defines the most basic CRUD operations (Get, Add, Change, Delete, Soft Delete). Unless there's a special case, you use these basic CRUD functions directly. This separation ensures that business logic doesn't directly interact with database operations."

❌ Bad: "Register services in the DI container."
✅ Good: "DI container registration is done in the DependencyInjection class within the Helper folder. Using AddScope creates an instance when a scope starts and removes it when the scope ends, saving memory. Register IOfferingService as the interface and OfferingService as the implementation as a pair, and the DI system is ready to use."

❌ Bad: "Call the service from the controller."
✅ Good: "Simply inject IOfferingService into the controller's constructor, and the DI container automatically creates and injects an OfferingService instance. No need to use the new keyword like in Java. Call business logic methods like OfferingService.AdminGetByID() using the injected service object."

### Absolute Rules (Violation = Summary Failure)
1. **1-2 line bullets are strictly forbidden**. Every bullet point must be at least 3 lines.
2. **No abstract descriptions**. Instead of "repository pattern" or "service layer", use actual names like "IOfferingRepository", "OfferingService.AdminGetByID()".
3. **Reasons are mandatory**. Include "because", "in order to", "this is why" in every explanation.
4. **Subtopics mandatory**. Every main topic (1, 2, 3...) MUST have at least 2 subtopics (1.1, 1.2, 2.1, 2.2...).
5. **Faithfulness to original**. Include specific metaphors, examples, personal experiences, and tips mentioned by the lecturer.

### Conversational Tone Examples (Write in this style)
- "Unlike Java, you don't need to use new"
- "The token cost was too high so eventually we had to find another way"
- "At first I had no idea what this meant, but after trying it myself, it clicked"
- "If you don't do this, you'll tear your hair out debugging later"

### Prohibited
- Do NOT add meta-comments at the end like "This summary covers...", "In conclusion...", "Lilys AI style..."
- Just write the summary content and end immediately

### Complete Output Example (You MUST follow this format)

## Summary
This covers the complete process from database modeling to building API endpoints in a .NET (C#) environment. Learn how to separate data access using the repository pattern, handle business logic in the service layer, and manage dependencies with the DI system.

## Table of Contents
- 1. Building the Repository Layer
  - 1.1 DI Container Registration
  - 1.2 Repository Usage Pattern
- 2. Building the Service Layer
  - 2.1 Defining Service Interface
  - 2.2 Service Implementation Class

---

1. Building the Repository Layer
The repository layer is responsible for direct interaction with the database. This separation is designed to increase code maintainability by isolating business logic from data access logic.

- **Defining the IRepositories Parent Interface**: The project has a pre-built parent interface called IRepositories that defines only the most basic CRUD operations: Get, Add, Change, Delete, and Soft Delete methods. When a new table is added, simply inheriting from this base interface allows you to use CRUD functionality immediately without separate implementation, significantly reducing development time.

- **Creating IOfferingRepository**: Create an OfferingRepository folder following the database table name, and inside it, create the IOfferingRepository interface. This interface inherits from IRepositories<Offering> to become a repository specialized for the Offering table. Only define additional specialized methods like GetWithMembers() when needed beyond basic CRUD.

- **OfferingRepository Implementation Class**: Create the OfferingRepository class, inherit from the parent Repository class, and also implement the IOfferingRepository interface. Once you auto-generate just the basic constructor, the repository setup is complete. Through this OfferingRepository, you can use all methods like Get, GetAll, Add, Edit, enabling reading and writing of data from the Offering table.

1.1 DI Container Registration
- **AddScope Registration Method**: DI container registration is performed in the DependencyInjection class within the Helper folder. Using AddScope creates an instance when a scope (HTTP request) is created and removes it when the scope ends, saving memory. Registering IOfferingRepository as the interface and OfferingRepository as the implementation completes the DI system setup.

1.2 Repository Usage Pattern
- **Constructor Injection**: To use the repository in a service class, simply declare IOfferingRepository in the constructor. Unlike Java, you don't need to use the new keyword to create instances directly. The DI container automatically injects the appropriate implementation (OfferingRepository). This makes unit testing easier because you can easily inject mock objects when testing.

2. Building the Service Layer
The service layer handles business logic. Controllers don't call repositories directly - they go through services instead.

2.1 Defining Service Interface
- **Creating IOfferingService**: Create the IOfferingService interface in the Services folder. Define methods for business operations like GetOfferingsWithMembers(), CreateOffering(), DeleteOffering(). Unlike repository CRUD, service methods use business-meaningful names like "get offerings with members."

2.2 Service Implementation Class
- **Implementing OfferingService**: Create the OfferingService class and implement IOfferingService. Inject IOfferingRepository through the constructor and store it in a field. In GetOfferingsWithMembers(), combine repository methods like _repository.GetAll().Include(x => x.Members) to implement business logic. Complex logic involving multiple repositories or transactions is all handled in the service.

(Continue writing the entire lecture content in detail following this format. Every main topic MUST have subtopics (1.1, 1.2, 2.1, 2.2...) and each bullet MUST be at least 3 lines.)

---

Response format:
TRANSCRIPT:
[Transcription - in original language]

SUMMARY:
[English summary - strictly follow the rules above]

Do not use timestamps ([00:00:00] format). Use numbers only (1, 1.1, 2...).`;

    let result;

    // 파일 크기에 따라 처리 방식 선택
    if (audioBuffer.byteLength > INLINE_DATA_LIMIT) {
      // 대용량: File API 사용 (3시간+ 강의 지원)
      const uploadedFile = await uploadLargeAudioFile(audioBuffer, mimeType);
      uploadedFileName = uploadedFile.name;

      result = await model.generateContent([
        {
          fileData: {
            mimeType,
            fileUri: uploadedFile.uri,
          },
        },
        { text: prompt },
      ]);
    } else {
      // 소용량: inlineData 사용 (빠름)
      const base64Audio = Buffer.from(audioBuffer).toString('base64');

      result = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: base64Audio,
          },
        },
        { text: prompt },
      ]);
    }

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
  } finally {
    // 업로드된 파일 정리
    if (uploadedFileName) {
      await deleteUploadedFile(uploadedFileName);
    }
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
 * 텍스트에서 제목 추출
 */
export async function extractTitleFromText(text: string): Promise<string> {
  if (!genAI) {
    // AI가 없으면 첫 50자로 대체
    return text.trim().slice(0, 50) + (text.length > 50 ? '...' : '');
  }

  try {
    const model = genAI.getGenerativeModel({ model: CHAT_MODEL });

    const prompt = `다음 텍스트의 핵심 주제를 파악하여 간결하고 명확한 제목을 생성해주세요.

규칙:
- 제목은 30자 이내로 작성
- 핵심 키워드를 포함
- "~에 대하여", "~란 무엇인가" 같은 불필요한 표현 제외
- 제목만 출력 (따옴표, 설명 없이)

텍스트:
${text.slice(0, 3000)}

제목:`;

    const result = await model.generateContent(prompt);
    const title = result.response.text().trim();

    // 제목이 너무 길면 자르기
    if (title.length > 50) {
      return title.slice(0, 47) + '...';
    }

    return title || text.trim().slice(0, 50) + (text.length > 50 ? '...' : '');
  } catch (error) {
    console.error('Title extraction failed:', error);
    // 실패 시 첫 50자로 대체
    return text.trim().slice(0, 50) + (text.length > 50 ? '...' : '');
  }
}

/**
 * 요약과 카테고리 추출을 함께 수행
 */
export async function summarizeWithCategoryExtraction(
  audioUrl: string,
  title: string,
  language: SupportedLanguage = 'ko'
): Promise<SummarizeResult> {
  // 먼저 기존 요약 수행
  const result = await summarizeLecture(audioUrl, title, language);

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

/**
 * 오디오 버퍼를 직접 전사 (YouTube 오디오 다운로드용)
 * Gemini는 오디오를 직접 처리할 수 있으므로 전사만 반환
 */
export async function transcribeAudioBuffer(
  buffer: Uint8Array,
  mimeType: string = 'audio/mpeg'
): Promise<string> {
  if (!genAI) {
    throw new AppError(500, 'GEMINI_NOT_CONFIGURED', 'Gemini API is not configured');
  }

  let uploadedFileName: string | null = null;

  try {
    const model = genAI.getGenerativeModel({ model: SUMMARIZE_MODEL });
    // Uint8Array를 ArrayBuffer로 변환
    const audioBuffer = Buffer.from(buffer).buffer as ArrayBuffer;


    const prompt = `이 오디오를 듣고 내용을 있는 그대로 전사해주세요.
자연스러운 한국어로 작성하되, 말하는 사람의 의도를 최대한 살려주세요.
오디오가 영어면 영어로, 한국어면 한국어로 전사해주세요.
전사 결과만 반환하고, 다른 설명은 추가하지 마세요.`;

    let result;

    if (buffer.length > INLINE_DATA_LIMIT) {
      // 대용량: File API 사용
      const uploadedFile = await uploadLargeAudioFile(audioBuffer, mimeType);
      uploadedFileName = uploadedFile.name;

      result = await model.generateContent([
        {
          fileData: {
            mimeType,
            fileUri: uploadedFile.uri,
          },
        },
        { text: prompt },
      ]);
    } else {
      // 소용량: inlineData 사용
      const base64Audio = Buffer.from(audioBuffer).toString('base64');

      result = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: base64Audio,
          },
        },
        { text: prompt },
      ]);
    }

    const transcript = result.response.text().trim();
    return transcript;
  } catch (error) {
    console.error('Gemini transcription error:', error);
    throw new AppError(
      500,
      'AI_TRANSCRIPTION_FAILED',
      `AI 전사 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    if (uploadedFileName) {
      await deleteUploadedFile(uploadedFileName);
    }
  }
}

/**
 * 텍스트 트랜스크립트에서 요약 생성 (YouTube 자막용)
 */
export async function summarizeFromTranscript(
  transcript: string,
  title: string,
  language: SupportedLanguage = 'ko'
): Promise<SummarizeResult> {
  if (!genAI) {
    throw new AppError(500, 'GEMINI_NOT_CONFIGURED', 'Gemini API is not configured');
  }

  try {
    const model = genAI.getGenerativeModel({ model: SUMMARIZE_MODEL });


    // 임시 제목인지 확인 (끝이 ...로 끝나면 임시 제목)
    const needsTitleExtraction = title.endsWith('...');
    const titlePromptKo = needsTitleExtraction
      ? `\n**중요: 먼저 이 텍스트의 핵심 주제를 파악하여 30자 이내의 간결한 제목을 생성하세요.**
응답 첫 줄에 다음 형식으로 작성: SUGGESTED_TITLE: [제목]
(예: SUGGESTED_TITLE: 닷넷 레파지토리 패턴 구축)

그 다음 줄부터 요약을 작성하세요.\n`
      : '';
    const titlePromptEn = needsTitleExtraction
      ? `\n**IMPORTANT: First, identify the core topic and generate a concise title (under 30 characters).**
Write on the first line in this format: SUGGESTED_TITLE: [title]
(e.g., SUGGESTED_TITLE: Building .NET Repository Pattern)

Then write the summary starting from the next line.\n`
      : '';

    const prompt = language === 'ko'
      ? `당신은 Lilys AI 스타일의 강의 요약 전문가입니다.

강의 제목: "${title}"

강의 전사본:
${transcript}

---
${titlePromptKo}
위 강의를 분석하여 Lilys 스타일의 상세 요약을 **한국어**로 작성해주세요.

### 작성 원칙
1. **가치 중심 인트로**: 독자가 "왜 이걸 들어야 하는지" 알 수 있게 작성
2. **충분한 깊이**: 각 섹션 최소 10줄 이상, 피상적 설명 금지
3. **구체적 예시**: 코드, 명령어, 설정 값 등 실제 활용 가능한 정보 포함
4. **대화체 톤**: 친근하게 설명해주는 느낌 (예: "자바처럼 new를 사용할 필요가 없다", "토큰 비용이 너무 많이 발생하여 결국...")
5. **소주제(1.1, 1.2) 필수**: 모든 대주제(1, 2, 3) 아래에 **반드시 최소 2개의 소주제(1.1, 1.2)**를 포함. 소주제 없이 대주제만 나열하면 요약 실패.
6. **타임스탬프 제거**: [00:00:00] 형태 사용하지 않음, 깔끔한 번호 체계만 사용
7. **원본 충실성**: 강의에서 언급된 구체적 예시, 비유, 화자의 개인적 의견, 실무 경험담을 그대로 살려서 작성

### 상세화 규칙 (매우 중요!!!)
- **각 불릿 포인트는 3-5줄로 상세히 설명**하세요. 1-2줄 짧은 설명은 금지입니다.
- **강의에서 언급된 실제 이름을 그대로 사용**하세요:
  - 클래스명: IOfferingRepository, OfferingService, DbContext 등
  - 메서드명: AddScope, GetAll, Include, FirstOrDefault 등
  - 설정값: "Members", Response<T>, IEnumerable<T> 등
- **"왜" 이렇게 하는지 이유와 배경을 설명**하세요.
- **실무 팁, 주의사항, 노하우**를 반드시 포함하세요.

### 나쁜 예시 vs 좋은 예시
❌ 나쁜 예: "레파지토리 패턴을 사용하여 데이터 액세스 로직을 캡슐화합니다."
✅ 좋은 예: "레파지토리 레이어는 데이터베이스에서 데이터를 읽고(Read) 쓰고(Write) 하는 기능만 담당하는 레이어이다. IRepositories라는 부모 인터페이스를 미리 만들어 두었으며, 이는 가장 기본적인 CRUD (Get, Add, Change, Delete, Soft Delete) 인터페이스만 정의한다. 특별한 경우가 아니면 이 기본적인 CRUD 기능을 바로 사용한다. 예를 들어 IOfferingRepository 인터페이스는 IRepositories<Offering>을 상속받아 기본 CRUD 외에 GetWithMembers() 같은 특화 메서드만 추가로 정의한다."

❌ 나쁜 예: "서비스 레이어에서 비즈니스 로직을 처리합니다."
✅ 좋은 예: "서비스 레이어는 비즈니스 로직을 담당하며, 컨트롤러에서 직접 레파지토리를 호출하지 않고 서비스를 통해 호출하도록 설계한다. 예를 들어 OfferingService는 IOfferingRepository를 생성자 주입받아 GetOfferingsWithMembers() 메서드를 구현한다. 이렇게 하면 컨트롤러는 HTTP 요청/응답 처리에만 집중하고, 복잡한 비즈니스 로직은 서비스에서 테스트 가능한 형태로 분리된다."

❌ 나쁜 예: "DI 컨테이너에 서비스를 등록합니다."
✅ 좋은 예: "DI 컨테이너 등록은 Helper 폴더 내 DependencyInjection 클래스에서 수행한다. AddScope를 사용하여 등록하면 스코프가 생성될 때 인스턴스를 생성하고, 스코프가 끝날 때 제거하여 메모리를 절약한다. IOfferingService를 인터페이스로, OfferingService를 구현체로 페어 등록하면 DI 시스템 사용 준비가 완료된다."

### 절대 규칙 (위반 시 요약 실패로 간주)
1. **1-2줄 불릿은 절대 금지**. 모든 불릿 포인트는 반드시 3줄 이상으로 작성.
2. **추상적 설명 금지**. "레파지토리 패턴", "서비스 레이어" 같은 추상적 표현 대신 "IOfferingRepository", "OfferingService.AdminGetByID()" 등 실제 이름 사용.
3. **이유 설명 필수**. 모든 설명에 "왜냐하면", "~하기 위함이다", "~때문에" 등 이유 포함.
4. **소주제 필수**. 모든 대주제(1, 2, 3...) 아래에 최소 2개의 소주제(1.1, 1.2, 2.1, 2.2...)를 반드시 작성.
5. **원본 내용 충실 반영**. 강의자가 언급한 구체적인 비유, 예시, 개인 경험, 팁을 요약에 그대로 포함.

### 대화체 톤 예시 (이런 느낌으로 작성)
- "자바처럼 new를 사용할 필요가 없다"
- "토큰 비용이 너무 많이 발생하여 결국 다른 방법을 찾았다"
- "처음에는 이게 뭔 소리인가 싶었는데, 직접 해보니 이해가 됐다"
- "이걸 안 하면 나중에 디버깅하다 머리 터진다"

### 금지사항
- 요약 끝에 "이 요약은...", "이상으로...", "Lilys AI 스타일의..." 같은 메타 코멘트 추가 금지
- 요약 본문만 작성하고 바로 끝낼 것

### 완전한 출력 예시 (반드시 이 형식을 따르세요)

## 전체 요약
닷넷(C#) 환경에서 데이터베이스 모델링부터 API 엔드포인트 구축까지의 전 과정을 다룹니다. 레파지토리 패턴으로 데이터 접근을 분리하고, 서비스 레이어에서 비즈니스 로직을 처리하며, DI 시스템으로 의존성을 관리하는 방법을 배웁니다.

## 목차
- 1. 레파지토리 레이어 구축
  - 1.1 DI 컨테이너 등록
  - 1.2 레파지토리 사용 패턴
- 2. 서비스 레이어 구축
  - 2.1 서비스 인터페이스 정의
  - 2.2 서비스 구현 클래스

---

1. 레파지토리 레이어 구축
레파지토리 레이어는 데이터베이스와의 직접적인 상호작용을 담당하는 계층이다. 비즈니스 로직과 데이터 접근 로직을 분리하여 코드의 유지보수성을 높이기 위함이다.

- **IRepositories 부모 인터페이스 정의**: 프로젝트에서는 IRepositories라는 부모 인터페이스를 미리 만들어 두었으며, 이 인터페이스는 가장 기본적인 CRUD 작업인 Get, Add, Change, Delete, Soft Delete 메서드만 정의한다. 새로운 테이블이 추가되더라도 이 기본 인터페이스를 상속받으면 별도의 구현 없이 CRUD 기능을 바로 사용할 수 있기 때문에 개발 시간을 크게 단축할 수 있다.

- **IOfferingRepository 생성**: 데이터베이스 테이블 이름을 따라 OfferingRepository 폴더를 만들고, 그 안에 IOfferingRepository 인터페이스를 생성한다. 이 인터페이스는 IRepositories<Offering>을 상속받아 오퍼링 테이블에 특화된 레파지토리가 된다. 기본 CRUD 외에 GetWithMembers() 같은 특화 메서드가 필요한 경우에만 추가로 정의하면 된다.

- **OfferingRepository 구현 클래스**: OfferingRepository 클래스를 만들고 부모 클래스인 Repository를 상속받으며, 동시에 IOfferingRepository 인터페이스도 구현한다. 가장 기본적인 생성자만 자동으로 구현하면 레파지토리 구축이 완료된다. 이 OfferingRepository를 통해 Get, GetAll, Add, Edit 등의 메서드를 모두 사용할 수 있게 되어 오퍼링 테이블의 데이터 읽기/쓰기가 가능해진다.

1.1 DI 컨테이너 등록
- **AddScope 등록 방식**: DI 컨테이너 등록은 Helper 폴더 내 DependencyInjection 클래스에서 수행한다. AddScope를 사용하여 등록하면 스코프(HTTP 요청)가 생성될 때 인스턴스를 생성하고, 스코프가 끝날 때 인스턴스를 제거하여 메모리를 절약한다. IOfferingRepository를 인터페이스로, OfferingRepository를 구현체로 페어 등록하면 DI 시스템 사용 준비가 완료된다.

1.2 레파지토리 사용 패턴
- **생성자 주입**: 서비스 클래스에서 레파지토리를 사용하려면 생성자에 IOfferingRepository를 선언하기만 하면 된다. 자바처럼 new 키워드로 직접 인스턴스를 생성할 필요가 없다. DI 컨테이너가 알아서 적절한 구현체(OfferingRepository)를 주입해주기 때문이다. 이렇게 하면 테스트할 때 Mock 객체를 쉽게 주입할 수 있어 단위 테스트가 편해진다.

2. 서비스 레이어 구축
서비스 레이어는 비즈니스 로직을 담당하는 계층이다. 컨트롤러가 직접 레파지토리를 호출하지 않고 서비스를 통해 호출하도록 설계한다.

2.1 서비스 인터페이스 정의
- **IOfferingService 생성**: Services 폴더에 IOfferingService 인터페이스를 만든다. GetOfferingsWithMembers(), CreateOffering(), DeleteOffering() 등 비즈니스 작업 단위의 메서드를 정의한다. 레파지토리의 CRUD와 달리 서비스 메서드는 "회원과 함께 오퍼링 조회"처럼 비즈니스 의미를 담은 이름을 사용한다.

2.2 서비스 구현 클래스
- **OfferingService 구현**: OfferingService 클래스를 만들고 IOfferingService를 구현한다. 생성자에서 IOfferingRepository를 주입받아 필드에 저장한다. GetOfferingsWithMembers() 메서드에서는 _repository.GetAll().Include(x => x.Members)처럼 레파지토리 메서드를 조합하여 비즈니스 로직을 구현한다. 여러 레파지토리를 조합하거나 트랜잭션 처리가 필요한 복잡한 로직은 모두 서비스에서 담당한다.

(위 형식과 동일하게 강의 전체 내용을 상세하게 작성하세요. 모든 대주제 아래에 반드시 소주제(1.1, 1.2, 2.1, 2.2...)를 포함하고, 각 불릿은 3줄 이상이어야 합니다.)

---

타임스탬프([00:00:00] 형태)는 사용하지 마세요. 번호(1, 1.1, 2...)만 사용하세요.
반드시 한국어로 요약해주세요.`
      : `You are a Lilys AI-style lecture summary expert.

Lecture title: "${title}"

Lecture transcript:
${transcript}

---
${titlePromptEn}
Analyze this lecture and write a detailed Lilys-style summary in **English**.

### Writing Principles
1. **Value-focused intro**: Help readers understand "why they should listen to this"
2. **Sufficient depth**: At least 10 lines per section, no superficial explanations
3. **Concrete examples**: Include code, commands, settings that can be used in practice
4. **Conversational tone**: Friendly explanation style (e.g., "unlike Java, you don't need to use new", "the token cost was too high so eventually...")
5. **Subtopics (1.1, 1.2) MANDATORY**: Every main topic (1, 2, 3) MUST have **at least 2 subtopics (1.1, 1.2)**. Summary without subtopics = FAILURE.
6. **No timestamps**: Don't use [00:00:00] format, use clean numbering only
7. **Faithfulness to original**: Preserve specific examples, metaphors, speaker's personal opinions, and real-world anecdotes from the lecture exactly as mentioned

### Detail Rules (VERY IMPORTANT!!!)
- **Each bullet point must be 3-5 lines of detailed explanation**. Short 1-2 line descriptions are NOT allowed.
- **Use the actual names mentioned in the lecture**:
  - Class names: IOfferingRepository, OfferingService, DbContext, etc.
  - Method names: AddScope, GetAll, Include, FirstOrDefault, etc.
  - Settings/types: "Members", Response<T>, IEnumerable<T>, etc.
- **Explain "why" - provide reasoning and background** for each concept.
- **Include practical tips, caveats, and best practices**.

### Bad vs Good Examples
❌ Bad: "The repository pattern encapsulates data access logic."
✅ Good: "The repository layer is dedicated solely to reading and writing data from the database. There's a parent interface called IRepositories that defines only the most basic CRUD operations (Get, Add, Change, Delete, Soft Delete). Unless there's a special case, you use these basic CRUD methods directly. For instance, the IOfferingRepository interface inherits from IRepositories<Offering> and only adds specialized methods like GetWithMembers() on top of the inherited CRUD operations."

❌ Bad: "Business logic is handled in the service layer."
✅ Good: "The service layer handles business logic, and controllers don't call repositories directly - they go through services instead. For example, OfferingService receives IOfferingRepository through constructor injection and implements the GetOfferingsWithMembers() method. This design allows controllers to focus solely on HTTP request/response handling while complex business logic is separated into testable services."

❌ Bad: "Register services in the DI container."
✅ Good: "DI container registration is done in the DependencyInjection class within the Helper folder. Using AddScope creates an instance when a scope starts and removes it when the scope ends, saving memory. Register IOfferingService as the interface and OfferingService as the implementation as a pair, and the DI system is ready to use."

### Absolute Rules (Violation = Summary Failure)
1. **1-2 line bullets are strictly forbidden**. Every bullet point must be at least 3 lines.
2. **No abstract descriptions**. Instead of "repository pattern" or "service layer", use actual names like "IOfferingRepository", "OfferingService.AdminGetByID()".
3. **Reasons are mandatory**. Include "because", "in order to", "this is why" in every explanation.
4. **Subtopics mandatory**. Every main topic (1, 2, 3...) MUST have at least 2 subtopics (1.1, 1.2, 2.1, 2.2...).
5. **Faithfulness to original**. Include specific metaphors, examples, personal experiences, and tips mentioned by the lecturer.

### Conversational Tone Examples (Write in this style)
- "Unlike Java, you don't need to use new"
- "The token cost was too high so eventually we had to find another way"
- "At first I had no idea what this meant, but after trying it myself, it clicked"
- "If you don't do this, you'll tear your hair out debugging later"

### Prohibited
- Do NOT add meta-comments at the end like "This summary covers...", "In conclusion...", "Lilys AI style..."
- Just write the summary content and end immediately

### Complete Output Example (You MUST follow this format)

## Summary
This covers the complete process from database modeling to building API endpoints in a .NET (C#) environment. Learn how to separate data access using the repository pattern, handle business logic in the service layer, and manage dependencies with the DI system.

## Table of Contents
- 1. Building the Repository Layer
  - 1.1 DI Container Registration
  - 1.2 Repository Usage Pattern
- 2. Building the Service Layer
  - 2.1 Defining Service Interface
  - 2.2 Service Implementation Class

---

1. Building the Repository Layer
The repository layer is responsible for direct interaction with the database. This separation is designed to increase code maintainability by isolating business logic from data access logic.

- **Defining the IRepositories Parent Interface**: The project has a pre-built parent interface called IRepositories that defines only the most basic CRUD operations: Get, Add, Change, Delete, and Soft Delete methods. When a new table is added, simply inheriting from this base interface allows you to use CRUD functionality immediately without separate implementation, significantly reducing development time.

- **Creating IOfferingRepository**: Create an OfferingRepository folder following the database table name, and inside it, create the IOfferingRepository interface. This interface inherits from IRepositories<Offering> to become a repository specialized for the Offering table. Only define additional specialized methods like GetWithMembers() when needed beyond basic CRUD.

- **OfferingRepository Implementation Class**: Create the OfferingRepository class, inherit from the parent Repository class, and also implement the IOfferingRepository interface. Once you auto-generate just the basic constructor, the repository setup is complete. Through this OfferingRepository, you can use all methods like Get, GetAll, Add, Edit, enabling reading and writing of data from the Offering table.

1.1 DI Container Registration
- **AddScope Registration Method**: DI container registration is performed in the DependencyInjection class within the Helper folder. Using AddScope creates an instance when a scope (HTTP request) is created and removes it when the scope ends, saving memory. Registering IOfferingRepository as the interface and OfferingRepository as the implementation completes the DI system setup.

1.2 Repository Usage Pattern
- **Constructor Injection**: To use the repository in a service class, simply declare IOfferingRepository in the constructor. Unlike Java, you don't need to use the new keyword to create instances directly. The DI container automatically injects the appropriate implementation (OfferingRepository). This makes unit testing easier because you can easily inject mock objects when testing.

2. Building the Service Layer
The service layer handles business logic. Controllers don't call repositories directly - they go through services instead.

2.1 Defining Service Interface
- **Creating IOfferingService**: Create the IOfferingService interface in the Services folder. Define methods for business operations like GetOfferingsWithMembers(), CreateOffering(), DeleteOffering(). Unlike repository CRUD, service methods use business-meaningful names like "get offerings with members."

2.2 Service Implementation Class
- **Implementing OfferingService**: Create the OfferingService class and implement IOfferingService. Inject IOfferingRepository through the constructor and store it in a field. In GetOfferingsWithMembers(), combine repository methods like _repository.GetAll().Include(x => x.Members) to implement business logic. Complex logic involving multiple repositories or transactions is all handled in the service.

(Continue writing the entire lecture content in detail following this format. Every main topic MUST have subtopics (1.1, 1.2, 2.1, 2.2...) and each bullet MUST be at least 3 lines.)

---

Do not use timestamps ([00:00:00] format). Use numbers only (1, 1.1, 2...).
Write the summary in English.`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();

    // SUGGESTED_TITLE 파싱 (제목 추출이 필요한 경우)
    let suggestedTitle: string | undefined;
    if (needsTitleExtraction) {
      const titleMatch = responseText.match(/^SUGGESTED_TITLE:\s*(.+)$/m);
      if (titleMatch?.[1]) {
        suggestedTitle = titleMatch[1].trim();
        // 제목 라인 제거
        responseText = responseText.replace(/^SUGGESTED_TITLE:\s*.+\n*/m, '').trim();
      }
    }

    // 요약 상단에 제목 추가 (추출된 경우)
    const summary = suggestedTitle
      ? `# ${suggestedTitle}\n\n${responseText}`
      : responseText;

    return {
      transcript,
      summary,
      suggestedTitle,
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

/**
 * 텍스트 트랜스크립트에서 요약과 카테고리 추출을 함께 수행 (YouTube용)
 */
export async function summarizeFromTranscriptWithCategory(
  transcript: string,
  title: string,
  language: SupportedLanguage = 'ko'
): Promise<SummarizeResult> {
  const result = await summarizeFromTranscript(transcript, title, language);

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
 * 페이지 콘텐츠를 간단하게 요약 (블록 기반 노트용)
 * - 브라우저 언어 설정에 따라 응답
 * - 간결한 2-3문장 요약
 */
export async function summarizePageContentSimple(
  content: string,
  title: string,
  language: SupportedLanguage = 'ko'
): Promise<{ summary: string }> {
  if (!genAI) {
    throw new AppError(500, 'GEMINI_NOT_CONFIGURED', 'Gemini API is not configured');
  }

  try {
    const model = genAI.getGenerativeModel({ model: SUMMARIZE_MODEL });


    const prompt = language === 'ko'
      ? `다음 내용을 구조화된 형태로 요약해주세요.

제목: "${title}"

내용:
${content}

---
응답 형식:
1. 주요 주제별로 번호(1️⃣, 2️⃣ 등)와 함께 섹션을 나눠서 정리
2. 각 섹션 내에서 핵심 포인트는 bullet(•, ✔️, ❌, 👉 등)으로 계층 구조화
3. 중요한 내용은 「따옴표」나 【괄호】로 강조 (마크다운 **bold** 사용 금지)
4. 화자 이름이 있으면 누가 말했는지 표시 (예: 🗣️ 홍길동: "발언 내용")
5. 마지막에 "한 줄 결론" 또는 핵심 요약 한 문장 추가
6. 존댓말 사용 (~입니다, ~했습니다, ~됩니다)
7. 내용이 짧으면 섹션 없이 bullet point로만 정리해도 됨

머릿말이나 "요약입니다" 같은 설명 없이 바로 요약 내용만 출력하세요.`
      : `Summarize the following content in a structured, easy-to-scan format.

Title: "${title}"

Content:
${content}

---
Response format:
1. Organize by main topics with numbered sections (1️⃣, 2️⃣, etc.)
2. Use bullets (•, ✔️, ❌, 👉) for hierarchical points within sections
3. Emphasize key points with「quotes」or【brackets】(do NOT use markdown **bold**)
4. If speaker names are present, attribute quotes (e.g., 🗣️ John: "quote")
5. End with a one-line conclusion or key takeaway
6. Use formal, polite language
7. For short content, just use bullet points without sections

Output only the summary without any preamble like "Here's a summary".`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const summary = response.text().trim();

    return { summary };
  } catch (error) {
    console.error('Simple page summarization failed:', error);
    throw new AppError(500, 'SUMMARIZE_FAILED', 'Failed to summarize page content');
  }
}

/**
 * 이미지 URL에서 base64 데이터 가져오기
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${imageUrl}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return {
      data: base64,
      mimeType: contentType,
    };
  } catch (error) {
    console.warn(`Error fetching image ${imageUrl}:`, error);
    return null;
  }
}

/**
 * 페이지 콘텐츠를 이미지와 함께 요약 (멀티모달 - 블록 기반 노트용)
 * - 텍스트와 이미지를 함께 분석하여 요약
 * - 캡쳐 이미지의 내용도 요약에 포함
 */
export async function summarizePageContentWithImages(
  content: string,
  imageUrls: string[],
  title: string,
  language: SupportedLanguage = 'ko'
): Promise<{ summary: string }> {
  if (!genAI) {
    throw new AppError(500, 'GEMINI_NOT_CONFIGURED', 'Gemini API is not configured');
  }

  // 이미지가 없으면 기존 텍스트 전용 요약 사용
  if (!imageUrls || imageUrls.length === 0) {
    return summarizePageContentSimple(content, title, language);
  }

  try {
    const model = genAI.getGenerativeModel({ model: SUMMARIZE_MODEL });

    // 이미지들을 base64로 변환 (최대 10개로 제한)
    const limitedUrls = imageUrls.slice(0, 10);
    const imagePromises = limitedUrls.map(url => fetchImageAsBase64(url));
    const imageResults = await Promise.all(imagePromises);
    const validImages = imageResults.filter((img): img is { data: string; mimeType: string } => img !== null);

    console.log(`Processing ${validImages.length} images for page summary`);

    // 프롬프트 구성
    const prompt = language === 'ko'
      ? `다음 내용과 이미지들을 함께 분석하여 구조화된 형태로 요약해주세요.
이미지에 포함된 텍스트, 다이어그램, 코드, 화면 캡쳐 등의 내용도 요약에 포함해주세요.

제목: "${title}"

텍스트 내용:
${content || '(텍스트 없음)'}

---
응답 형식:
1. 주요 주제별로 번호(1️⃣, 2️⃣ 등)와 함께 섹션을 나눠서 정리
2. 각 섹션 내에서 핵심 포인트는 bullet(•, ✔️, ❌, 👉 등)으로 계층 구조화
3. 중요한 내용은 「따옴표」나 【괄호】로 강조 (마크다운 **bold** 사용 금지)
4. 이미지에서 발견된 중요 정보는 🖼️ 아이콘으로 표시 (예: 🖼️ 스크린샷에서: ~)
5. 코드가 있으면 주요 부분을 설명
6. 마지막에 "한 줄 결론" 또는 핵심 요약 한 문장 추가
7. 존댓말 사용 (~입니다, ~했습니다, ~됩니다)

머릿말이나 "요약입니다" 같은 설명 없이 바로 요약 내용만 출력하세요.`
      : `Analyze the following content and images together to create a structured summary.
Include content from images such as text, diagrams, code, and screenshots in the summary.

Title: "${title}"

Text Content:
${content || '(No text)'}

---
Response format:
1. Organize by main topics with numbered sections (1️⃣, 2️⃣, etc.)
2. Use bullets (•, ✔️, ❌, 👉) for hierarchical points within sections
3. Emphasize key points with「quotes」or【brackets】(do NOT use markdown **bold**)
4. Mark important information from images with 🖼️ icon (e.g., 🖼️ From screenshot: ~)
5. Explain key parts of any code found
6. End with a one-line conclusion or key takeaway
7. Use formal, polite language

Output only the summary without any preamble like "Here's a summary".`;

    // 멀티모달 콘텐츠 구성
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // 이미지들 추가
    for (const img of validImages) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      });
    }

    // 프롬프트 추가
    parts.push({ text: prompt });

    const result = await model.generateContent(parts);
    const response = result.response;
    const summary = response.text().trim();

    return { summary };
  } catch (error) {
    console.error('Multimodal page summarization failed:', error);
    // 멀티모달 실패 시 텍스트 전용 요약으로 폴백
    console.log('Falling back to text-only summarization');
    return summarizePageContentSimple(content, title, language);
  }
}

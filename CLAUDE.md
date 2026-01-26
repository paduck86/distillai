# Project Constitution (Must Follow)

## Source of Truth

이 프로젝트에서 Claude는:

- **판단, 설계, 구현 결정 시**
  - 세션 기억이나 추론에 의존하지 않는다
  - 항상 이 `CLAUDE.md`와 `.skill/` 폴더를 다시 읽는다
  - 요청 마지막에 skill을 사용했으면 어떤 스킬을 사용했는지 명시한다.

- 이 규칙은 모든 세션, 모든 창, 모든 작업에 적용된다
- 이 문서의 지침은 사용자 지시 다음으로 우선한다

- For every project, write a detailed FOR JakeJeong.md file that explains the whole project in plain language. 

Explain the technical architecture, the structure of the codebase and how the various parts are connected, the technologies used, why we made these technical decisions, and lessons I can learn from it (this should include the bugs we ran into and how we fixed them, potential pitfalls and how to avoid them in the future, new technologies used, how good engineers think and work, best practices, etc). 

It should be very engaging to read; don't make it sound like boring technical documentation/textbook. Where appropriate, use analogies and anecdotes to make it more understandable and memorable.

# Distillai (디스틸라이) - AI 지식 증류 플랫폼

> **"Pure Knowledge from Noise."**
> 3시간의 긴 소음(Noise)에서 순수한 지식(Knowledge)만을 증류해내는 AI 지식 베이스.

---

## 프로젝트 개요

Distillai는 3시간 이상의 장시간 강의를 실시간으로 캡처하고, Gemini AI를 활용하여 Lilys 스타일의 구조화된 상세 요약본을 제공하며, AI 에이전트(Agent D)와 문답하며 학습 내용을 심화할 수 있는 웹 플랫폼입니다.

### 핵심 기능
- **The Distiller**: 실시간 브라우저 탭 오디오 캡처
- **The Essence**: Lilys AI 스타일의 계층적 상세 요약
- **The Lab**: Notion 스타일의 지식 관리
- **Agent D**: Context-aware AI 에이전트

---

## 기술 스택

### Frontend (Web Client)
- **Framework**: Angular 18+ (Standalone Components, Signals)
- **UI Library**: PrimeNG (Aura 테마)
- **Styling**: TailwindCSS v4
- **State**: Angular Signals
- **Audio Capture**: Native Browser API (getDisplayMedia)
- **Deploy**: Vercel

### Backend (API Server)
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript 5+
- **Role**: 오디오 스트림 처리, Gemini API 통신, DB 제어
- **Deploy**: Railway

### Database & Storage (Supabase)
- **DB**: PostgreSQL (유저 정보, 폴더 구조, 요약 텍스트)
- **Storage**: 오디오 파일(.webm) 영구 저장
- **Auth**: Google Login / Email Login
- **RLS**: Row Level Security 활성화

### AI Engine
- **Model**: Google Gemini 1.5 Flash (속도/비용 최적화, Long Context 지원)
- **SDK**: @google/generative-ai
- **API**: Google AI Studio API key (Free Tier)

---

## 프로젝트 구조

```
distillai/
├── frontend/                 # Angular 앱
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/        # 싱글톤 서비스, 인터셉터
│   │   │   ├── shared/      # 공통 컴포넌트, 파이프
│   │   │   ├── features/    # 기능별 모듈
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── distillation/
│   │   │   │   ├── folder/
│   │   │   │   └── agent-d/
│   │   │   └── app.component.ts
│   │   ├── assets/
│   │   │   └── i18n/       # 다국어 번역 파일
│   │   │       ├── ko.json
│   │   │       └── en.json
│   │   └── styles/
│   ├── angular.json
│   └── package.json
│
├── backend/                  # Node.js API
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── types/
│   │   └── app.ts
│   ├── package.json
│   └── tsconfig.json
│
├── supabase/                 # Supabase 설정
│   ├── migrations/
│   └── seed.sql
│
├── .claude/                  # Claude Code 설정
│   ├── settings.local.json
│   └── skills/
│
└── CLAUDE.md                 # 이 파일
```

---

## 주요 기능

### A. The Distiller (실시간 캡처 및 증류)

#### 탭 오디오 캡처
```typescript
// Web API: getDisplayMedia로 탭 오디오 캡처
const stream = await navigator.mediaDevices.getDisplayMedia({
  audio: true,
  video: false  // 비디오 불필요
});
```
- 크롬 탭 선택 → 해당 탭의 디지털 오디오 신호만 추출
- 에어팟 착용 시에도 외부 잡음 없이 깨끗한 원음만 녹음
- WebM/Opus 포맷

#### 실시간 청크 업로드
- 5분 단위 청크(Chunk) 분할
- IndexedDB 임시 저장 (데이터 유실 방지)
- 서버로 점진적 업로드

### B. The Essence (Lilys 스타일 상세 요약)

#### AI 프롬프트 엔지니어링
- 단순 요약이 아닌 **계층적 구조화** 요청
- 100만+ 토큰 Long Context 활용

#### Output Format
```markdown
# H1: 대주제
**Time**: [00:15:30] (클릭 시 해당 구간 재생)

## Context: 상세 내용
- 글머리 기호로 정리
- 핵심 개념 설명

> **Insight**: AI가 분석한 핵심 인사이트 박스
```

### C. The Lab (Notion 스타일 지식 관리)

- **폴더/트리 구조**: 사이드바에서 드래그 앤 드롭으로 분류
- **Markdown 에디터**: 요약 결과물 수정 가능
- **Status 관리** (한/영 자동 전환):
  | 코드 | 한국어 | English |
  |------|--------|---------|
  | `processing` | 증류 중... | Distilling... |
  | `crystallized` | 결정화 완료 | Crystallized |
  | `error` | 실패 | Failed |

### D. Agent D (사이드바 AI 에이전트)

- **Context Aware**: 현재 열린 요약본의 전체 텍스트를 컨텍스트로 인식
- **사용 예시**:
  - "방금 2시간째 내용 다시 설명해줘."
  - "이 내용 바탕으로 블로그 글 써줘."
  - "관련된 퀴즈 3개 내줘."

---

## 환경 변수

### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_API_URL=http://localhost:3000
```

### Backend (.env)
```bash
NODE_ENV=development
PORT=3000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...
GEMINI_API_KEY=AIxxx...
FRONTEND_URL=http://localhost:4200
```

---

## 데이터베이스 스키마

### profiles (유저 프로필)
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  tier TEXT DEFAULT 'free',  -- 'free', 'pro'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### folders (지식 보관함)
```sql
CREATE TABLE folders (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  parent_id BIGINT REFERENCES folders(id),  -- 하위 폴더 지원
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### distillations (증류된 지식)
```sql
CREATE TABLE distillations (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  folder_id BIGINT REFERENCES folders(id),
  title TEXT NOT NULL DEFAULT 'Untitled Distillation',

  -- 오디오 원본
  audio_path TEXT,              -- Supabase Storage 경로
  duration_seconds INTEGER,

  -- AI 분석 결과
  summary_md TEXT,              -- 마크다운 요약본
  full_transcript TEXT,         -- 전체 스크립트 (검색/Agent용)

  -- 상태 관리
  status TEXT DEFAULT 'processing',  -- 'processing', 'crystallized', 'error'

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS 정책
```sql
-- 보안 정책 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE distillations ENABLE ROW LEVEL SECURITY;

-- 내 데이터만 조회/생성
CREATE POLICY "Users can see own distillations" ON distillations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own distillations" ON distillations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## API 엔드포인트

### Auth
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인 (Email/Google)
- `POST /api/auth/logout` - 로그아웃

### Folders
- `GET /api/folders` - 폴더 목록
- `POST /api/folders` - 폴더 생성
- `PUT /api/folders/:id` - 폴더 수정
- `DELETE /api/folders/:id` - 폴더 삭제

### Distillations
- `GET /api/distillations` - 목록 조회
- `GET /api/distillations/:id` - 상세 조회
- `POST /api/distillations` - 새 증류 생성
- `PUT /api/distillations/:id` - 수정
- `DELETE /api/distillations/:id` - 삭제
- `POST /api/distillations/:id/upload` - 오디오 업로드
- `POST /api/distillations/:id/process` - AI 증류 요청

### Agent D
- `POST /api/agent` - AI 대화
- `GET /api/agent/:distillationId/history` - 대화 기록

---

## 개발 명령어

### Frontend
```bash
cd frontend
npm install
npm run start          # 개발 서버 (localhost:4200)
npm run build          # 프로덕션 빌드
npm run test           # 테스트
```

### Backend
```bash
cd backend
npm install
npm run dev            # 개발 서버 (localhost:3000)
npm run build          # TypeScript 컴파일
npm run start          # 프로덕션 실행
```

---

## 디자인 시스템

### 테마: "Cyber Laboratory"
화학 실험실 + 사이버펑크 감성의 세련된 다크 모드

### Color Palette
- **Background**: Deep Dark Grey (`#121212`) - 눈이 편안함
- **Primary**: Neon Cyan (`#06b6d4`) - '증류된 순수함' 상징
- **Accent**: Glass Blue - 유리 플라스크 같은 반투명 효과
- **Text**: White/Gray scale

### Typography
- **Body**: Inter 또는 Pretendard (가독성 우선)
- **Mono**: JetBrains Mono (코드/타임스탬프)

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│ Header (로고 + 검색 + 유저 메뉴)                                 │
├──────────────┬────────────────────────────┬────────────────────┤
│ Left Panel   │     Center Workspace        │   Right Panel      │
│ (Navigation) │  (Waveform Player + Editor) │   (Agent D)        │
│ 반투명 유리    │  깔끔한 문서 편집기 느낌       │  슬라이드 패널      │
└──────────────┴────────────────────────────┴────────────────────┘
```

---

## 코딩 컨벤션

### TypeScript
- strict 모드 활성화
- interface 선호 (type alias보다)
- async/await 사용
- 명시적 반환 타입

### Angular
- Standalone Components
- Signals for state
- inject() 함수 사용
- OnPush 변경 감지

### 파일 명명
- kebab-case: `distillation-detail.component.ts`
- 접미사 사용: `.component.ts`, `.service.ts`, `.pipe.ts`

---

## 다국어 지원 (i18n)

### 언어 감지 전략
1. **기본**: 브라우저 언어 자동 감지 (`navigator.language`)
2. **수동 전환**: Header에 언어 토글 버튼 (🇰🇷/🇺🇸)
3. **저장**: localStorage에 사용자 선택 언어 저장

### 지원 언어
- `ko` - 한국어 (기본)
- `en` - English

### 구현 방식
```typescript
// core/services/i18n.service.ts
@Injectable({ providedIn: 'root' })
export class I18nService {
  private currentLang = signal<'ko' | 'en'>(this.detectLanguage());

  lang = this.currentLang.asReadonly();

  private detectLanguage(): 'ko' | 'en' {
    const saved = localStorage.getItem('lang');
    if (saved === 'ko' || saved === 'en') return saved;

    const browserLang = navigator.language.slice(0, 2);
    return browserLang === 'ko' ? 'ko' : 'en';
  }

  setLanguage(lang: 'ko' | 'en'): void {
    localStorage.setItem('lang', lang);
    this.currentLang.set(lang);
  }

  toggle(): void {
    this.setLanguage(this.currentLang() === 'ko' ? 'en' : 'ko');
  }
}
```

### 번역 리소스 구조
```
frontend/src/assets/i18n/
├── ko.json
└── en.json
```

### 번역 키 예시 (Status)
```json
// ko.json
{
  "status": {
    "processing": "증류 중...",
    "crystallized": "결정화 완료",
    "error": "실패"
  }
}

// en.json
{
  "status": {
    "processing": "Distilling...",
    "crystallized": "Crystallized",
    "error": "Failed"
  }
}
```

### 컴포넌트에서 사용
```typescript
// Pipe 사용
{{ 'status.processing' | translate }}

// Signal 직접 사용
i18n = inject(I18nService);
statusText = computed(() =>
  this.i18n.lang() === 'ko' ? '증류 중...' : 'Distilling...'
);
```

---

## 개발 우선순위 (Roadmap)

### Step 1: Core
- [ ] Angular 프로젝트 생성 및 PrimeNG (Aura) 세팅
- [ ] `getDisplayMedia`로 오디오 캡처 → 다운로드 기능 (로컬 테스트)

### Step 2: AI Connection
- [ ] Node.js 서버 세팅
- [ ] 녹음 파일 → Gemini API 전송 → 텍스트 리턴 파이프라인

### Step 3: Storage & DB
- [ ] Supabase 연동
- [ ] 결과물 DB 저장 및 리스트 조회

### Step 4: Polish
- [ ] UI 디자인 (Cyber Laboratory 테마)
- [ ] Agent D 채팅창 구현
- [ ] 다국어 지원 (한/영 자동 감지 + 수동 전환)

---

## 테스트

### Unit Tests
```bash
npm run test           # Vitest
```

### E2E Tests
```bash
npm run e2e            # Playwright
```

---

## 배포

### Frontend (Vercel)
```bash
vercel --prod
```

### Backend (Railway)
```bash
railway up
```

---

## 참고 스킬

이 프로젝트는 다음 스킬들을 활용합니다:
- `.claude/skills/supabase-postgres.md` - DB 설계 및 RLS
- `.claude/skills/tailwind-patterns.md` - 스타일링
- `.claude/skills/nodejs-best-practices.md` - 백엔드 아키텍처
- `.claude/skills/typescript-expert.md` - 타입 시스템
- `.claude/skills/ui-ux-pro-max.md` - UI/UX 디자인
- `.claude/skills/clean-code.md` - 코딩 표준
- `.claude/skills/vercel-deployment.md` - 배포

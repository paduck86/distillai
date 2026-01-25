---
name: nodejs-best-practices
description: Node.js development principles and decision-making. Framework selection, async patterns, security, and architecture. Teaches thinking, not copying.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Node.js Best Practices

> Principles and decision-making for Node.js development in 2025.
> **Learn to THINK, not memorize code patterns.**

---

## 1. Framework Selection (2025)

### Decision Tree

```
What are you building?
│
├── Edge/Serverless (Cloudflare, Vercel)
│   └── Hono (zero-dependency, ultra-fast cold starts)
│
├── High Performance API
│   └── Fastify (2-3x faster than Express)
│
├── Enterprise/Team familiarity
│   └── NestJS (structured, DI, decorators)
│
├── Legacy/Stable/Maximum ecosystem
│   └── Express (mature, most middleware)
│
└── Full-stack with frontend
    └── Next.js API Routes or tRPC
```

### For Verba Project: Express or Fastify
- Express: More middleware ecosystem, familiar
- Fastify: Better performance for audio processing

---

## 2. Architecture Principles

### Layered Structure for Verba

```
Request Flow:
│
├── Controller/Route Layer
│   ├── Handles HTTP specifics
│   ├── Input validation at boundary
│   └── Calls service layer
│
├── Service Layer
│   ├── Business logic (transcription, summarization)
│   ├── Framework-agnostic
│   └── Calls repository layer
│
└── Repository Layer
    ├── Supabase client calls
    ├── Storage operations
    └── Database queries
```

### Folder Structure

```
backend/
├── src/
│   ├── controllers/
│   │   ├── lecture.controller.ts
│   │   ├── folder.controller.ts
│   │   └── auth.controller.ts
│   ├── services/
│   │   ├── lecture.service.ts
│   │   ├── transcription.service.ts
│   │   ├── summary.service.ts
│   │   └── gemini.service.ts
│   ├── repositories/
│   │   ├── lecture.repository.ts
│   │   └── folder.repository.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── routes/
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   └── app.ts
├── package.json
└── tsconfig.json
```

---

## 3. Error Handling

### Centralized Error Handling

```typescript
// Custom error classes
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super(401, 'UNAUTHORIZED', 'Authentication required');
  }
}
```

### Error Middleware

```typescript
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  // Log unexpected errors
  console.error('Unexpected error:', err);

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
};
```

---

## 4. Async Patterns

### When to Use Each

| Pattern | Use When |
|---------|----------|
| `async/await` | Sequential async operations |
| `Promise.all` | Parallel independent operations |
| `Promise.allSettled` | Parallel where some can fail |
| `Promise.race` | Timeout or first response wins |

### Streaming for Large Files

```typescript
// For audio file uploads
import { pipeline } from 'stream/promises';

export async function uploadAudio(
  file: Express.Multer.File,
  userId: string
): Promise<string> {
  const path = `${userId}/${Date.now()}-${file.originalname}`;

  const { error } = await supabase.storage
    .from('audio')
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) throw new AppError(500, 'UPLOAD_FAILED', error.message);

  return path;
}
```

---

## 5. Validation with Zod

```typescript
import { z } from 'zod';

// Lecture creation schema
export const createLectureSchema = z.object({
  title: z.string().min(1).max(200),
  folderId: z.string().uuid().optional(),
});

// Middleware
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError(result.error.message);
    }
    req.body = result.data;
    next();
  };
};
```

---

## 6. Security Checklist

- [ ] **Input validation**: All inputs validated with Zod
- [ ] **Parameterized queries**: Use Supabase client (handles this)
- [ ] **JWT verification**: Verify Supabase JWT on every request
- [ ] **Rate limiting**: Protect upload and AI endpoints
- [ ] **CORS**: Configure for frontend domain only
- [ ] **Helmet**: Security headers
- [ ] **File validation**: Check file types and sizes

### Auth Middleware

```typescript
import { createClient } from '@supabase/supabase-js';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new UnauthorizedError();
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new UnauthorizedError();
  }

  req.user = user;
  next();
};
```

---

## 7. Environment Variables

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number).default('3000'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string(),
  GEMINI_API_KEY: z.string(),
  FRONTEND_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

---

## 8. Gemini Integration Pattern

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export async function summarizeLecture(
  audioUrl: string,
  title: string
): Promise<{ summary: string; transcript: string }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Fetch audio file
  const response = await fetch(audioUrl);
  const audioBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(audioBuffer).toString('base64');

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'audio/webm',
        data: base64Audio,
      },
    },
    {
      text: `You are a professional note-taker and lecture summarizer.

Listen to this lecture titled "${title}" and provide:

1. TRANSCRIPT: A full transcription of the lecture content.

2. SUMMARY: A detailed, structured summary with:
   - [Timestamp] Main Topic headers (H1)
   - Sub-topics (H2)
   - Key points as bullet points
   - Important quotes or definitions highlighted

Format the summary in clean Markdown.
Use Korean if the lecture is in Korean.`
    }
  ]);

  const text = result.response.text();

  // Parse response
  const transcriptMatch = text.match(/TRANSCRIPT:([\s\S]*?)(?=SUMMARY:|$)/i);
  const summaryMatch = text.match(/SUMMARY:([\s\S]*?)$/i);

  return {
    transcript: transcriptMatch?.[1]?.trim() || '',
    summary: summaryMatch?.[1]?.trim() || text,
  };
}
```

---

## 9. API Response Format

```typescript
// Success response
interface SuccessResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Error response
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Helper
export function success<T>(data: T, meta?: object): SuccessResponse<T> {
  return { data, meta };
}
```

---

## 10. Testing Strategy

| Type | Tool | What to Test |
|------|------|--------------|
| Unit | Vitest | Services, utilities |
| Integration | Supertest | API endpoints |
| E2E | Playwright | Critical flows |

```typescript
// Example service test
describe('LectureService', () => {
  it('should create a lecture', async () => {
    const lecture = await lectureService.create({
      title: 'Test Lecture',
      userId: 'user-123',
    });

    expect(lecture.id).toBeDefined();
    expect(lecture.title).toBe('Test Lecture');
  });
});
```

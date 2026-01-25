import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1), // Direct PostgreSQL connection string
  GEMINI_API_KEY: z.string().optional(), // Optional - Gemini fallback
  OPENAI_API_KEY: z.string().min(1), // Primary AI provider
  FRONTEND_URL: z.string().url().default('http://localhost:4200'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

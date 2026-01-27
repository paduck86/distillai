import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Debug: Log Supabase configuration
console.log('Supabase URL:', env.SUPABASE_URL);
console.log('Supabase URL length:', env.SUPABASE_URL?.length);
console.log('Service key available:', !!env.SUPABASE_SERVICE_KEY);
console.log('Service key length:', env.SUPABASE_SERVICE_KEY?.length);

// Admin client (bypasses RLS) - use only for server-side operations
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'distillai',
    },
  }
);

// Create a client for a specific user (respects RLS)
export function createUserClient(accessToken: string) {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}

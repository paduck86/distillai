import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

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

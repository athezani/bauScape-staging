import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../utils/env';

/**
 * Server-side Supabase client for Next.js
 * Use this in Server Components and API routes
 */
export function getSupabaseServerClient(): SupabaseClient {
  const config = getSupabaseConfig();
  
  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}


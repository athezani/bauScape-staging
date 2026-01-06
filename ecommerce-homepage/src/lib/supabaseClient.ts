import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  try {
    // Direct access to process.env.NEXT_PUBLIC_* for client-side
    // Next.js replaces these at BUILD TIME with literal strings
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      const availableKeys = typeof process !== 'undefined' && process.env
        ? Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('NEXT_PUBLIC'))
        : [];
      const errorMsg = `[ERROR: SupabaseClient configuration error] Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment. Available keys: ${availableKeys.join(', ')}`;
      logger.error('SupabaseClient missing configuration', undefined, {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        availableKeys,
      });
      throw new Error(errorMsg);
    }
    
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });

    return cachedClient;
  } catch (configError) {
    logger.error('SupabaseClient configuration error', configError);
    throw configError;
  }
}

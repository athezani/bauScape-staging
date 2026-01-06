import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../utils/env';
import { logger } from '../utils/logger';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  try {
    const { url, anonKey } = getSupabaseConfig();
    
    // Log per debug (solo in sviluppo, mai in produzione)
    logger.debug('SupabaseClient initializing', {
      url: url ? `${url.substring(0, 20)}...` : 'missing',
      anonKeyLength: anonKey?.length ?? 0,
      hasUrl: !!url,
      hasAnonKey: !!anonKey,
    });
    
    if (!url || !anonKey) {
      logger.error('SupabaseClient missing configuration', undefined, {
        hasUrl: !!url,
        hasAnonKey: !!anonKey,
        envKeys: typeof process !== 'undefined' && process.env 
          ? Object.keys(process.env).filter(k => k.includes('SUPABASE'))
          : [],
      });
      throw new Error('Supabase configuration is missing. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
    }
    
    cachedClient = createClient(url, anonKey, {
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

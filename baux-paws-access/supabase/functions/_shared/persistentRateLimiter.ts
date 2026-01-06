/**
 * Persistent Rate Limiter using Supabase
 * 
 * This provides rate limiting that persists across function restarts
 * by storing rate limit data in Supabase database
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  headers: Record<string, string>;
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  const ip = cfConnectingIp || realIp || (forwardedFor?.split(',')[0]?.trim()) || 'unknown';
  
  return ip;
}

/**
 * Persistent rate limiter using Supabase
 */
export async function persistentRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig,
  supabaseUrl: string,
  supabaseKey: string
): Promise<RateLimitResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const now = Date.now();
  const key = `${endpoint}:${identifier}`;
  
  try {
    // Try to get existing rate limit record
    const { data: existing, error: selectError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('key', key)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // Error other than "not found", fallback to allow
      console.error('Rate limit check error:', selectError);
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
        headers: {
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': String(config.maxRequests - 1),
          'X-RateLimit-Reset': String(Math.ceil((now + config.windowMs) / 1000)),
        },
      };
    }

    // If no record or window expired, create/update
    if (!existing || existing.reset_at < now) {
      const { error: upsertError } = await supabase
        .from('rate_limits')
        .upsert({
          key,
          count: 1,
          reset_at: now + config.windowMs,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (upsertError) {
        console.error('Rate limit upsert error:', upsertError);
      }

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
        headers: {
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': String(config.maxRequests - 1),
          'X-RateLimit-Reset': String(Math.ceil((now + config.windowMs) / 1000)),
        },
      };
    }

    // Increment count
    const newCount = existing.count + 1;
    
    // Check if limit exceeded
    if (newCount > config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.reset_at,
        headers: {
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(existing.reset_at / 1000)),
        },
      };
    }

    // Update count
    const { error: updateError } = await supabase
      .from('rate_limits')
      .update({ 
        count: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key);

    if (updateError) {
      console.error('Rate limit update error:', updateError);
    }

    return {
      allowed: true,
      remaining: config.maxRequests - newCount,
      resetAt: existing.reset_at,
      headers: {
        'X-RateLimit-Limit': String(config.maxRequests),
        'X-RateLimit-Remaining': String(config.maxRequests - newCount),
        'X-RateLimit-Reset': String(Math.ceil(existing.reset_at / 1000)),
      },
    };
  } catch (error) {
    console.error('Rate limit exception:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
      headers: {
        'X-RateLimit-Limit': String(config.maxRequests),
        'X-RateLimit-Remaining': String(config.maxRequests - 1),
        'X-RateLimit-Reset': String(Math.ceil((now + config.windowMs) / 1000)),
      },
    };
  }
}

/**
 * Create persistent rate limit middleware
 */
export function createPersistentRateLimitMiddleware(
  endpoint: string,
  config: RateLimitConfig,
  supabaseUrl: string,
  supabaseKey: string
) {
  return async (req: Request): Promise<RateLimitResult> => {
    const identifier = getClientIdentifier(req);
    return await persistentRateLimit(identifier, endpoint, config, supabaseUrl, supabaseKey);
  };
}

/**
 * Cleanup old rate limit records (should be called periodically)
 */
export async function cleanupExpiredRateLimits(
  supabaseUrl: string,
  supabaseKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const now = Date.now();
  
  try {
    const { error } = await supabase
      .from('rate_limits')
      .delete()
      .lt('reset_at', now);
    
    if (error) {
      console.error('Rate limit cleanup error:', error);
    }
  } catch (error) {
    console.error('Rate limit cleanup exception:', error);
  }
}


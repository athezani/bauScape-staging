/**
 * Simple in-memory rate limiter for Edge Functions
 * 
 * Note: This is a basic implementation. For production at scale,
 * consider using Redis or a dedicated rate limiting service.
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

// In-memory store (resets on function restart)
// For production, use Redis or Supabase Edge Config
const store: RateLimitStore = {};

/**
 * Rate limiter function
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  
  // Clean up expired entries periodically (every 1000 requests)
  if (Math.random() < 0.001) {
    for (const k in store) {
      if (store[k].resetAt < now) {
        delete store[k];
      }
    }
  }
  
  const entry = store[key];
  
  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    store[key] = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }
  
  // Increment count
  entry.count++;
  
  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(req: Request): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  const ip = cfConnectingIp || realIp || (forwardedFor?.split(',')[0]?.trim()) || 'unknown';
  
  return ip;
}

/**
 * Rate limit middleware for Edge Functions
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return (req: Request): { allowed: boolean; remaining: number; resetAt: number; headers: Record<string, string> } => {
    const identifier = getClientIdentifier(req);
    const result = rateLimit(identifier, config);
    
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': String(config.maxRequests),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    };
    
    return {
      ...result,
      headers,
    };
  };
}

// Pre-configured rate limiters for common endpoints
export const rateLimiters = {
  checkout: createRateLimitMiddleware({ maxRequests: 5, windowMs: 60 * 1000 }), // 5 per minute
  booking: createRateLimitMiddleware({ maxRequests: 3, windowMs: 60 * 1000 }), // 3 per minute
  products: createRateLimitMiddleware({ maxRequests: 100, windowMs: 60 * 1000 }), // 100 per minute
  contact: createRateLimitMiddleware({ maxRequests: 10, windowMs: 60 * 1000 }), // 10 per minute
};


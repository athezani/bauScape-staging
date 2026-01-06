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

const store: RateLimitStore = {};

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  
  if (Math.random() < 0.001) {
    for (const k in store) {
      if (store[k].resetAt < now) {
        delete store[k];
      }
    }
  }
  
  const entry = store[key];
  
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
  
  entry.count++;
  
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

export function getClientIdentifier(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  const ip = cfConnectingIp || realIp || (forwardedFor?.split(',')[0]?.trim()) || 'unknown';
  
  return ip;
}

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

export const webhookRateLimiter = createRateLimitMiddleware({ 
  maxRequests: 100, 
  windowMs: 60 * 1000 
});


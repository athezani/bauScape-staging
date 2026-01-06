/**
 * Secure Logger for Next.js API Routes
 * 
 * This logger:
 * - Only logs in development mode (NODE_ENV=development)
 * - Sanitizes sensitive data (keys, tokens, secrets, passwords, etc.)
 * - Prevents information leakage in production
 * - Provides structured logging with context
 */

const isDevelopment = process.env.NODE_ENV === 'development';

interface LogContext {
  [key: string]: unknown;
}

/**
 * List of sensitive keys that should be sanitized
 */
const SENSITIVE_KEYS = [
  'key', 'token', 'secret', 'password', 'auth', 'authorization',
  'apikey', 'api_key', 'apiKey', 'anonKey', 'serviceKey',
  'stripe', 'webhook', 'signature', 'session', 'cookie',
  'email', 'phone', 'address', 'fiscal', 'vat', 'sdi', 'pec',
  'credit', 'card', 'cvv', 'ssn', 'iban', 'account',
  'headers', 'body', 'rawBody', // Don't log full request data
];

/**
 * Sanitize a value - only show last 4 chars if sensitive
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.length > 0 && value.length <= 4) {
      return '***';
    }
    return value.length > 4 ? `***${value.slice(-4)}` : '***';
  }
  if (typeof value === 'object' && value !== null) {
    return '[Object]';
  }
  return '[Redacted]';
}

/**
 * Check if a key is sensitive
 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some(sk => lowerKey.includes(sk));
}

/**
 * Sanitize context object
 */
function sanitizeContext(context: LogContext): LogContext {
  if (!isDevelopment) {
    // In production, return minimal context
    return {
      timestamp: new Date().toISOString(),
    };
  }

  const sanitized: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = sanitizeValue(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeContext(value as LogContext);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Secure Logger class
 */
class SecureLogger {
  private shouldLog(): boolean {
    return isDevelopment;
  }

  /**
   * Log info message (only in development)
   */
  log(context: string, data?: LogContext): void {
    if (!this.shouldLog()) return;
    
    const sanitized = data ? sanitizeContext(data) : {};
    console.log(`[${context}]`, {
      ...sanitized,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log error (always logged, but sanitized in production)
   */
  error(context: string, error: unknown, data?: LogContext): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const sanitized = data ? sanitizeContext(data) : {};
    
    if (isDevelopment) {
      // In development, log full error
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[${context}] Error:`, {
        message: errorMessage,
        stack: errorStack,
        ...sanitized,
        timestamp: new Date().toISOString(),
      });
    } else {
      // In production, only log error message (no stack trace, no sensitive data)
      console.error(`[${context}] Error:`, {
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Log warning (only in development)
   */
  warn(context: string, data?: LogContext): void {
    if (!this.shouldLog()) return;
    
    const sanitized = data ? sanitizeContext(data) : {};
    console.warn(`[${context}] Warning:`, {
      ...sanitized,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log debug message (only in development)
   */
  debug(context: string, data?: LogContext): void {
    if (!this.shouldLog()) return;
    
    const sanitized = data ? sanitizeContext(data) : {};
    console.debug(`[${context}] Debug:`, {
      ...sanitized,
      timestamp: new Date().toISOString(),
    });
  }
}

export const secureLogger = new SecureLogger();


/**
 * Secure Logger Utility
 * Logs only in development, never exposes sensitive data in production
 */

// Support both Vite (import.meta.env) and Next.js (process.env.NODE_ENV)
// Use a try-catch approach to handle both environments
let isDevelopment: boolean;
let isProduction: boolean;

try {
  // Try Vite's import.meta.env first (for Vite builds)
  // @ts-ignore - import.meta is available in Vite but not in Next.js
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    isDevelopment = import.meta.env.DEV === true;
    // @ts-ignore
    isProduction = import.meta.env.PROD === true;
  } else {
    throw new Error('Not Vite');
  }
} catch {
  // Fallback to process.env for Next.js/Node.js
  isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
  isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
}

interface LogContext {
  [key: string]: unknown;
}

/**
 * Safe logger that only logs in development
 */
class SecureLogger {
  private shouldLog(): boolean {
    return isDevelopment;
  }

  private sanitizeContext(context: LogContext): LogContext {
    if (!this.shouldLog()) {
      return {};
    }

    const sanitized: LogContext = {};
    const sensitiveKeys = ['key', 'token', 'secret', 'password', 'auth', 'authorization', 'anonKey', 'apiKey', 'apikey'];

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

      if (isSensitive && typeof value === 'string') {
        sanitized[key] = value.length > 0 ? `***${value.slice(-4)}` : '***';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  log(message: string, context?: LogContext): void {
    if (!this.shouldLog()) return;
    const sanitized = context ? this.sanitizeContext(context) : undefined;
    console.log(`[${message}]`, sanitized || '');
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    // Always log errors, but sanitize in production
    const sanitized = context ? this.sanitizeContext(context) : undefined;
    
    if (isProduction) {
      // In production, only log error messages, not full error objects
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR: ${message}]`, errorMessage, sanitized || '');
    } else {
      console.error(`[ERROR: ${message}]`, error, sanitized || '');
    }
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog()) return;
    const sanitized = context ? this.sanitizeContext(context) : undefined;
    console.warn(`[WARN: ${message}]`, sanitized || '');
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog()) return;
    const sanitized = context ? this.sanitizeContext(context) : undefined;
    console.debug(`[DEBUG: ${message}]`, sanitized || '');
  }
}

export const logger = new SecureLogger();


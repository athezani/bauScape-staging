/**
 * Error Handler Utilities
 * Centralized error handling and logging
 */

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  userMessage: string;
  retryable: boolean;
}

/**
 * Error codes
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Parse Supabase error to AppError
 */
export function parseSupabaseError(error: unknown): AppError {
  if (!error) {
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: 'Errore sconosciuto',
      userMessage: 'Si è verificato un errore imprevisto. Si prega di riprovare.',
      retryable: false,
    };
  }

  // Supabase PostgREST error
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const supabaseError = error as { message: string; code?: string; details?: string; hint?: string };
    
    // Check for specific error codes
    if (supabaseError.code === '23505') {
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: supabaseError.message,
        details: supabaseError.details,
        userMessage: 'Un record con questi dati esiste già. Verifica i dati inseriti.',
        retryable: false,
      };
    }
    
    if (supabaseError.code === '23503') {
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: supabaseError.message,
        details: supabaseError.details,
        userMessage: 'Riferimento a record non esistente. Verifica i dati inseriti.',
        retryable: false,
      };
    }
    
    if (supabaseError.code === '23514') {
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: supabaseError.message,
        details: supabaseError.details,
        userMessage: 'I dati inseriti non rispettano i vincoli del database. Verifica i valori.',
        retryable: false,
      };
    }
    
    if (supabaseError.code === 'PGRST116') {
      return {
        code: ErrorCode.NOT_FOUND,
        message: supabaseError.message,
        userMessage: 'Record non trovato.',
        retryable: false,
      };
    }
    
    if (supabaseError.code === 'PGRST301' || supabaseError.code === '42501') {
      return {
        code: ErrorCode.PERMISSION_ERROR,
        message: supabaseError.message,
        userMessage: 'Non hai i permessi per eseguire questa operazione.',
        retryable: false,
      };
    }
    
    // Network errors
    if (supabaseError.message.includes('fetch') || supabaseError.message.includes('network')) {
      return {
        code: ErrorCode.NETWORK_ERROR,
        message: supabaseError.message,
        userMessage: 'Errore di connessione. Verifica la tua connessione internet e riprova.',
        retryable: true,
      };
    }
    
    return {
      code: ErrorCode.DATABASE_ERROR,
      message: supabaseError.message,
      details: { code: supabaseError.code, details: supabaseError.details, hint: supabaseError.hint },
      userMessage: supabaseError.hint || supabaseError.details || supabaseError.message || 'Errore nel database.',
      retryable: false,
    };
  }

  // Standard Error object
  if (error instanceof Error) {
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message,
      userMessage: error.message || 'Si è verificato un errore imprevisto.',
      retryable: false,
    };
  }

  // String error
  if (typeof error === 'string') {
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error,
      userMessage: error,
      retryable: false,
    };
  }

  return {
    code: ErrorCode.UNKNOWN_ERROR,
    message: 'Errore sconosciuto',
    details: error,
    userMessage: 'Si è verificato un errore imprevisto. Si prega di riprovare.',
    retryable: false,
  };
}

/**
 * Log error with context
 */
export function logError(error: AppError, context?: Record<string, unknown>): void {
  console.error('[AppError]', {
    code: error.code,
    message: error.message,
    details: error.details,
    context,
    timestamp: new Date().toISOString(),
  });
  
  // In production, you might want to send to error tracking service (Sentry, etc.)
  // if (import.meta.env.PROD) {
  //   errorTrackingService.captureException(error, context);
  // }
}

/**
 * Handle error and return user-friendly message
 */
export function handleError(error: unknown, context?: Record<string, unknown>): AppError {
  const appError = parseSupabaseError(error);
  logError(appError, context);
  return appError;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    retryable?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    retryable = (error) => {
      const appError = parseSupabaseError(error);
      return appError.retryable;
    },
  } = options;

  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !retryable(error)) {
        throw error;
      }
      
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      console.warn(`[retryWithBackoff] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}




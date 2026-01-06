const STRIPE_ENV_KEY = 'VITE_STRIPE_CHECKOUT_URL';
const DEFAULT_STRIPE_CHECKOUT_URL =
  'https://buy.stripe.com/test_5kQeV61dQh2EeiMetc7Re00';
const SUPABASE_URL_KEY = 'VITE_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'VITE_SUPABASE_ANON_KEY';

// Next.js uses NEXT_PUBLIC_ prefix
const NEXT_PUBLIC_SUPABASE_URL_KEY = 'NEXT_PUBLIC_SUPABASE_URL';
const NEXT_PUBLIC_SUPABASE_ANON_KEY = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

type EnvShape = Record<string, string | undefined> | undefined;

// Support both Vite (import.meta.env) and Next.js (process.env)
function getRuntimeEnv(): EnvShape {
  // Next.js environment
  // In Next.js, process.env.NEXT_PUBLIC_* are available in both server and client
  // They are replaced at build time, so they should always be available
  if (typeof process !== 'undefined' && process.env) {
    return process.env;
  }
  
  // Vite environment (client-side only, fallback)
  if (typeof window !== 'undefined' && typeof import.meta !== 'undefined') {
    try {
      return ((import.meta as ImportMeta & {
        env?: Record<string, string | undefined>;
      }).env ?? undefined);
    } catch {
      // Ignore if import.meta is not available
    }
  }
  
  return undefined;
}

const runtimeEnv: EnvShape = getRuntimeEnv();

function ensureHttpsUrl(rawUrl: string, context: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid ${context} provided.`);
  }

  if (url.protocol !== 'https:') {
    throw new Error(`Only HTTPS ${context.toLowerCase()} are allowed.`);
  }

  return url.toString();
}

export function getStripeCheckoutUrl(env: EnvShape = runtimeEnv): string {
  const rawUrl =
    (env && typeof env[STRIPE_ENV_KEY] === 'string'
      ? env[STRIPE_ENV_KEY]
      : undefined) ?? DEFAULT_STRIPE_CHECKOUT_URL;

  return ensureHttpsUrl(rawUrl, 'Stripe checkout URL');
}

export function getSupabaseConfig(env: EnvShape = runtimeEnv) {
  // In Next.js, process.env.NEXT_PUBLIC_* are replaced at BUILD TIME
  // They become literal strings in the bundle, so we must access them directly
  // Check process.env first (Next.js), then fallback to passed env (Vite)
  let supabaseUrl: string | undefined;
  let supabaseAnonKey: string | undefined;
  
  // Direct access to process.env (Next.js replaces NEXT_PUBLIC_* at build time)
  if (typeof process !== 'undefined' && process.env) {
    supabaseUrl = process.env[NEXT_PUBLIC_SUPABASE_URL_KEY] || process.env[SUPABASE_URL_KEY];
    supabaseAnonKey = process.env[NEXT_PUBLIC_SUPABASE_ANON_KEY] || process.env[SUPABASE_ANON_KEY];
  }
  
  // Fallback to passed env (for Vite or if process.env doesn't have it)
  if (!supabaseUrl) {
    supabaseUrl = env?.[NEXT_PUBLIC_SUPABASE_URL_KEY] || env?.[SUPABASE_URL_KEY];
  }
  if (!supabaseAnonKey) {
    supabaseAnonKey = env?.[NEXT_PUBLIC_SUPABASE_ANON_KEY] || env?.[SUPABASE_ANON_KEY];
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    // Debug: log available env keys (only in development)
    const availableKeys = typeof process !== 'undefined' && process.env
      ? Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('NEXT_PUBLIC'))
      : [];
    
    const errorMsg = typeof process !== 'undefined' && process.env
      ? `Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment. Available keys: ${availableKeys.join(', ')}`
      : 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.';
    throw new Error(errorMsg);
  }

  return {
    url: ensureHttpsUrl(supabaseUrl, 'Supabase URL'),
    anonKey: supabaseAnonKey,
  };
}

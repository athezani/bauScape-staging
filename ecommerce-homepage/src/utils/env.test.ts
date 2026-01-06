import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStripeCheckoutUrl, getSupabaseConfig } from './env';

// Unmock the env module for these tests since we're testing the actual implementation
vi.unmock('./env');

describe('getStripeCheckoutUrl', () => {
  it('returns a sanitized https url when configuration is valid', () => {
    const env = { VITE_STRIPE_CHECKOUT_URL: 'https://checkout.stripe.com/test' };
    expect(getStripeCheckoutUrl(env)).toBe('https://checkout.stripe.com/test');
  });

  it('disallows non-https urls', () => {
    const env = { VITE_STRIPE_CHECKOUT_URL: 'http://example.com' };
    expect(() => getStripeCheckoutUrl(env)).toThrow(/HTTPS/);
  });

  it('uses default url when not configured', () => {
    const result = getStripeCheckoutUrl({});
    expect(result).toContain('buy.stripe.com');
  });

  it('throws when the url is malformed', () => {
    const env = { VITE_STRIPE_CHECKOUT_URL: 'not-a-url' };
    expect(() => getStripeCheckoutUrl(env)).toThrow(/Invalid/);
  });
});

describe('getSupabaseConfig', () => {
  it('returns config when both url and key are provided', () => {
    const env = {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-key',
    };
    const config = getSupabaseConfig(env);
    expect(config.url).toContain('https://test.supabase.co');
    expect(config.anonKey).toBe('test-key');
  });

  it('throws when url is missing', () => {
    const env = { VITE_SUPABASE_ANON_KEY: 'test-key' };
    expect(() => getSupabaseConfig(env)).toThrow(/not configured/);
  });

  it('throws when key is missing', () => {
    const env = { VITE_SUPABASE_URL: 'https://test.supabase.co' };
    expect(() => getSupabaseConfig(env)).toThrow(/not configured/);
  });
});

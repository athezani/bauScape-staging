/**
 * Odoo Configuration Management
 * 
 * Centralized configuration for Odoo integration with support for:
 * - Multiple environments (dev/staging/prod)
 * - Easy account migration
 * - Environment variable-based configuration
 */

import type { OdooConfig } from './types.ts';

/**
 * Get Odoo configuration from environment variables
 * 
 * Uses the same environment variables as the existing Sales integration:
 * - OD_URL, OD_DB_NAME, OD_LOGIN, OD_API_KEY
 * 
 * Supports multiple account configurations via environment variable prefixes:
 * - Default: OD_URL, OD_DB_NAME, OD_LOGIN, OD_API_KEY (same as Sales integration)
 * - Alternative: OD_URL_ALT, OD_DB_NAME_ALT, OD_LOGIN_ALT, OD_API_KEY_ALT
 * 
 * @param account - Account identifier ('default' | 'alt' | custom prefix)
 * @returns OdooConfig or null if not configured
 */
export function getOdooConfig(account: 'default' | 'alt' | string = 'default'): OdooConfig | null {
  const prefix = account === 'default' ? 'OD' : account === 'alt' ? 'OD_ALT' : `OD_${account.toUpperCase()}`;
  
  const url = Deno.env.get(`${prefix}_URL`);
  const database = Deno.env.get(`${prefix}_DB_NAME`);
  const username = Deno.env.get(`${prefix}_LOGIN`);
  const apiKey = Deno.env.get(`${prefix}_API_KEY`);
  
  // If any required field is missing, return null
  if (!url || !database || !apiKey) {
    return null;
  }
  
  // OD_LOGIN is recommended but not strictly required (legacy support)
  // If not provided, the client will need to handle authentication differently
  return {
    url: url.trim(),
    database: database.trim(),
    username: username?.trim() || '', // Empty string if not provided (legacy mode)
    apiKey: apiKey.trim(),
  };
}

/**
 * Validate Odoo configuration
 * 
 * @param config - Odoo configuration to validate
 * @returns true if valid, false otherwise
 */
export function validateOdooConfig(config: OdooConfig | null): config is OdooConfig {
  if (!config) return false;
  
  // Validate URL format
  try {
    const url = new URL(config.url);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
  } catch {
    return false;
  }
  
  // Validate required fields
  if (!config.database || !config.username || !config.apiKey) {
    return false;
  }
  
  return true;
}

/**
 * Get active Odoo account identifier
 * 
 * Checks OD_ACTIVE_ACCOUNT environment variable to determine which account to use.
 * Falls back to 'default' if not set.
 * 
 * @returns Account identifier
 */
export function getActiveOdooAccount(): string {
  const activeAccount = Deno.env.get('OD_ACTIVE_ACCOUNT');
  return activeAccount || 'default';
}

/**
 * Get Odoo configuration for the active account
 * 
 * @returns OdooConfig or null if not configured
 */
export function getActiveOdooConfig(): OdooConfig | null {
  const account = getActiveOdooAccount();
  return getOdooConfig(account);
}


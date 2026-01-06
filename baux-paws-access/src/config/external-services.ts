/**
 * External Services Configuration
 * 
 * This module centralizes configuration for all external service integrations.
 * Update these settings when connecting to external providers.
 * 
 * IMPORTANT: API keys and secrets should be stored in Supabase secrets,
 * not in this file. This file only contains non-sensitive configuration.
 */

export interface ExternalServicesConfig {
  auth: AuthServiceConfig;
  email: EmailServiceConfig;
  orders: OrderServiceConfig;
  database: DatabaseServiceConfig;
}

export interface AuthServiceConfig {
  provider: 'supabase' | 'auth0' | 'firebase' | 'custom';
  enabled: boolean;
  /**
   * When using external auth, set this to the external auth service URL
   */
  externalAuthUrl?: string;
  /**
   * Roles that can be assigned to users
   */
  availableRoles: string[];
}

export interface EmailServiceConfig {
  provider: 'resend' | 'sendgrid' | 'ses' | 'disabled';
  enabled: boolean;
  /**
   * Default sender email address
   */
  fromEmail: string;
  /**
   * Default sender name
   */
  fromName: string;
  /**
   * Templates enabled for sending
   */
  enabledTemplates: string[];
}

export interface OrderServiceConfig {
  /**
   * Enabled order sources
   */
  enabledSources: ('shopify' | 'woocommerce' | 'api')[];
  /**
   * Webhook endpoints configuration
   */
  webhooks: {
    shopify: {
      enabled: boolean;
      /**
       * Edge function path for Shopify webhooks
       */
      endpointPath: string;
    };
  };
  /**
   * Auto-confirm bookings from trusted sources
   */
  autoConfirmSources: string[];
}

export interface DatabaseServiceConfig {
  provider: 'supabase';
  /**
   * Enable real-time subscriptions
   */
  realtimeEnabled: boolean;
  /**
   * Tables with real-time enabled
   */
  realtimeTables: string[];
}

/**
 * Default configuration
 * 
 * MODIFY THIS WHEN INTEGRATING EXTERNAL SERVICES
 */
export const externalServicesConfig: ExternalServicesConfig = {
  auth: {
    provider: 'supabase',
    enabled: true,
    availableRoles: ['admin', 'provider'],
  },

  email: {
    provider: 'disabled', // Change to 'resend' when ready
    enabled: false,
    fromEmail: 'noreply@flixdog.com',
    fromName: 'FlixDog',
    enabledTemplates: [
      'booking_created',
      'booking_updated',
      'booking_confirmed',
      'booking_cancelled',
      'provider_welcome',
    ],
  },

  orders: {
    enabledSources: ['shopify'],
    webhooks: {
      shopify: {
        enabled: false, // Enable when Shopify integration is ready
        endpointPath: '/functions/v1/shopify-webhook',
      },
    },
    autoConfirmSources: [], // Add 'shopify' to auto-confirm Shopify orders
  },

  database: {
    provider: 'supabase',
    realtimeEnabled: true,
    realtimeTables: ['booking', 'signup_code', 'profile'],
  },
};

/**
 * Feature flags for external integrations
 */
export const featureFlags = {
  /**
   * Use external auth provider instead of Supabase Auth
   */
  useExternalAuth: false,

  /**
   * Enable email notifications
   */
  emailNotificationsEnabled: false,

  /**
   * Enable Shopify order sync
   */
  shopifyIntegrationEnabled: false,

  /**
   * Enable automatic booking status updates
   */
  autoCompleteBookingsEnabled: true,
};

/**
 * Get the current service configuration
 */
export function getServiceConfig(): ExternalServicesConfig {
  return externalServicesConfig;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof featureFlags): boolean {
  return featureFlags[feature];
}

/**
 * Environment-specific overrides
 * These can be set via environment variables
 */
export function getEnvironmentOverrides(): Partial<typeof featureFlags> {
  return {
    // Add environment variable checks here if needed
    // Example: emailNotificationsEnabled: import.meta.env.VITE_ENABLE_EMAILS === 'true'
  };
}

/**
 * Service Adapters Barrel Export
 * 
 * This module exports all service adapters for external integration.
 * Use these adapters to abstract external service dependencies.
 */

// Auth Adapter
export {
  authAdapter,
  getAuthAdapter,
  type IAuthAdapter,
  type AuthUser,
  type AuthSession,
  type AuthCredentials,
  type SignupData,
  type AuthResult,
  type AuthStateChangeCallback,
  type AuthProvider,
  type UserRole,
} from './auth.adapter';

// Database Adapter
export {
  databaseAdapter,
  getDatabaseAdapter,
  type IDatabaseAdapter,
  type QueryOptions,
  type QueryResult,
  type MutationResult,
  type DatabaseProvider,
} from './database.adapter';

// Email Adapter
export {
  emailService,
  EmailNotificationService,
  ResendEmailAdapter,
  EMAIL_TEMPLATES,
  type IEmailAdapter,
  type EmailPayload,
  type EmailResult,
  type EmailRecipient,
  type EmailAttachment,
  type BookingEmailData,
  type ProviderEmailData,
  type EmailProvider,
  type EmailTemplateType,
} from './email.adapter';

// Order Adapter
export {
  orderProcessingService,
  ShopifyOrderAdapter,
  type IOrderAdapter,
  type ExternalOrder,
  type ExternalLineItem,
  type WebhookPayload,
  type WebhookEventType,
  type OrderSource,
  type OrderProcessingResult,
  type WebhookBookingData,
} from './order.adapter';

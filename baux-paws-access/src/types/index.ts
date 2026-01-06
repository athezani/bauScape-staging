/**
 * Central export for all type definitions
 * Import types from here: import { Booking, Provider, Product } from '@/types'
 */

export * from './booking.types';
export * from './provider.types';
export * from './product.types';

// Re-export adapter types for convenience
export type {
  AuthUser,
  AuthSession,
  AuthCredentials,
  SignupData,
  AuthResult,
} from '@/services/adapters/auth.adapter';

export type {
  BookingEmailData,
  ProviderEmailData,
  EmailPayload,
  EmailResult,
} from '@/services/adapters/email.adapter';

export type {
  ExternalOrder,
  WebhookPayload,
  OrderProcessingResult,
} from '@/services/adapters/order.adapter';

export type {
  QueryOptions,
  QueryResult,
  MutationResult,
  BookingInsertData,
} from '@/services/adapters/database.adapter';
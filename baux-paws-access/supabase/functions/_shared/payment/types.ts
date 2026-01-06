export type PaymentGateway = 'stripe';

export type NormalizedPaymentStatus =
  | 'paid'
  | 'unpaid'
  | 'no_payment_required'
  | 'pending'
  | 'failed'
  | 'unknown';

export interface PaymentReference {
  gateway: PaymentGateway;
  checkoutSessionId: string;
}

export interface NormalizedCheckoutSession {
  gateway: PaymentGateway;
  checkoutSessionId: string;
  paymentStatus: NormalizedPaymentStatus;
  paymentIntentId?: string | null;
  amountTotal?: number | null; // major units (e.g. EUR)
  currency?: string | null; // uppercase (e.g. "EUR")
  customer: {
    email: string;
    name?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    fiscalCode?: string | null;
    address?: string | null;
  };
  metadata: Record<string, string>;
  raw: unknown;
}

export interface PaymentProvider {
  gateway: PaymentGateway;
  getCheckoutSession(args: { checkoutSessionId: string }): Promise<unknown>;
  normalizeCheckoutSession(raw: unknown): NormalizedCheckoutSession;
}





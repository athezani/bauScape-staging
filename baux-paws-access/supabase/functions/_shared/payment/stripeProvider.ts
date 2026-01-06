import type { NormalizedCheckoutSession, NormalizedPaymentStatus, PaymentProvider } from './types.ts';

type StripeCheckoutSession = {
  id: string;
  payment_status?: string;
  payment_intent?: string | null;
  amount_total?: number | null; // cents
  currency?: string | null;
  customer_email?: string | null;
  customer_details?: {
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  } | null;
  metadata?: Record<string, string> | null;
};

function normalizeStripePaymentStatus(status: string | undefined): NormalizedPaymentStatus {
  switch (status) {
    case 'paid':
      return 'paid';
    case 'unpaid':
      return 'unpaid';
    case 'no_payment_required':
      return 'no_payment_required';
    default:
      return status ? 'unknown' : 'unknown';
  }
}

// Extract customer data from metadata (no custom fields needed)
function extractFromMetadata(metadata: Record<string, string>) {
  const firstName = metadata.customer_name || null;
  const lastName = metadata.customer_surname || null;
  const fiscalCode = metadata.customer_fiscal_code || null;
  
  // Build address from components
  const addressParts = [
    metadata.customer_address_line1,
    metadata.customer_address_city,
    metadata.customer_address_postal_code,
    metadata.customer_address_country || 'IT'
  ].filter(Boolean);
  const address = addressParts.length > 0 ? addressParts.join(', ') : null;

  return { firstName, lastName, fiscalCode, address };
}

export function createStripeProvider(args: { stripeSecretKey: string }): PaymentProvider {
  const { stripeSecretKey } = args;

  return {
    gateway: 'stripe',
    async getCheckoutSession({ checkoutSessionId }) {
      const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${checkoutSessionId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${stripeSecretKey}` },
      });
      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Stripe getCheckoutSession failed: ${resp.status} - ${errorText}`);
      }
      return await resp.json();
    },
    normalizeCheckoutSession(raw: unknown): NormalizedCheckoutSession {
      const session = raw as StripeCheckoutSession;
      const metadata: Record<string, string> = (session.metadata ?? {}) as Record<string, string>;
      const customerEmail = session.customer_email || session.customer_details?.email || '';
      const customerName = session.customer_details?.name || null;
      const customerPhone = session.customer_details?.phone || null;
      const { firstName, lastName, fiscalCode, address } = extractFromMetadata(metadata);

      return {
        gateway: 'stripe',
        checkoutSessionId: session.id,
        paymentStatus: normalizeStripePaymentStatus(session.payment_status),
        paymentIntentId: session.payment_intent ?? null,
        amountTotal: typeof session.amount_total === 'number' ? session.amount_total / 100 : null,
        currency: session.currency ? String(session.currency).toUpperCase() : null,
        customer: {
          email: customerEmail,
          name: customerName,
          phone: customerPhone,
          firstName,
          lastName,
          fiscalCode,
          address,
        },
        metadata,
        raw,
      };
    },
  };
}



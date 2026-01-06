import type { PaymentGateway, PaymentProvider } from './types.ts';
import { createStripeProvider } from './stripeProvider.ts';

export function inferGatewayFromCheckoutSessionId(checkoutSessionId: string): PaymentGateway | null {
  // Stripe Checkout Session IDs start with "cs_" (or "cs_test_")
  if (checkoutSessionId.startsWith('cs_')) return 'stripe';
  return null;
}

export function getPaymentProvider(args: {
  gateway?: PaymentGateway | null;
  checkoutSessionId?: string | null;
}): PaymentProvider {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

  const inferred =
    args.gateway ??
    (args.checkoutSessionId ? inferGatewayFromCheckoutSessionId(args.checkoutSessionId) : null) ??
    (Deno.env.get('PAYMENT_GATEWAY_DEFAULT') as PaymentGateway | null) ??
    'stripe';

  if (inferred === 'stripe') {
    if (!stripeSecretKey) throw new Error('STRIPE_SECRET_KEY is not set');
    return createStripeProvider({ stripeSecretKey });
  }

  // Exhaustive guard for future gateways
  throw new Error(`Unsupported payment gateway: ${String(inferred)}`);
}





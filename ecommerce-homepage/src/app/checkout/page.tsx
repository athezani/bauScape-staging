import type { Metadata } from 'next';
import { InternalCheckoutPageClient } from '@/components/InternalCheckoutPageClient';

export const dynamic = 'force-dynamic'; // Disable static generation - uses searchParams

export const metadata: Metadata = {
  title: 'Checkout - FlixDog',
  description: 'Completa la tua prenotazione. Inserisci i tuoi dati per procedere con il pagamento.',
  robots: {
    index: false, // Checkout pages should not be indexed
    follow: false,
  },
};

export default function CheckoutPage() {
  return <InternalCheckoutPageClient />;
}


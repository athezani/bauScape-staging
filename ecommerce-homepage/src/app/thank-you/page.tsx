import type { Metadata } from 'next';
import { ThankYouPageClient } from '@/components/ThankYouPageClient';

export const dynamic = 'force-dynamic'; // Disable static generation - uses searchParams

export const metadata: Metadata = {
  title: 'Grazie per la tua prenotazione - FlixDog',
  description: 'La tua prenotazione è stata confermata. Grazie per aver scelto FlixDog!',
  robots: {
    index: false, // Thank you pages should not be indexed
    follow: false,
  },
};

export default function ThankYouPage() {
  return <ThankYouPageClient />;
}


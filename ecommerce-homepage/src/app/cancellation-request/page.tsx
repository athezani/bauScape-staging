import { Metadata } from 'next';
import CancellationRequestPageClient from '@/components/CancellationRequestPageClient';

export const metadata: Metadata = {
  title: 'Richiedi Cancellazione | FlixDog',
  description: 'Richiedi la cancellazione della tua prenotazione',
  robots: 'noindex, nofollow',
};

export default function CancellationRequestPage() {
  return <CancellationRequestPageClient />;
}


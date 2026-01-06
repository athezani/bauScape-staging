import type { Metadata } from 'next';
import { ContattiPageClient } from '@/components/ContattiPageClient';

export const metadata: Metadata = {
  title: 'Contatti - Supporto e Informazioni | FlixDog',
  description: 'Hai domande su cosa fare con il cane? Contatta FlixDog per informazioni su attività, esperienze, vacanze e corsi dog-friendly. Siamo qui per aiutarti a trovare l\'esperienza perfetta per te e il tuo amico a quattro zampe.',
  keywords: 'contatti FlixDog, supporto clienti, informazioni prenotazioni, assistenza viaggi con cani, help desk FlixDog, domande attività con cani, informazioni dog-friendly',
  authors: [{ name: 'FlixDog' }],
  alternates: {
    canonical: 'https://flixdog.com/contatti',
  },
  openGraph: {
    title: 'Contatti - Supporto e Informazioni | FlixDog',
    description: 'Contatta FlixDog per informazioni, supporto o domande. Siamo qui per aiutarti a trovare l\'esperienza perfetta per te e il tuo cane.',
    type: 'website',
    url: 'https://flixdog.com/contatti',
    images: [
      {
        url: 'https://flixdog.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Contatti FlixDog',
      },
    ],
    locale: 'it_IT',
    siteName: 'FlixDog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contatti - FlixDog',
    description: 'Contatta FlixDog per informazioni, supporto o domande.',
    images: ['https://flixdog.com/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ContattiPage() {
  return <ContattiPageClient />;
}


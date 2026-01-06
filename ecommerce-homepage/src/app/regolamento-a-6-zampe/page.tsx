import type { Metadata } from 'next';
import { RegolamentoPageClient } from '@/components/RegolamentoPageClient';

export const metadata: Metadata = {
  title: 'Regolamento a 6 Zampe - Linee Guida e Norme | FlixDog',
  description: 'Scopri il regolamento a 6 zampe di FlixDog. Linee guida e norme per garantire un\'esperienza sicura e piacevole durante attività, viaggi e corsi con il tuo cane. Regole di comportamento e sicurezza per tutti.',
  keywords: 'regolamento FlixDog, linee guida viaggi con cani, norme comportamento, sicurezza cani, regole esperienze dog-friendly, regole attività con cani, norme pet-friendly',
  authors: [{ name: 'FlixDog' }],
  alternates: {
    canonical: 'https://flixdog.com/regolamento-a-6-zampe',
  },
  openGraph: {
    title: 'Regolamento a 6 Zampe - Linee Guida e Norme | FlixDog',
    description: 'Regolamento e linee guida per le esperienze FlixDog. Scopri le regole per garantire un\'esperienza sicura e piacevole per te e il tuo cane.',
    type: 'website',
    url: 'https://flixdog.com/regolamento-a-6-zampe',
    images: [
      {
        url: 'https://flixdog.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Regolamento a 6 Zampe FlixDog',
      },
    ],
    locale: 'it_IT',
    siteName: 'FlixDog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Regolamento a 6 Zampe - FlixDog',
    description: 'Regolamento e linee guida per le esperienze FlixDog.',
    images: ['https://flixdog.com/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RegolamentoPage() {
  return <RegolamentoPageClient />;
}


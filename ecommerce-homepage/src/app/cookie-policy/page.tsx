import type { Metadata } from 'next';
import { CookiePolicyPageClient } from '@/components/CookiePolicyPageClient';

export const metadata: Metadata = {
  title: 'Cookie Policy - Privacy e Gestione Cookie | FlixDog',
  description: 'Informazioni sulla gestione dei cookie su FlixDog. Scopri come utilizziamo i cookie e come gestirli secondo il GDPR. Informativa completa sulla privacy e sulla protezione dei dati personali.',
  keywords: 'cookie policy, privacy policy, GDPR, gestione cookie, protezione dati, FlixDog privacy, informativa privacy',
  authors: [{ name: 'FlixDog' }],
  alternates: {
    canonical: 'https://flixdog.com/cookie-policy',
  },
  openGraph: {
    title: 'Cookie Policy - Privacy e Gestione Cookie | FlixDog',
    description: 'Informazioni sulla gestione dei cookie su FlixDog. Scopri come utilizziamo i cookie e come gestirli secondo il GDPR.',
    type: 'website',
    url: 'https://flixdog.com/cookie-policy',
    images: [
      {
        url: 'https://flixdog.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Cookie Policy FlixDog',
      },
    ],
    locale: 'it_IT',
    siteName: 'FlixDog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cookie Policy - FlixDog',
    description: 'Informazioni sulla gestione dei cookie su FlixDog.',
    images: ['https://flixdog.com/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CookiePolicyPage() {
  return <CookiePolicyPageClient />;
}


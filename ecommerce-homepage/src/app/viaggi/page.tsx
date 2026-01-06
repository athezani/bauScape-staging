import type { Metadata } from 'next';
import { fetchProducts } from '@/lib/productsServer';
import { TripsPageClient } from '@/components/TripsPageClient';

export const metadata: Metadata = {
  title: 'Viaggi Dog-Friendly - Vacanze con il Tuo Cane in Italia | FlixDog',
  description: 'Cerca vacanze con il cane? Scopri le migliori destinazioni dog-friendly in Italia. Hotel pet-friendly, ristoranti dog-friendly, spiagge per cani e pacchetti vacanza completi. Prenota il tuo weekend o vacanza con il tuo amico a quattro zampe!',
  keywords: 'vacanze con il cane, weekend con cane, hotel dog friendly, ristoranti dog friendly, spiagge per cani, luoghi dog friendly, vacanze pet friendly, viaggi con animali, destinazioni dog friendly italia, weekend romantico con cane, hotel pet friendly, strutture dog friendly, pacchetti vacanza con cani, dog beach, pet friendly italia, FlixDog',
  authors: [{ name: 'FlixDog' }],
  alternates: {
    canonical: 'https://flixdog.com/viaggi',
  },
  openGraph: {
    title: 'Viaggi Dog-Friendly - Vacanze con il Tuo Cane in Italia | FlixDog',
    description: 'Viaggi organizzati per te e il tuo cane. Vacanze dog-friendly in tutta Italia con sistemazioni verificate.',
    type: 'website',
    url: 'https://flixdog.com/viaggi',
    images: [
      {
        url: 'https://flixdog.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Viaggi Dog-Friendly FlixDog',
      },
    ],
    locale: 'it_IT',
    siteName: 'FlixDog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Viaggi Dog-Friendly - FlixDog',
    description: 'Viaggi organizzati per te e il tuo cane. Vacanze dog-friendly in tutta Italia con sistemazioni verificate.',
    images: ['https://flixdog.com/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const revalidate = 60;

export default async function TripsPage() {
  const { products, error } = await fetchProducts({ types: ['trip'] });
  
  return <TripsPageClient products={products} error={error} />;
}


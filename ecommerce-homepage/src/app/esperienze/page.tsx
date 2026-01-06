import type { Metadata } from 'next';
import { fetchProducts } from '@/lib/productsServer';
import { ExperiencesPageClient } from '@/components/ExperiencesPageClient';

export const metadata: Metadata = {
  title: 'Esperienze Dog-Friendly - Tour e Attività con il Tuo Cane | FlixDog',
  description: 'Cerca cosa fare con il cane? Scopri le migliori esperienze e attività con il tuo cane in Italia. Tour guidati, escursioni, visite culturali, attività all\'aperto e tanto altro. Prenota online la tua esperienza dog-friendly!',
  keywords: 'cose da fare con il cane, attività con il cane, esperienze con cani, tour con cani, escursioni con cani, visite guidate con cani, attività all\'aperto con cani, weekend con cane, dog trekking, passeggiate con cani, eventi per cani, luoghi dog friendly, pet friendly italia, dog friendly italia, esperienze dog-friendly, FlixDog',
  authors: [{ name: 'FlixDog' }],
  alternates: {
    canonical: 'https://flixdog.com/esperienze',
  },
  openGraph: {
    title: 'Esperienze Dog-Friendly - Tour e Attività con il Tuo Cane | FlixDog',
    description: 'Scopri esperienze uniche per te e il tuo cane. Tour, escursioni e attività dog-friendly in tutta Italia.',
    type: 'website',
    url: 'https://flixdog.com/esperienze',
    images: [
      {
        url: 'https://flixdog.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Esperienze Dog-Friendly FlixDog',
      },
    ],
    locale: 'it_IT',
    siteName: 'FlixDog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Esperienze Dog-Friendly - FlixDog',
    description: 'Scopri esperienze uniche per te e il tuo cane. Tour, escursioni e attività dog-friendly in tutta Italia.',
    images: ['https://flixdog.com/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const revalidate = 60;

export default async function ExperiencesPage() {
  const { products, error } = await fetchProducts({ types: ['experience'] });
  
  return <ExperiencesPageClient products={products} error={error} />;
}


import type { Metadata } from 'next';
import { fetchProducts } from '@/lib/productsServer';
import { ClassesPageClient } from '@/components/ClassesPageClient';

export const metadata: Metadata = {
  title: 'Classi e Corsi per Cani - Formazione e Attività Educative | FlixDog',
  description: 'Cerca corsi per cani o addestramento? Scopri corsi di educazione cinofila, addestramento, sport cinofili e attività educative per te e il tuo cane. Migliora il rapporto con il tuo amico a quattro zampe con i migliori educatori cinofili. Prenota online!',
  keywords: 'corsi per cani, addestramento cani, educazione cinofila, corsi di addestramento cani, educatore cinofilo, sport cinofili, agility cani, attività educative cani, formazione cani, classi per cani, addestramento cuccioli, obbedienza cani, sport con cani, attività con cani, FlixDog',
  authors: [{ name: 'FlixDog' }],
  alternates: {
    canonical: 'https://flixdog.com/classi',
  },
  openGraph: {
    title: 'Classi e Corsi per Cani - Formazione e Attività Educative | FlixDog',
    description: 'Corsi e classi per te e il tuo cane. Impara nuove attività e migliora il rapporto con il tuo amico a quattro zampe.',
    type: 'website',
    url: 'https://flixdog.com/classi',
    images: [
      {
        url: 'https://flixdog.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Classi e Corsi per Cani FlixDog',
      },
    ],
    locale: 'it_IT',
    siteName: 'FlixDog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Classi e Corsi per Cani - FlixDog',
    description: 'Corsi e classi per te e il tuo cane. Impara nuove attività e migliora il rapporto con il tuo amico a quattro zampe.',
    images: ['https://flixdog.com/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const revalidate = 60;

export default async function ClassesPage() {
  const { products, error } = await fetchProducts({ types: ['class'] });
  
  return <ClassesPageClient products={products} error={error} />;
}


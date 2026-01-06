import type { Metadata } from 'next';
import { fetchProducts } from '@/lib/productsServer';
import { HomePageClient } from '@/components/HomePageClient';

export const metadata: Metadata = {
  title: 'Viaggi, Esperienze e Attività Dog Friendly con il Tuo Cane | FlixDog',
  description: 'Vivi esperienze uniche con il tuo cane: vacanze, attività e viaggi dog friendly in Italia. Prenota ora la tua avventura insieme a FlixDog!',
  keywords: 'cose da fare con il cane, attività con il cane, esperienze con cani, weekend con cane, vacanze con il cane, luoghi dog friendly, ristoranti dog friendly, hotel dog friendly, spiagge per cani, parchi per cani, escursioni con cani, attività all\'aperto con cani, eventi per cani, pet friendly italia, dog friendly italia, viaggi con animali, prenotazioni online attività cani, FlixDog, esperienze dog-friendly, vacanze pet-friendly, weekend romantico con cane, dog trekking, dog beach, dog park',
  authors: [{ name: 'FlixDog' }],
  alternates: {
    canonical: 'https://flixdog.com',
  },
  openGraph: {
    type: 'website',
    url: 'https://flixdog.com',
    title: 'Viaggi, Esperienze e Attività Dog Friendly con il Tuo Cane | FlixDog',
    description: 'Vivi esperienze uniche con il tuo cane: vacanze, attività e viaggi dog friendly in Italia. Prenota ora la tua avventura insieme a FlixDog!',
    images: [
      {
        url: 'https://flixdog.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'FlixDog - Avventure a 4 zampe',
      },
    ],
    locale: 'it_IT',
    siteName: 'FlixDog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Viaggi, Esperienze e Attività Dog Friendly con il Tuo Cane | FlixDog',
    description: 'Vivi esperienze uniche con il tuo cane: vacanze, attività e viaggi dog friendly in Italia. Prenota ora la tua avventura insieme a FlixDog!',
    images: ['https://flixdog.com/og-image.jpg'],
    site: '@flixdog_official',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'G-FC1WS2974S',
  },
};

// Revalidate every 60 seconds for ISR
export const revalidate = 60;

export default async function HomePage() {
  const { products, error } = await fetchProducts();
  
  // Structured data for homepage
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FlixDog',
    url: 'https://flixdog.com',
    logo: 'https://flixdog.com/og-image.jpg',
    description: 'Piattaforma per prenotare viaggi, esperienze e attività dog-friendly in tutta Italia',
    sameAs: [
      'https://twitter.com/flixdog_official',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      url: 'https://flixdog.com/contatti',
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FlixDog',
    url: 'https://flixdog.com',
    description: 'Scopri esperienze uniche pensate per te e il tuo cane. Viaggi e attività dog-friendly in tutta Italia.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://flixdog.com/esperienze?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <HomePageClient products={products} error={error} />
    </>
  );
}

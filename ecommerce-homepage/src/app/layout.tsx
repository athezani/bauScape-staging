import type { Metadata, Viewport } from 'next';
import { Ubuntu } from 'next/font/google';
import '../index.css';

// Ottimizzazione font: next/font carica i font in modo non bloccante
const ubuntu = Ubuntu({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap', // Mostra fallback font mentre il font si carica
  variable: '--font-ubuntu',
});

export const metadata: Metadata = {
  title: 'FlixDog - Avventure a 4 zampe',
  description: 'Vacanze dog friendly in Italia, viaggi e attività pet friendly da vivere con il tuo cane. Scopri esperienze uniche, destinazioni selezionate e prenota online con FlixDog.',
  keywords: 'viaggi con cani, esperienze dog-friendly, vacanze con animali, attività per cani, FlixDog',
  authors: [{ name: 'FlixDog' }],
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    url: 'https://flixdog.com',
    title: 'FlixDog - Avventure a 4 zampe',
    description: 'Vacanze dog friendly in Italia, viaggi e attività pet friendly da vivere con il tuo cane. Scopri esperienze uniche, destinazioni selezionate e prenota online con FlixDog.',
    images: ['https://flixdog.com/og-image.jpg'],
    locale: 'it_IT',
    siteName: 'FlixDog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlixDog - Avventure a 4 zampe',
    description: 'Vacanze dog friendly in Italia, viaggi e attività pet friendly da vivere con il tuo cane. Scopri esperienze uniche, destinazioni selezionate e prenota online con FlixDog.',
    images: ['https://flixdog.com/og-image.jpg'],
    site: '@flixdog_official',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={ubuntu.variable}>
      <head>
        {/* Preload immagine Hero critica per LCP */}
        {/* Nota: Next.js Image gestisce già l'ottimizzazione, il preload diretto potrebbe non essere necessario */}
        {/* Manteniamo il preload per migliorare LCP su connessioni lente */}
        <link
          rel="preload"
          href="/images/webp/Checco_from_Pixelcut.webp"
          as="image"
          fetchPriority="high"
          type="image/webp"
        />
        
        {/* HTTP/2 Resource Hints - Ottimizzazioni per velocizzare il caricamento */}
        {/* DNS prefetch per domini esterni - risolve DNS in anticipo */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://*.supabase.co" />
        <link rel="dns-prefetch" href="https://*.supabase.in" />
        <link rel="dns-prefetch" href="https://api.stripe.com" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://checkout.stripe.com" />
        <link rel="dns-prefetch" href="https://cdn.iubenda.com" />
        
        {/* Preconnect per connessioni critiche - stabilisce connessione TCP/TLS in anticipo */}
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://js.stripe.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.stripe.com" crossOrigin="anonymous" />
        
        {/* Google Analytics - caricato in modo defer per non bloccare il rendering */}
        <script
          defer
          src="https://www.googletagmanager.com/gtag/js?id=G-FC1WS2974S"
        />
        <script
          defer
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-FC1WS2974S');
            `,
          }}
        />
      </head>
      <body className={ubuntu.className}>{children}</body>
    </html>
  );
}

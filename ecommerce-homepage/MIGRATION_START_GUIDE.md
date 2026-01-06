# Guida Inizio Migrazione Next.js

## 🚀 Quick Start - Primi 3 Passi

### Passo 1: Installazione Dipendenze

```bash
cd ecommerce-homepage

# Installare Next.js e dipendenze
npm install next@latest react@latest react-dom@latest

# Installare types
npm install -D @types/node @types/react @types/react-dom

# Rimuovere react-router-dom (non più necessario)
npm uninstall react-router-dom
```

### Passo 2: Creare Struttura Base

```bash
# Creare directory app (Next.js App Router)
mkdir -p app

# Creare file base
touch app/layout.tsx
touch app/page.tsx
touch next.config.js
touch tsconfig.json
```

### Passo 3: Configurazione Base

#### `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Mantenere compatibilità con struttura esistente
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Headers di sicurezza (da vercel.json)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

#### `app/layout.tsx` (Root Layout)
```typescript
import type { Metadata } from 'next';
import './globals.css'; // Importa i tuoi stili esistenti

export const metadata: Metadata = {
  title: 'FlixDog - Avventure a 4 zampe',
  description: 'Scopri esperienze uniche per te e il tuo amico a quattro zampe. Viaggi, classi e attività dog-friendly in tutta Italia.',
  keywords: 'viaggi con cani, esperienze dog-friendly, vacanze con animali, attività per cani, FlixDog',
  authors: [{ name: 'FlixDog' }],
  openGraph: {
    type: 'website',
    url: 'https://flixdog.com',
    title: 'FlixDog - Avventure a 4 zampe',
    description: 'Scopri esperienze uniche per te e il tuo amico a quattro zampe.',
    images: ['https://flixdog.com/og-image.jpg'],
    locale: 'it_IT',
    siteName: 'FlixDog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlixDog - Avventure a 4 zampe',
    description: 'Scopri esperienze uniche per te e il tuo amico a quattro zampe.',
    images: ['https://flixdog.com/og-image.jpg'],
    site: '@flixdog_official',
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <head>
        {/* Google Analytics - già presente in index.html, mantenere qui */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-FC1WS2974S"
        />
        <script
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
      <body>{children}</body>
    </html>
  );
}
```

#### `app/page.tsx` (Home Page - Primo Esempio)
```typescript
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { HomePageClient } from '@/components/HomePageClient';
import type { Product } from '@/types/product';

// Server Component - Fetch dati lato server
export default async function HomePage() {
  const supabase = await getSupabaseServerClient();
  
  // Fetch prodotti (esempio - da adattare)
  const { data: experiences } = await supabase
    .from('experience')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(6);
  
  const { data: trips } = await supabase
    .from('trip')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(6);
  
  const { data: classes } = await supabase
    .from('class')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(6);
  
  // Metadata per SEO
  export const metadata = {
    title: 'FlixDog - Avventure a 4 zampe',
    description: 'Scopri esperienze uniche per te e il tuo amico a quattro zampe.',
  };
  
  // ISR: Rigenera ogni 60 secondi
  export const revalidate = 60;
  
  return (
    <HomePageClient
      experiences={experiences || []}
      trips={trips || []}
      classes={classes || []}
    />
  );
}
```

### Passo 4: Creare Supabase Server Client

#### `src/lib/supabase-server.ts` (NUOVO)
```typescript
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client
 * Usa variabili d'ambiente NEXT_PUBLIC_*
 */
export async function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase configuration missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
}
```

### Passo 5: Aggiornare Variabili d'Ambiente

#### `.env.local` (NUOVO)
```bash
# Next.js usa NEXT_PUBLIC_ invece di VITE_
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_STRIPE_CHECKOUT_URL=https://buy.stripe.com/...

# Server-side only (non NEXT_PUBLIC_)
OD_URL=your-odoo-url
OD_DB_NAME=your-db
OD_API_KEY=your-api-key
OD_LOGIN=your-login
ST_WEBHOOK_SECRET=your-webhook-secret
SUPABASE_SERVICE_ROLE_KEY=your-service-key
STRIPE_SECRET_KEY=your-stripe-secret
```

### Passo 6: Aggiornare package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    // Mantenere test esistenti
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

### Passo 7: Aggiornare tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## 🧪 Test Locale

```bash
# Avviare dev server
npm run dev

# Dovrebbe essere disponibile su http://localhost:3000
```

## 📋 Checklist Primi Passi

- [ ] Dipendenze installate
- [ ] Struttura `app/` creata
- [ ] `next.config.js` configurato
- [ ] `app/layout.tsx` creato
- [ ] `app/page.tsx` creato (home)
- [ ] `supabase-server.ts` creato
- [ ] Variabili d'ambiente aggiornate
- [ ] `package.json` aggiornato
- [ ] `tsconfig.json` aggiornato
- [ ] Dev server funzionante

## ⚠️ Note Importanti

1. **Coesistenza**: Puoi mantenere Vite e Next.js in parallelo durante la migrazione
2. **Branch**: Crea un branch `nextjs-migration` per lavorare in sicurezza
3. **Testing**: Testa ogni pagina man mano che la migri
4. **Deploy**: Non deployare finché non hai almeno 2-3 pagine funzionanti

## 🎯 Prossimi Passi

Dopo aver completato questi passi base:
1. Migrare una pagina semplice (es. `/cookie-policy`)
2. Migrare una pagina con dati (es. `/esperienze`)
3. Migrare pagina prodotto (più complessa)
4. Migrare checkout (più critica)

Vedi `NEXTJS_MIGRATION_PLAN.md` per il piano completo.


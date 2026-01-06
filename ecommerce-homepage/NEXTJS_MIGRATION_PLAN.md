# Piano di Migrazione a Next.js - FlixDog

## 🎯 Obiettivi della Migrazione

1. **SEO Ottimale**: Meta tag server-side per crawler e social sharing
2. **Performance**: First Contentful Paint < 1.5s, Time to Interactive < 3s
3. **Scalabilità**: Supporto per alto traffico con ISR (Incremental Static Regeneration)
4. **SEM**: Meta tag perfetti per campagne Google Ads/Facebook Ads
5. **Resilienza**: Fallback HTML anche se JavaScript fallisce

## 📊 Benefici Attesi

### Performance
- **FCP**: Da ~2.5s a <1.5s (40% miglioramento)
- **TTI**: Da ~4s a <3s (25% miglioramento)
- **LCP**: Da ~3s a <2.5s (17% miglioramento)
- **SEO Score**: Da ~70 a >90 (Google PageSpeed)

### SEO
- Meta tag nel HTML iniziale (non via JavaScript)
- Structured data (JSON-LD) server-side
- Sitemap dinamica con ISR
- Social sharing perfetto (Open Graph, Twitter Cards)

### Scalabilità
- ISR: Pagine prodotto aggiornate ogni 60s senza rebuild completo
- Edge Caching: Contenuto statico servito da CDN globale
- Server Components: Meno JavaScript al client

## 🗺️ Strategia di Migrazione

### Fase 1: Setup e Preparazione (2-3 giorni)

#### 1.1 Installazione Next.js
```bash
cd ecommerce-homepage
npm install next@latest react@latest react-dom@latest
npm install -D @types/node @types/react @types/react-dom
```

#### 1.2 Configurazione Base
- Creare `next.config.js`
- Configurare variabili d'ambiente (`NEXT_PUBLIC_*`)
- Setup TypeScript per Next.js
- Configurare Vercel per Next.js

#### 1.3 Struttura Directory
```
ecommerce-homepage/
├── app/                    # Next.js App Router (nuovo)
│   ├── layout.tsx
│   ├── page.tsx           # Home
│   ├── esperienze/
│   ├── viaggi/
│   ├── classi/
│   ├── prodotto/
│   │   └── [type]/
│   │       └── [id]/
│   ├── checkout/
│   ├── thank-you/
│   ├── contatti/
│   ├── cookie-policy/
│   └── regolamento-a-6-zampe/
├── src/                    # Mantenere per compatibilità
│   ├── components/         # Riutilizzare tutti
│   ├── hooks/              # Migrare gradualmente
│   ├── lib/                # Riutilizzare
│   ├── services/           # Riutilizzare
│   ├── types/              # Riutilizzare
│   └── utils/              # Riutilizzare
└── api/                    # Migrare a app/api/
```

### Fase 2: Migrazione Routing (3-4 giorni)

#### 2.1 Pagine Statiche (SSG)
- `/cookie-policy` → `app/cookie-policy/page.tsx`
- `/regolamento-a-6-zampe` → `app/regolamento-a-6-zampe/page.tsx`
- `/contatti` → `app/contatti/page.tsx`

#### 2.2 Pagine Dinamiche (ISR)
- `/` → `app/page.tsx` (Home con ISR 60s)
- `/esperienze` → `app/esperienze/page.tsx` (ISR 60s)
- `/viaggi` → `app/viaggi/page.tsx` (ISR 60s)
- `/classi` → `app/classi/page.tsx` (ISR 60s)

#### 2.3 Pagine Prodotto (ISR + Dynamic Routes)
- `/prodotto/[type]/[id]` → `app/prodotto/[type]/[id]/page.tsx`
  - **Strategia**: ISR con revalidate: 60
  - **Fallback**: 'blocking' per nuovi prodotti
  - **generateStaticParams**: Pre-genera top 100 prodotti

#### 2.4 Pagine Interattive (Client Components)
- `/checkout` → `app/checkout/page.tsx` (Client Component)
- `/thank-you` → `app/thank-you/page.tsx` (Client Component)

### Fase 3: Data Fetching (5-6 giorni)

#### 3.1 Server Functions per Supabase
Creare `src/lib/supabase-server.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  // Server-side Supabase client
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

#### 3.2 Migrazione Hooks
- `useProducts` → Server Component con `async/await`
- `useProduct` → Server Component con `async/await`
- Mantenere hooks per Client Components quando necessario

#### 3.3 Esempio Migrazione
**Prima (SPA)**:
```typescript
// hooks/useProducts.ts
export function useProducts() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    // Fetch client-side
  }, []);
  return { products, loading, error };
}
```

**Dopo (Next.js)**:
```typescript
// app/esperienze/page.tsx
import { getSupabaseServerClient } from '@/lib/supabase-server';

export default async function ExperiencesPage() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from('experience').select('*');
  // Render direttamente, no loading state
  return <ExperiencesPageClient products={data} />;
}
```

### Fase 4: SEO e Metadata (2-3 giorni)

#### 4.1 generateMetadata per Ogni Pagina
```typescript
// app/prodotto/[type]/[id]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.id, params.type);
  
  return {
    title: `${product.title} | FlixDog`,
    description: product.description,
    openGraph: {
      title: product.title,
      description: product.description,
      images: [product.imageUrl],
      type: 'product',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description: product.description,
      images: [product.imageUrl],
    },
  };
}
```

#### 4.2 Structured Data Server-Side
```typescript
// In ogni pagina prodotto
export default async function ProductPage({ params }) {
  const product = await getProduct(params.id, params.type);
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    // ... resto dello schema
  };
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailPageClient product={product} />
    </>
  );
}
```

#### 4.3 Sitemap Dinamica
```typescript
// app/sitemap.ts
export default async function sitemap() {
  const products = await getAllProducts();
  
  return [
    {
      url: 'https://flixdog.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...products.map(product => ({
      url: `https://flixdog.com/prodotto/${product.type}/${product.id}`,
      lastModified: product.updated_at,
      changeFrequency: 'weekly',
      priority: 0.8,
    })),
  ];
}
```

### Fase 5: API Routes (2-3 giorni)

#### 5.1 Migrazione Webhook Stripe
- `api/stripe-webhook-odoo.ts` → `app/api/webhooks/stripe/route.ts`
- Usare `NextRequest` invece di `VercelRequest`
- Gestire raw body per signature verification

#### 5.2 Migrazione Odoo API
- `api/create-odoo-custom-fields.ts` → `app/api/admin/odoo/route.ts`

### Fase 6: Ottimizzazioni Performance (2-3 giorni)

#### 6.1 Image Optimization
```typescript
import Image from 'next/image';

// Sostituire tutti gli <img> con <Image>
<Image
  src={product.imageUrl}
  alt={product.title}
  width={800}
  height={600}
  priority // Per immagini above-the-fold
/>
```

#### 6.2 Code Splitting
- Lazy loading per componenti pesanti
- Dynamic imports per moduli non critici

#### 6.3 ISR Configuration
```typescript
// next.config.js
export default {
  experimental: {
    isrMemoryCacheSize: 0, // Disabilita cache in-memory per ISR
  },
  // Revalidate tutte le pagine ogni 60s
  revalidate: 60,
};
```

### Fase 7: Testing e Deploy (3-4 giorni)

#### 7.1 Testing
- Test funzionalità esistenti
- Test SEO (meta tag, structured data)
- Test performance (Lighthouse)
- Test social sharing (Facebook Debugger, Twitter Card Validator)

#### 7.2 Deploy Graduale
1. Deploy su branch `nextjs-migration`
2. Test su preview URL
3. Deploy su produzione con feature flag
4. Monitoraggio per 24-48h
5. Switch completo

## 🔧 Configurazioni Chiave

### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // ISR globale
  experimental: {
    isrMemoryCacheSize: 0,
  },
  
  // Headers di sicurezza (mantenere da vercel.json)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // ... altri headers
        ],
      },
    ];
  },
  
  // Images
  images: {
    domains: ['your-supabase-storage-url.com'],
    formats: ['image/avif', 'image/webp'],
  },
};

module.exports = nextConfig;
```

### Variabili d'Ambiente
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_STRIPE_CHECKOUT_URL=...
OD_URL=...
OD_DB_NAME=...
OD_API_KEY=...
OD_LOGIN=...
ST_WEBHOOK_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
```

## 📈 Metriche di Successo

### Performance
- [ ] FCP < 1.5s
- [ ] TTI < 3s
- [ ] LCP < 2.5s
- [ ] Lighthouse Score > 90

### SEO
- [ ] Meta tag presenti nel HTML iniziale
- [ ] Structured data validato (Google Rich Results Test)
- [ ] Sitemap generata correttamente
- [ ] Social sharing preview funzionante

### Funzionalità
- [ ] Tutte le pagine funzionanti
- [ ] Checkout funzionante
- [ ] Webhook Stripe funzionante
- [ ] Integrazione Odoo funzionante

## ⚠️ Rischi e Mitigazioni

### Rischio 1: Breaking Changes
**Mitigazione**: 
- Mantenere branch `main` funzionante
- Deploy su branch separato
- Feature flag per switch graduale

### Rischio 2: Performance Degradation
**Mitigazione**:
- Monitoraggio continuo con Vercel Analytics
- A/B testing se necessario
- Rollback plan pronto

### Rischio 3: SEO Temporaneo
**Mitigazione**:
- 301 redirect da vecchi URL
- Sitemap aggiornata immediatamente
- Google Search Console monitoring

## 🚀 Timeline

**Totale: 18-25 giorni lavorativi (3.5-5 settimane)**

- Settimana 1: Setup + Routing base
- Settimana 2: Data Fetching + SEO
- Settimana 3: API Routes + Ottimizzazioni
- Settimana 4: Testing + Deploy
- Settimana 5: Buffer per imprevisti

## 📝 Checklist Pre-Migrazione

- [ ] Backup completo del codice
- [ ] Documentazione funzionalità esistenti
- [ ] Test suite esistente funzionante
- [ ] Variabili d'ambiente documentate
- [ ] Accesso a Vercel/Supabase/Stripe verificato

## 🎯 Post-Migrazione

### Ottimizzazioni Future
1. **Edge Functions**: Spostare logica pesante su Edge
2. **React Server Components**: Massimizzare uso RSC
3. **Streaming SSR**: Per pagine con dati lenti
4. **Partial Prerendering**: Per pagine ibride

### Monitoraggio
- Vercel Analytics
- Google Search Console
- Lighthouse CI
- Sentry per errori

---

**Prossimi Passi**: Iniziare con Fase 1 (Setup) e procedere gradualmente.


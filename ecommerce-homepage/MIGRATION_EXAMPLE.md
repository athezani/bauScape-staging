# Esempio Concreto: Migrazione ExperiencesPage

Questo documento mostra come migrare una pagina da React Router (SPA) a Next.js (SSR/SSG).

## 📄 Pagina Originale (SPA)

### `src/pages/ExperiencesPage.tsx` (Attuale)

```typescript
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/ProductCard';

interface ExperiencesPageProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  onProductClick: (product: Product) => void;
  onNavigate: (view: string) => void;
}

export function ExperiencesPage({
  products,
  loading,
  error,
  onProductClick,
  onNavigate,
}: ExperiencesPageProps) {
  const experiences = products.filter(p => p.type === 'experience');

  if (loading) {
    return <div>Caricamento...</div>;
  }

  if (error) {
    return <div>Errore: {error}</div>;
  }

  return (
    <div>
      <h1>Esperienze</h1>
      {experiences.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={() => onProductClick(product)}
        />
      ))}
    </div>
  );
}
```

## 🚀 Versione Next.js

### `app/esperienze/page.tsx` (Server Component)

```typescript
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { mapRowToProduct } from '@/lib/productMapper';
import { ExperiencesPageClient } from '@/components/ExperiencesPageClient';
import type { Metadata } from 'next';
import type { Product } from '@/types/product';

// Metadata per SEO - Server-side!
export const metadata: Metadata = {
  title: 'Esperienze Dog-Friendly | FlixDog',
  description: 'Scopri esperienze uniche per te e il tuo cane. Attività, escursioni e avventure dog-friendly in tutta Italia.',
  openGraph: {
    title: 'Esperienze Dog-Friendly | FlixDog',
    description: 'Scopri esperienze uniche per te e il tuo cane.',
    type: 'website',
    url: 'https://flixdog.com/esperienze',
    images: ['https://flixdog.com/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Esperienze Dog-Friendly | FlixDog',
    description: 'Scopri esperienze uniche per te e il tuo cane.',
  },
};

// ISR: Rigenera ogni 60 secondi
export const revalidate = 60;

// Server Component - Fetch dati lato server
export default async function ExperiencesPage() {
  const supabase = await getSupabaseServerClient();

  try {
    // Fetch diretto dal server - no loading state necessario!
    const { data, error } = await supabase
      .from('experience')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching experiences:', error);
      // In Next.js puoi fare redirect o mostrare error page
      throw new Error('Failed to load experiences');
    }

    // Mappa i dati (riutilizza funzione esistente)
    const products: Product[] = (data || []).map(row =>
      mapRowToProduct(row, 'experience')
    );

    // Passa dati al Client Component per interattività
    return <ExperiencesPageClient products={products} />;
  } catch (error) {
    // Error boundary o pagina di errore
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Errore</h1>
          <p>Impossibile caricare le esperienze. Riprova più tardi.</p>
        </div>
      </div>
    );
  }
}
```

### `src/components/ExperiencesPageClient.tsx` (Client Component)

```typescript
'use client'; // IMPORTANTE: Indica che è un Client Component

import { useRouter } from 'next/navigation';
import { ProductCard } from './ProductCard';
import { Header } from './Header';
import { Footer } from './Footer';
import type { Product } from '@/types/product';

interface ExperiencesPageClientProps {
  products: Product[];
}

export function ExperiencesPageClient({ products }: ExperiencesPageClientProps) {
  const router = useRouter();

  const handleProductClick = (product: Product) => {
    // Next.js navigation
    router.push(`/prodotto/${product.type}/${product.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (view: string) => {
    if (view === 'home') {
      router.push('/');
    } else if (view === 'experiences') {
      router.push('/esperienze');
    } else if (view === 'trips') {
      router.push('/viaggi');
    } else if (view === 'classes') {
      router.push('/classi');
    } else if (view === 'contacts') {
      router.push('/contatti');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Header onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Esperienze</h1>
        
        {products.length === 0 ? (
          <p>Nessuna esperienza disponibile al momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => handleProductClick(product)}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
```

## 🔄 Differenze Chiave

### 1. Data Fetching

**Prima (SPA)**:
- Hook `useProducts()` nel componente
- Fetch client-side dopo mount
- Loading state necessario
- Error handling nel componente

**Dopo (Next.js)**:
- Fetch server-side in `page.tsx`
- Dati disponibili immediatamente
- No loading state (già caricati)
- Error handling con try/catch o error.tsx

### 2. Routing

**Prima (SPA)**:
```typescript
const navigate = useNavigate();
navigate('/prodotto/experience/123');
```

**Dopo (Next.js)**:
```typescript
const router = useRouter();
router.push('/prodotto/experience/123');
```

### 3. SEO

**Prima (SPA)**:
```typescript
// SEOHead component con useEffect
<SEOHead
  title="Esperienze"
  description="..."
/>
```

**Dopo (Next.js)**:
```typescript
// generateMetadata export
export const metadata: Metadata = {
  title: 'Esperienze',
  description: '...',
};
```

### 4. Performance

**Prima (SPA)**:
- HTML vuoto iniziale
- JavaScript deve caricare e eseguire
- Fetch dati dopo mount
- Meta tag aggiornati via JS

**Dopo (Next.js)**:
- HTML completo con dati
- Meta tag nel HTML iniziale
- Dati già disponibili
- ISR: cache con revalidazione

## 📊 Benefici Ottenuti

1. **SEO**: Meta tag nel HTML iniziale
2. **Performance**: FCP più veloce (dati già nel HTML)
3. **Scalabilità**: ISR gestisce traffico alto
4. **Social Sharing**: Open Graph funziona perfettamente

## 🎯 Checklist Migrazione

- [ ] Creare `app/esperienze/page.tsx` (Server Component)
- [ ] Creare `src/components/ExperiencesPageClient.tsx` (Client Component)
- [ ] Spostare logica interattiva in Client Component
- [ ] Aggiungere `generateMetadata` per SEO
- [ ] Configurare `revalidate` per ISR
- [ ] Testare fetch dati
- [ ] Testare navigazione
- [ ] Verificare meta tag nel HTML
- [ ] Testare social sharing preview

## 🔗 Prossimi Esempi

- **Pagina Prodotto**: `/prodotto/[type]/[id]` (più complessa, con dynamic routes)
- **Checkout**: Client Component puro (molta interattività)
- **Home**: Fetch multipli, ISR, metadata dinamico


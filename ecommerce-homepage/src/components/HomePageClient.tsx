'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Header } from './Header';
import { Hero } from './Hero';
import { ProductCard } from './ProductCard';
import { MobileMenu } from './MobileMenu';
import type { Product } from '../types/product';

// Lazy load componenti sotto la fold per migliorare TTI
const ValueSection = dynamic(() => import('./ValueSection').then(mod => ({ default: mod.ValueSection })), {
  ssr: true, // Mantieni SSR per SEO
});

const FooterNext = dynamic(() => import('./FooterNext').then(mod => ({ default: mod.FooterNext })), {
  ssr: true, // Mantieni SSR per SEO
});

interface HomePageClientProps {
  products: Product[];
  error: string | null;
}

export function HomePageClient({ products, error: initialError }: HomePageClientProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(9);
  
  // Filter out classes from all products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => p.type !== 'class');
  }, [products]);
  
  // Show products up to displayCount, sorted by most recent first (already sorted from server)
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, displayCount);
  }, [filteredProducts, displayCount]);
  
  const hasMoreProducts = filteredProducts.length > displayCount;

  const handleShowMore = () => {
    setDisplayCount(prev => prev + 9);
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

  const handleProductClick = (product: Product) => {
    router.push(`/prodotto/${product.type}/${product.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      <Header 
        onMenuClick={() => setIsMenuOpen(true)}
        onNavigate={handleNavigate}
      />
      <MobileMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        onNavigate={handleNavigate}
      />
      
      <Hero 
        title="Non sono solo attività. Sono ricordi."
        subtitle="Esperienze e viaggi pet-friendly da vivere con il tuo cane"
        ctaText="Inizia l'avventura"
        onCtaClick={() => router.push('/esperienze')}
        imageUrl="/images/webp/Checco_from_Pixelcut.webp"
      />

      {/* Featured Products Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="mb-8 space-y-2">
            <h2 className="mb-2">
              Prodotti in Evidenza
            </h2>
            <p style={{ color: 'var(--text-gray)' }}>
              Scopri le nostre esperienze e viaggi più amati
            </p>
            {initialError && (
              <p className="text-sm text-red-500">
                {initialError}
              </p>
            )}
          </div>

          {displayedProducts.length === 0 && !initialError && (
            <p className="text-center" style={{ color: 'var(--text-gray)' }}>
              Nessun prodotto disponibile al momento.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {displayedProducts.map((product) => (
              <ProductCard 
                key={`${product.type}-${product.id}`} 
                product={product}
                onClick={handleProductClick}
              />
            ))}
          </div>
          
          {!initialError && hasMoreProducts && (
            <div className="text-center pt-8 lg:pt-20">
                <button
                  onClick={handleShowMore}
                  className="px-8 py-3 rounded-full font-semibold transition-all hover:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ 
                    backgroundColor: '#F8AA5C',
                    color: '#1A0841',
                    fontWeight: 700,
                    boxShadow: '0 10px 24px rgba(8, 2, 20, 0.45)'
                  }}
                >
                  Mostra altro
                </button>
            </div>
          )}
        </div>
      </section>

      <ValueSection />

      {/* CTA Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-4">
          <div 
            className="rounded-3xl p-8 lg:p-16 text-center"
            style={{ 
              backgroundColor: 'var(--primary-purple)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)'
            }}
          >
            <h2 className="mb-4" style={{ color: '#FFFFFF' }}>
              È il momento di partire
            </h2>
            <p className="mb-8 max-w-2xl mx-auto" style={{ color: '#FFFFFF' }}>
              Scopri le esperienze e le attività pensate per te e il tuo cane.
            </p>
            <button 
              onClick={() => router.push('/esperienze')}
              className="px-8 py-3 rounded-full font-semibold transition-all hover:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ 
                backgroundColor: '#F8AA5C',
                color: '#1A0841',
                fontWeight: 700,
                boxShadow: '0 10px 24px rgba(8, 2, 20, 0.45)'
              }}
            >
              Scopri Tutte le Avventure
            </button>
          </div>
        </div>
      </section>

      <FooterNext />
    </div>
  );
}


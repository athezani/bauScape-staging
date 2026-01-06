'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from './Header';
import { FooterNext } from './FooterNext';
import { MobileMenu } from './MobileMenu';
import { ProductCard } from './ProductCard';
import type { Product } from '../types/product';
import { ArrowUpDown } from 'lucide-react';

type SortOption = 'price-asc' | 'price-desc';

interface ClassesPageClientProps {
  products: Product[];
  error: string | null;
}

export function ClassesPageClient({ products, error: initialError }: ClassesPageClientProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('price-asc');

  const classes = useMemo(() => {
    const filtered = products.filter((p) => p.type === 'class');
    
    return [...filtered].sort((a, b) => {
      const priceA = a.price ?? 0;
      const priceB = b.price ?? 0;
      
      if (sortBy === 'price-asc') {
        return priceA - priceB;
      } else {
        return priceB - priceA;
      }
    });
  }, [products, sortBy]);

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

      {/* Hero Section */}
      <section className="py-12 lg:py-16 bg-gradient-to-b from-purple-50 to-white">
        <div className="max-w-[1200px] mx-auto px-4">
          <h1 className="mb-4 text-center" style={{ color: 'var(--primary-purple)' }}>
            Classi Dog-Friendly
          </h1>
          <p className="text-center max-w-2xl mx-auto" style={{ color: 'var(--text-gray)' }}>
            Scopri tutte le nostre classi pensate per te e il tuo amico a quattro zampe
          </p>
        </div>
      </section>

      {/* Sort */}
      <section className="py-6 border-b border-gray-100 sticky top-[73px] bg-white z-30">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="flex items-center justify-end gap-3">
            <div className="flex items-center gap-2" style={{ color: 'var(--text-gray)' }}>
              <ArrowUpDown className="w-4 h-4" />
              <span className="text-sm">Ordina per prezzo:</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-semibold"
              style={{ color: 'var(--text-dark)' }}
            >
              <option value="price-asc">Crescente</option>
              <option value="price-desc">Decrescente</option>
            </select>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12 lg:py-16">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="mb-6 space-y-2">
            <p style={{ color: 'var(--text-gray)' }}>
              {classes.length} classi disponibili
            </p>
            {initialError && (
              <p className="text-sm text-red-500">
                {initialError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {classes.map((product) => (
              <ProductCard 
                key={`${product.type}-${product.id}`} 
                product={product}
                onClick={handleProductClick}
              />
            ))}
          </div>
        </div>
      </section>

      <FooterNext />
    </div>
  );
}


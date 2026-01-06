import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { MobileMenu } from '../components/MobileMenu';
import { ProductCard } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';
import type { Product } from '../types/product';
import { ArrowUpDown } from 'lucide-react';

type SortOption = 'price-asc' | 'price-desc';

interface TripsPageProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  onProductClick: (product: Product) => void;
  onNavigate: (view: string) => void;
}

export function TripsPage({
  products,
  loading,
  error,
  onProductClick,
  onNavigate,
}: TripsPageProps) {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('price-asc');

  const trips = useMemo(() => {
    const filtered = products.filter((p) => p.type === 'trip');
    
    // Sort by price
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

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title="Viaggi con Cani - FlixDog"
        description="Viaggi indimenticabili per te e il tuo cane. Destinazioni dog-friendly, strutture accoglienti e esperienze uniche in tutta Italia. Prenota il tuo viaggio oggi!"
        url={`https://flixdog.com${location.pathname}`}
        type="website"
      />
      <Header 
        onMenuClick={() => setIsMenuOpen(true)} 
        onNavigate={onNavigate}
      />
      <MobileMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        onNavigate={onNavigate}
      />

      {/* Hero Section */}
      <section className="py-12 lg:py-16 bg-gradient-to-b from-purple-50 to-white">
        <div className="max-w-[1200px] mx-auto px-4">
          <h1 className="mb-4 text-center" style={{ color: 'var(--primary-purple)' }}>
            Viaggi Dog-Friendly
          </h1>
          <p className="text-center max-w-2xl mx-auto" style={{ color: 'var(--text-gray)' }}>
            Scopri tutti i nostri viaggi pensati per te e il tuo amico a quattro zampe
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
              {trips.length} viaggi disponibili
            </p>
            {loading && (
              <p className="text-sm" style={{ color: 'var(--text-gray)' }}>
                Caricamento dei viaggi...
              </p>
            )}
            {error && (
              <p className="text-sm text-red-500">
                {error}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {trips.map((product) => (
              <ProductCard 
                key={`${product.type}-${product.id}`} 
                product={product}
                onClick={onProductClick}
              />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}


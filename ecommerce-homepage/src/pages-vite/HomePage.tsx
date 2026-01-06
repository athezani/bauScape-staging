import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { ProductCard } from '../components/ProductCard';
import { SEOHead } from '../components/SEOHead';
import type { Product } from '../types/product';
import { ValueSection } from '../components/ValueSection';
import { Footer } from '../components/Footer';
import { MobileMenu } from '../components/MobileMenu';

interface HomePageProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  onProductClick: (product: Product) => void;
  onNavigate: (view: string) => void;
}

export function HomePage({ products, loading, error, onProductClick, onNavigate }: HomePageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(9);
  
  // Show products up to displayCount, sorted by most recent first (already sorted in useProducts)
  const displayedProducts = useMemo(() => {
    return products.slice(0, displayCount);
  }, [products, displayCount]);

  const hasMoreProducts = products.length > displayCount;

  const handleShowMore = () => {
    setDisplayCount(prev => prev + 9);
  };

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title="Viaggi Organizzati con Cane | Vacanze Dog Friendly Italia | FlixDog"
        description="Scopri esperienze uniche e tour di gruppo per il tuo binomio cane-proprietario. Le migliori vacanze dog friendly in Italia, tutto organizzato per voi. Prenota ora!"
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
      
      <Hero 
        title="Non sono solo attività. Sono ricordi."
        subtitle="Esperienze e viaggi pet-friendly da vivere con il tuo cane"
        ctaText="Inizia l'avventura"
        onCtaClick={() => navigate('/esperienze')}
        imageUrl="/hero-image.jpg"
      />

      {/* Featured Products Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="mb-8 space-y-2">
            <h2 className="mb-2">
              Prodotti in Evidenza
            </h2>
            <p style={{ color: 'var(--text-gray)' }}>
              Scopri le nostre esperienze, classi e viaggi più amati
            </p>
            {loading && (
              <p className="text-sm" style={{ color: 'var(--text-gray)' }}>
                Caricamento dei prodotti...
              </p>
            )}
            {error && (
              <p className="text-sm text-red-500">
                {error}
              </p>
            )}
          </div>

          {displayedProducts.length === 0 && !loading && (
            <p className="text-center" style={{ color: 'var(--text-gray)' }}>
              Nessun prodotto disponibile al momento.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {displayedProducts.map((product) => (
              <ProductCard 
                key={`${product.type}-${product.id}`} 
                product={product}
                onClick={onProductClick}
              />
            ))}
          </div>
          
          {!loading && hasMoreProducts && (
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

      <Footer />
    </div>
  );
}
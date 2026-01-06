import { useState, useMemo } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { MobileMenu } from '../components/MobileMenu';
import { ProductCard } from '../components/ProductCard';
import type { Product, ProductType } from '../types/product';
import { Filter, X } from 'lucide-react';

interface AllProductsPageProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  onProductClick: (product: Product) => void;
  onNavigate: (view: string) => void;
}

type SortOption = 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';

export function AllProductsPage({
  products,
  loading,
  error,
  onProductClick,
  onNavigate,
}: AllProductsPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<ProductType[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');

  // Get unique locations from products
  const locations = useMemo(() => {
    const locs = products
      .map((p) => p.location)
      .filter((loc): loc is string => Boolean(loc));
    return Array.from(new Set(locs)).sort();
  }, [products]);

  // Get max price for price range filter
  const maxPrice = useMemo(() => {
    const prices = products
      .map((p) => p.price)
      .filter((price): price is number => typeof price === 'number' && price > 0);
    return prices.length > 0 ? Math.max(...prices) : 1000;
  }, [products]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // Filter by type
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((p) => selectedTypes.includes(p.type));
    }

    // Filter by location
    if (selectedLocation) {
      filtered = filtered.filter((p) => p.location === selectedLocation);
    }

    // Filter by price range
    filtered = filtered.filter((p) => {
      const price = p.price ?? 0;
      return price >= priceRange.min && price <= priceRange.max;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return (a.price ?? 0) - (b.price ?? 0);
        case 'price-desc':
          return (b.price ?? 0) - (a.price ?? 0);
        case 'name-asc':
          return a.title.localeCompare(b.title, 'it');
        case 'name-desc':
          return b.title.localeCompare(a.title, 'it');
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, selectedTypes, selectedLocation, priceRange, sortBy]);

  const toggleType = (type: ProductType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedLocation('');
    setPriceRange({ min: 0, max: maxPrice });
    setSortBy('name-asc');
  };

  const hasActiveFilters = selectedTypes.length > 0 || selectedLocation !== '' || priceRange.min > 0 || priceRange.max < maxPrice;

  return (
    <div className="min-h-screen bg-white">
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
            Tutti i Prodotti
          </h1>
          <p className="text-center max-w-2xl mx-auto" style={{ color: 'var(--text-gray)' }}>
            Esplora tutte le nostre esperienze, classi e viaggi disponibili
          </p>
        </div>
      </section>

      {/* Filters Section */}
      <section className="py-6 border-b border-gray-100 bg-white sticky top-[73px] z-30">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="space-y-4">
            {/* Filter Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2" style={{ color: 'var(--text-gray)' }}>
                <Filter className="w-5 h-5" />
                <span className="font-medium">Filtri</span>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-sm px-3 py-1 rounded-full hover:bg-gray-100 transition-colors font-semibold"
                  style={{ color: 'var(--primary-purple)' }}
                >
                  <X className="w-4 h-4" />
                  Rimuovi filtri
                </button>
              )}
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark)' }}>
                Tipologia
              </label>
              <div className="flex flex-wrap gap-2">
                {(['experience', 'class', 'trip'] as ProductType[]).map((type) => {
                  const labels: Record<ProductType, string> = {
                    experience: 'Esperienze',
                    class: 'Classi',
                    trip: 'Viaggi',
                  };
                  const isSelected = selectedTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`px-4 py-2 rounded-full text-sm transition-all font-semibold ${
                        isSelected
                          ? 'text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      style={
                        isSelected
                          ? { backgroundColor: 'var(--primary-purple)' }
                          : { color: 'var(--text-dark)' }
                      }
                    >
                      {labels[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark)' }}>
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full max-w-xs"
                style={{ color: 'var(--text-dark)' }}
              >
                <option value="">Tutte le location</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark)' }}>
                Prezzo: €{priceRange.min} - €{priceRange.max}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max={maxPrice}
                  value={priceRange.min}
                  onChange={(e) => setPriceRange((prev) => ({ ...prev, min: Number(e.target.value) }))}
                  className="flex-1"
                />
                <input
                  type="range"
                  min="0"
                  max={maxPrice}
                  value={priceRange.max}
                  onChange={(e) => setPriceRange((prev) => ({ ...prev, max: Number(e.target.value) }))}
                  className="flex-1"
                />
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-gray)' }}>
                <span>€0</span>
                <span>€{maxPrice}</span>
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark)' }}>
                Ordina per
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full max-w-xs"
                style={{ color: 'var(--text-dark)' }}
              >
                <option value="name-asc">Nome (A-Z)</option>
                <option value="name-desc">Nome (Z-A)</option>
                <option value="price-asc">Prezzo (crescente)</option>
                <option value="price-desc">Prezzo (decrescente)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12 lg:py-16">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="mb-6 space-y-2">
            <p style={{ color: 'var(--text-gray)' }}>
              {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'prodotto trovato' : 'prodotti trovati'}
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

          {filteredAndSortedProducts.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: 'var(--text-gray)' }} className="mb-4">
                Nessun prodotto trovato con i filtri selezionati.
              </p>
              <button
                onClick={clearFilters}
                className="px-6 py-2 rounded-full text-white font-semibold"
                style={{ backgroundColor: 'var(--primary-purple)' }}
              >
                Rimuovi filtri
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {filteredAndSortedProducts.map((product) => (
                <ProductCard 
                  key={`${product.type}-${product.id}`} 
                  product={product}
                  onClick={onProductClick}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}


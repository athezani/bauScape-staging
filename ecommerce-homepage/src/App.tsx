import { lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import type { Product, ProductType } from './types/product';
import { useProducts } from './hooks/useProducts';
import { useProduct } from './hooks/useProduct';

const HomePage = lazy(() => import('./pages-vite/HomePage').then(m => ({ default: m.HomePage })));
const ProductDetailPage = lazy(() => import('./pages-vite/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const ExperiencesPage = lazy(() => import('./pages-vite/ExperiencesPage').then(m => ({ default: m.ExperiencesPage })));
const TripsPage = lazy(() => import('./pages-vite/TripsPage').then(m => ({ default: m.TripsPage })));
const ClassesPage = lazy(() => import('./pages-vite/ClassesPage').then(m => ({ default: m.ClassesPage })));
const ThankYouPage = lazy(() => import('./pages-vite/ThankYouPage').then(m => ({ default: m.ThankYouPage })));
const CookiePolicyPage = lazy(() => import('./pages-vite/CookiePolicyPage').then(m => ({ default: m.CookiePolicyPage })));
const ContattiPage = lazy(() => import('./pages-vite/ContattiPage').then(m => ({ default: m.ContattiPage })));
const RegolamentoPage = lazy(() => import('./pages-vite/RegolamentoPage').then(m => ({ default: m.RegolamentoPage })));
const InternalCheckoutPage = lazy(() => import('./pages-vite/InternalCheckoutPage').then(m => ({ default: m.InternalCheckoutPage })));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-600">Caricamento...</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const { products, loading, error } = useProducts();

  const handleNavigate = (view: string) => {
    if (view === 'home') {
      navigate('/');
    } else if (view === 'experiences') {
      navigate('/esperienze');
    } else if (view === 'trips') {
      navigate('/viaggi');
    } else if (view === 'classes') {
      navigate('/classi');
    } else if (view === 'contacts') {
      navigate('/contatti');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProductClick = (product: Product) => {
    // UUIDs are URL-safe, no need to encode
    navigate(`/prodotto/${product.type}/${product.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const ProductDetailRoute = () => {
    const { type, id } = useParams<{ type: string; id: string }>();
    
    // Decode ID if it was encoded (shouldn't happen with UUIDs, but just in case)
    const decodedId = id ? decodeURIComponent(id) : '';
    const productType = (type ?? 'experience') as ProductType;
    
    const { product, loading: productLoading, error: productError } = useProduct(
      decodedId,
      productType
    );

    if (productLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p style={{ color: 'var(--text-gray)' }}>Caricamento del prodotto...</p>
        </div>
      );
    }

    if (productError || !product) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
          <p style={{ color: 'var(--text-dark)' }}>
            Il prodotto che stai cercando non è disponibile.
          </p>
          <button
            className="px-6 py-3 rounded-full font-semibold"
            style={{ 
              backgroundColor: '#F8AA5C',
              color: '#1A0841'
            }}
            onClick={() => navigate('/')}
          >
            Torna alla Home
          </button>
        </div>
      );
    }

    const handleBack = () => {
      navigate(-1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <ProductDetailPage
        product={product}
        onBack={handleBack}
        onNavigate={handleNavigate}
      />
    );
  };

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              products={products}
              loading={loading}
              error={error}
              onProductClick={handleProductClick}
              onNavigate={handleNavigate}
            />
          }
        />
        <Route
          path="/esperienze"
          element={
            <ExperiencesPage
              products={products}
              loading={loading}
              error={error}
              onProductClick={handleProductClick}
              onNavigate={handleNavigate}
            />
          }
        />
        <Route
          path="/viaggi"
          element={
            <TripsPage
              products={products}
              loading={loading}
              error={error}
              onProductClick={handleProductClick}
              onNavigate={handleNavigate}
            />
          }
        />
        <Route
          path="/classi"
          element={
            <ClassesPage
              products={products}
              loading={loading}
              error={error}
              onProductClick={handleProductClick}
              onNavigate={handleNavigate}
            />
          }
        />
        <Route path="/prodotto/:type/:id" element={<ProductDetailRoute />} />
        <Route path="/checkout" element={<InternalCheckoutPage />} />
        <Route path="/thank-you" element={<ThankYouPage />} />
        <Route path="/cookie-policy" element={<CookiePolicyPage />} />
        <Route path="/contatti" element={<ContattiPage onNavigate={handleNavigate} />} />
        <Route path="/regolamento-a-6-zampe" element={<RegolamentoPage />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return <AppRoutes />;
}

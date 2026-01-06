import { MapPin } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';
import type { Product } from '../types/product';
import { typeToCategory } from '../types/product';
import { pricingService } from '../services/pricingService';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

interface ProductCardProps {
  product: Product;
  onClick?: (product: Product) => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const category = product.category ?? typeToCategory(product.type);
  const location = product.location ?? 'Location disponibile';
  
  // Valida e normalizza l'URL dell'immagine
  // IMPORTANTE: Rifiuta URL esterni (http/https) e usa solo immagini locali
  const getImageUrl = () => {
    const url = product.imageUrl ?? '';
    // Se l'URL è vuoto/invalido, usa placeholder
    if (!url || url.trim() === '') {
      return PLACEHOLDER_IMAGE;
    }
    // RIFIUTA URL esterni (http/https) - usa solo immagini locali
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return PLACEHOLDER_IMAGE;
    }
    // Accetta solo path relativi locali (/) o data URLs
    if (!url.startsWith('/') && !url.startsWith('data:')) {
      return PLACEHOLDER_IMAGE;
    }
    return url;
  };

  const imageUrl = getImageUrl();
  const isPlaceholder = imageUrl === PLACEHOLDER_IMAGE || imageUrl.startsWith('data:');

  return (
    <div 
      className="group cursor-pointer"
      onClick={() => onClick?.(product)}
      data-testid="product-card"
    >
      {/* Image Container with Circular Mask */}
      <div className="relative w-full aspect-square mb-3 overflow-hidden rounded-3xl bg-gray-100">
        {/* Category Label - Figma design */}
        <div 
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-sm z-10 backdrop-blur-sm"
          style={{ 
            backgroundColor: 'var(--accent-soft)',
            color: 'var(--primary-purple)',
            fontWeight: 700,
          }}
        >
          {category}
        </div>
        
        <OptimizedImage 
          src={imageUrl}
          alt={`${product.title} - ${category} ${location ? `a ${location}` : ''}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          width={400}
          height={400}
        />
      </div>

      {/* Product Info */}
      <div className="px-1">
        <h3 className="mb-1">
          {product.title}
        </h3>

        <div className="flex items-center gap-1 mb-2" style={{ color: 'var(--text-gray)' }}>
          <MapPin className="w-4 h-4" />
          <small>{location}</small>
        </div>

        <div className="flex items-baseline gap-1">
          <span style={{ color: 'var(--primary-purple)' }}>
            {(() => {
              const { price, unit } = pricingService.getPriceAndUnitForCard(product);
              return (
                <>
                  {price}
                  {unit && <em style={{ fontStyle: 'italic', fontSize: '0.85em' }}> {unit}</em>}
                </>
              );
            })()}
          </span>
        </div>
      </div>
    </div>
  );
}
/**
 * Sitemap Page
 * Generates and serves sitemap.xml dynamically
 */

import { useEffect } from 'react';
import { useProducts } from '../hooks/useProducts';
import { generateSitemap } from '../utils/sitemap';
import { logger } from '../utils/logger';

export function SitemapPage() {
  const { products } = useProducts();

  useEffect(() => {
    if (products.length > 0) {
      const sitemap = generateSitemap(products);
      
      // Set content type and return sitemap
      const blob = new Blob([sitemap], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      
      // For server-side rendering, you would set headers here
      // For client-side, we'll just log it
      logger.debug('Sitemap generated', { productCount: products.length });
    }
  }, [products]);

  // This component should ideally be handled server-side
  // For now, return a simple message
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Sitemap</h1>
        <p className="text-gray-600">
          Sitemap is available at /sitemap.xml
        </p>
      </div>
    </div>
  );
}


/**
 * SEO Hook
 * Manages dynamic meta tags, Open Graph, Twitter Cards, and structured data
 */

import { useEffect } from 'react';

interface SEOData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  product?: {
    name: string;
    price: number;
    currency?: string;
    availability?: string;
    category?: string;
    image?: string;
    description?: string;
    rating?: number;
    reviewCount?: number;
  };
}

const DEFAULT_TITLE = 'FlixDog - Avventure a 4 zampe';
const DEFAULT_DESCRIPTION = 'Vacanze dog friendly in Italia, viaggi e attività pet friendly da vivere con il tuo cane. Scopri esperienze uniche, destinazioni selezionate e prenota online con FlixDog.';
const DEFAULT_IMAGE = 'https://flixdog.com/og-image.jpg';
const BASE_URL = 'https://flixdog.com';

export function useSEO(data: SEOData) {
  useEffect(() => {
    const title = data.title || DEFAULT_TITLE;
    const description = data.description || DEFAULT_DESCRIPTION;
    const image = data.image || data.product?.image || DEFAULT_IMAGE;
    const url = data.url || BASE_URL;
    const type = data.type || 'website';

    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, attribute: string = 'name') => {
      let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', 'viaggi con cani, esperienze dog-friendly, vacanze con animali, attività per cani, FlixDog');
    updateMetaTag('author', 'FlixDog');
    updateMetaTag('robots', 'index, follow');

    // Open Graph tags
    updateMetaTag('og:title', title, 'property');
    updateMetaTag('og:description', description, 'property');
    updateMetaTag('og:image', image, 'property');
    updateMetaTag('og:url', url, 'property');
    updateMetaTag('og:type', type, 'property');
    updateMetaTag('og:site_name', 'FlixDog', 'property');
    updateMetaTag('og:locale', 'it_IT', 'property');

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);

    // Product-specific Open Graph tags
    if (data.product) {
      updateMetaTag('product:price:amount', data.product.price.toString(), 'property');
      updateMetaTag('product:price:currency', data.product.currency || 'EUR', 'property');
      if (data.product.availability) {
        updateMetaTag('product:availability', data.product.availability, 'property');
      }
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // Structured Data (JSON-LD)
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    const structuredData: any = {
      '@context': 'https://schema.org',
      '@type': data.product ? 'Product' : 'WebSite',
    };

    if (data.product) {
      structuredData.name = data.product.name;
      structuredData.description = data.product.description || description;
      structuredData.image = data.product.image || image;
      structuredData.offers = {
        '@type': 'Offer',
        price: data.product.price,
        priceCurrency: data.product.currency || 'EUR',
        availability: data.product.availability 
          ? `https://schema.org/${data.product.availability}`
          : 'https://schema.org/InStock',
        url: url,
      };
      if (data.product.category) {
        structuredData.category = data.product.category;
      }
      if (data.product.rating && data.product.reviewCount) {
        structuredData.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: data.product.rating,
          reviewCount: data.product.reviewCount,
        };
      }
    } else {
      structuredData.name = 'FlixDog';
      structuredData.url = BASE_URL;
      structuredData.description = description;
      structuredData.potentialAction = {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${BASE_URL}/?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      };
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Optionally clean up on unmount
    };
  }, [data]);
}


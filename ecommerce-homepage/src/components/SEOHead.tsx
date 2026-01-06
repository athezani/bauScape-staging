/**
 * SEO Head Component
 * Manages SEO meta tags and structured data for each page
 */

import { useEffect } from 'react';
import type { Product } from '../types/product';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  product?: Product;
  type?: 'website' | 'product';
}

export function SEOHead({ 
  title, 
  description, 
  image, 
  url, 
  product,
  type = 'website'
}: SEOHeadProps) {
  useEffect(() => {
    const fullTitle = title || 'FlixDog - Avventure a 4 zampe';
    const fullDescription = description || 
      'Vacanze dog friendly in Italia, viaggi e attività pet friendly da vivere con il tuo cane. Scopri esperienze uniche, destinazioni selezionate e prenota online con FlixDog.';
    const fullImage = image || product?.imageUrl || 'https://flixdog.com/og-image.jpg';
    const fullUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://flixdog.com');
    const baseUrl = 'https://flixdog.com';

    // Update document title
    document.title = fullTitle;

    // Helper to update or create meta tags
    const updateMetaTag = (name: string, content: string, attribute: string = 'name') => {
      let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Basic SEO meta tags
    updateMetaTag('description', fullDescription);
    updateMetaTag('keywords', 'viaggi con cani, esperienze dog-friendly, vacanze con animali, attività per cani, FlixDog, prenotazioni online');
    updateMetaTag('author', 'FlixDog');
    updateMetaTag('robots', 'index, follow');
    updateMetaTag('viewport', 'width=device-width, initial-scale=1.0');

    // Open Graph tags
    updateMetaTag('og:title', fullTitle, 'property');
    updateMetaTag('og:description', fullDescription, 'property');
    updateMetaTag('og:image', fullImage, 'property');
    updateMetaTag('og:url', fullUrl, 'property');
    updateMetaTag('og:type', type === 'product' ? 'product' : 'website', 'property');
    updateMetaTag('og:site_name', 'FlixDog', 'property');
    updateMetaTag('og:locale', 'it_IT', 'property');

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', fullTitle);
    updateMetaTag('twitter:description', fullDescription);
    updateMetaTag('twitter:image', fullImage);
    updateMetaTag('twitter:site', '@flixdog_official');

    // Product-specific Open Graph tags
    if (product && type === 'product') {
      const price = product.price || 0;
      updateMetaTag('product:price:amount', price.toString(), 'property');
      updateMetaTag('product:price:currency', 'EUR', 'property');
      updateMetaTag('product:availability', 'in stock', 'property');
      if (product.category) {
        updateMetaTag('product:category', product.category, 'property');
      }
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullUrl);

    // Structured Data (JSON-LD)
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
    existingScripts.forEach(script => script.remove());

    if (product && type === 'product') {
      // Product structured data
      const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description: product.description || fullDescription,
        image: product.imageUrl || fullImage,
        brand: {
          '@type': 'Brand',
          name: 'FlixDog',
        },
        offers: {
          '@type': 'Offer',
          price: product.price || 0,
          priceCurrency: 'EUR',
          availability: 'https://schema.org/InStock',
          url: fullUrl,
          priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        aggregateRating: product.rating && product.reviewCount ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          reviewCount: product.reviewCount,
          bestRating: 5,
          worstRating: 1,
        } : undefined,
        category: product.category || 'Esperienza',
      };

      // Remove undefined fields
      if (!productSchema.aggregateRating) {
        delete productSchema.aggregateRating;
      }

      const productScript = document.createElement('script');
      productScript.type = 'application/ld+json';
      productScript.textContent = JSON.stringify(productSchema);
      document.head.appendChild(productScript);

      // BreadcrumbList structured data
      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: baseUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: product.category || 'Esperienze',
            item: `${baseUrl}/${product.type === 'experience' ? 'esperienze' : product.type === 'trip' ? 'viaggi' : 'classi'}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: product.title,
            item: fullUrl,
          },
        ],
      };

      const breadcrumbScript = document.createElement('script');
      breadcrumbScript.type = 'application/ld+json';
      breadcrumbScript.textContent = JSON.stringify(breadcrumbSchema);
      document.head.appendChild(breadcrumbScript);
    } else {
      // Organization/Website structured data
      const websiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'FlixDog',
        url: baseUrl,
        description: fullDescription,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      };

      const websiteScript = document.createElement('script');
      websiteScript.type = 'application/ld+json';
      websiteScript.textContent = JSON.stringify(websiteSchema);
      document.head.appendChild(websiteScript);

      // Organization schema
      const organizationSchema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'FlixDog',
        url: baseUrl,
        logo: `${baseUrl}/flixdog-logo-dark.png`,
        description: fullDescription,
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'Customer Service',
          email: 'info@flixdog.com',
        },
        sameAs: [
          'https://www.instagram.com/flixdog_official',
        ],
      };

      const orgScript = document.createElement('script');
      orgScript.type = 'application/ld+json';
      orgScript.textContent = JSON.stringify(organizationSchema);
      document.head.appendChild(orgScript);
    }
  }, [title, description, image, url, product, type]);

  return null; // This component doesn't render anything
}


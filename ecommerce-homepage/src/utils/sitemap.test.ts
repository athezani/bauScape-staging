import { describe, it, expect } from 'vitest';
import { generateSitemap } from './sitemap';
import type { Product } from '../types/product';

describe('sitemap', () => {
  const mockProducts: Product[] = [
    {
      id: '1',
      type: 'experience',
      title: 'Test Experience',
      category: 'experience',
    },
    {
      id: '2',
      type: 'class',
      title: 'Test Class',
      category: 'class',
    },
    {
      id: '3',
      type: 'trip',
      title: 'Test Trip',
      category: 'trip',
    },
  ];

  it('should generate sitemap XML', () => {
    const sitemap = generateSitemap(mockProducts);
    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain('<urlset');
  });

  it('should include all products in sitemap', () => {
    const sitemap = generateSitemap(mockProducts);
    expect(sitemap).toContain('/prodotto/experience/1');
    expect(sitemap).toContain('/prodotto/class/2');
    expect(sitemap).toContain('/prodotto/trip/3');
  });

  it('should include base URLs', () => {
    const sitemap = generateSitemap(mockProducts);
    expect(sitemap).toContain('<loc>https://flixdog.com/</loc>');
    expect(sitemap).toContain('<loc>https://flixdog.com/esperienze</loc>');
    expect(sitemap).toContain('<loc>https://flixdog.com/classi</loc>');
    expect(sitemap).toContain('<loc>https://flixdog.com/viaggi</loc>');
  });

  it('should handle empty products array', () => {
    const sitemap = generateSitemap([]);
    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain('<urlset');
  });

  it('should include proper XML namespace', () => {
    const sitemap = generateSitemap(mockProducts);
    expect(sitemap).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });
});




import { describe, it, expect } from 'vitest';
import { mapRowToProduct } from './productMapper';
import type { ProductRow } from '../types/product';

describe('productMapper', () => {
  const baseRow: ProductRow = {
    id: 'test-id',
    name: 'Test Product',
    description: 'Test description',
    price_adult_base: 50,
    price_dog_base: 20,
    pricing_type: 'per_person',
    max_adults: 10,
    max_dogs: 5,
    provider_id: 'provider-1',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
  };

  it('should map experience row to product', () => {
    const row: ProductRow = {
      ...baseRow,
      meeting_point: 'Test Location',
      duration_hours: 2,
      no_adults: false,
    };
    const product = mapRowToProduct(row, 'experience');
    expect(product.id).toBe('test-id');
    expect(product.type).toBe('experience');
    expect(product.title).toBe('Test Product');
    expect(product.location).toBe('Test Location');
    expect(product.durationHours).toBe(2);
    expect(product.noAdults).toBe(false);
  });

  it('should map class row to product', () => {
    const row: ProductRow = {
      ...baseRow,
      meeting_point: 'Test Location',
      duration_hours: 1,
      no_adults: true,
    };
    const product = mapRowToProduct(row, 'class');
    expect(product.type).toBe('class');
    expect(product.noAdults).toBe(true);
  });

  it('should map trip row to product', () => {
    const row: ProductRow = {
      ...baseRow,
      location: 'Test Location',
      duration_days: 3,
      start_date: '2024-01-01',
      end_date: '2024-01-04',
    };
    const product = mapRowToProduct(row, 'trip');
    expect(product.type).toBe('trip');
    expect(product.location).toBe('Test Location');
    expect(product.durationDays).toBe(3);
    expect(product.startDate).toBe('2024-01-01');
    expect(product.endDate).toBe('2024-01-04');
  });

  it('should handle no_adults as boolean true', () => {
    const row: ProductRow = {
      ...baseRow,
      no_adults: true,
    };
    const product = mapRowToProduct(row, 'class');
    expect(product.noAdults).toBe(true);
  });

  it('should handle no_adults as number 1', () => {
    const row: ProductRow = {
      ...baseRow,
      no_adults: 1,
    };
    const product = mapRowToProduct(row, 'class');
    expect(product.noAdults).toBe(true);
  });

  it('should handle no_adults as string "true"', () => {
    const row: ProductRow = {
      ...baseRow,
      no_adults: 'true' as any,
    };
    const product = mapRowToProduct(row, 'class');
    expect(product.noAdults).toBe(true);
  });

  it('should use placeholder image when no image provided', () => {
    const row: ProductRow = {
      ...baseRow,
      images: null,
    };
    const product = mapRowToProduct(row, 'experience');
    expect(product.imageUrl).toBeTruthy();
  });

  it('should use first image from images array', () => {
    const row: ProductRow = {
      ...baseRow,
      images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    };
    const product = mapRowToProduct(row, 'experience');
    expect(product.imageUrl).toBe('https://example.com/image1.jpg');
  });
});




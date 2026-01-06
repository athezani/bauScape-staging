import { describe, it, expect } from 'vitest';
import {
  getPriceForOneAdultOneDog,
  getProductMinimumPrice,
  formatPriceFrom,
} from './priceUtils';
import type { Product } from '../types/product';

describe('priceUtils', () => {
  describe('getPriceForOneAdultOneDog', () => {
    it('should return sum of adult and dog prices', () => {
      expect(getPriceForOneAdultOneDog(50, 20)).toBe(70);
    });

    it('should handle null adult price', () => {
      expect(getPriceForOneAdultOneDog(null, 20)).toBe(20);
    });

    it('should handle null dog price', () => {
      expect(getPriceForOneAdultOneDog(50, null)).toBe(50);
    });

    it('should handle both null prices', () => {
      expect(getPriceForOneAdultOneDog(null, null)).toBe(0);
    });

    it('should handle undefined prices', () => {
      expect(getPriceForOneAdultOneDog(undefined, undefined)).toBe(0);
    });

    it('should return 0 when both prices are 0', () => {
      expect(getPriceForOneAdultOneDog(0, 0)).toBe(0);
    });
  });

  describe('getProductMinimumPrice', () => {
    it('should return dog price only for no_adults classes', () => {
      const product: Product = {
        id: '1',
        type: 'class',
        title: 'Test Class',
        price: 50,
        priceDogBase: 20,
        noAdults: true,
      };
      expect(getProductMinimumPrice(product)).toBe(20);
    });

    it('should return dog price only for no_adults experiences', () => {
      const product: Product = {
        id: '1',
        type: 'experience',
        title: 'Test Experience',
        price: 50,
        priceDogBase: 20,
        noAdults: true,
      };
      expect(getProductMinimumPrice(product)).toBe(20);
    });

    it('should return adult + dog price for trips', () => {
      const product: Product = {
        id: '1',
        type: 'trip',
        title: 'Test Trip',
        price: 50,
        priceDogBase: 20,
        noAdults: false,
      };
      expect(getProductMinimumPrice(product)).toBe(70);
    });

    it('should return adult + dog price for classes without no_adults', () => {
      const product: Product = {
        id: '1',
        type: 'class',
        title: 'Test Class',
        price: 50,
        priceDogBase: 20,
        noAdults: false,
      };
      expect(getProductMinimumPrice(product)).toBe(70);
    });

    it('should handle missing prices', () => {
      const product: Product = {
        id: '1',
        type: 'trip',
        title: 'Test Trip',
        price: undefined,
        priceDogBase: undefined,
      };
      expect(getProductMinimumPrice(product)).toBe(0);
    });
  });

  describe('formatPriceFrom', () => {
    it('should format price correctly', () => {
      expect(formatPriceFrom(50)).toBe('Da €50.00');
    });

    it('should handle zero price', () => {
      expect(formatPriceFrom(0)).toBe('Da €0');
    });

    it('should handle decimal prices with 2 decimal places', () => {
      expect(formatPriceFrom(29.99)).toBe('Da €29.99');
      expect(formatPriceFrom(29.49)).toBe('Da €29.49');
      expect(formatPriceFrom(50.5)).toBe('Da €50.50');
    });
  });
});


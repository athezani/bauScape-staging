/**
 * Tests for Product Images Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  uploadProductImage,
  getProductImages,
  deleteProductImage,
  reorderProductImages,
  getProductImageCount,
} from '../productImages.service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('Product Images Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadProductImage', () => {
    it('should validate product ID', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await expect(
        uploadProductImage('invalid-id', 'experience', file, 0)
      ).rejects.toThrow('Product ID non valido');
    });

    it('should validate product type', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      
      await expect(
        uploadProductImage(validId, 'invalid' as any, file, 0)
      ).rejects.toThrow('Tipo prodotto non valido');
    });

    it('should validate file type', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      
      await expect(
        uploadProductImage(validId, 'experience', file, 0)
      ).rejects.toThrow('Tipo file non supportato');
    });

    it('should validate file size', async () => {
      // Create a file larger than 5MB
      const largeContent = new Array(6 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      
      await expect(
        uploadProductImage(validId, 'experience', file, 0)
      ).rejects.toThrow('File troppo grande');
    });
  });

  describe('getProductImages', () => {
    it('should validate product ID', async () => {
      await expect(
        getProductImages('invalid-id', 'experience')
      ).rejects.toThrow('Product ID non valido');
    });

    it('should validate product type', async () => {
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      
      await expect(
        getProductImages(validId, 'invalid' as any)
      ).rejects.toThrow('Tipo prodotto non valido');
    });
  });

  describe('deleteProductImage', () => {
    it('should validate image ID', async () => {
      await expect(
        deleteProductImage('invalid-id')
      ).rejects.toThrow('Image ID non valido');
    });
  });

  describe('reorderProductImages', () => {
    it('should validate product ID', async () => {
      await expect(
        reorderProductImages('invalid-id', 'experience', [])
      ).rejects.toThrow('Product ID non valido');
    });

    it('should validate product type', async () => {
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      
      await expect(
        reorderProductImages(validId, 'invalid' as any, [])
      ).rejects.toThrow('Tipo prodotto non valido');
    });

    it('should validate image orders array', async () => {
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      
      await expect(
        reorderProductImages(validId, 'experience', [])
      ).rejects.toThrow('Ordine immagini non valido');
    });
  });
});


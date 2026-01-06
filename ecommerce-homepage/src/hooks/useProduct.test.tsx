import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProduct } from './useProduct';
import { getSupabaseClient } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient');

describe('useProduct', () => {
  const mockSupabaseClient = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  };

  beforeEach(() => {
    vi.mocked(getSupabaseClient).mockReturnValue(mockSupabaseClient as any);
  });

  it('should return loading state initially', () => {
    const { result } = renderHook(() => useProduct('test-id', 'experience'));
    expect(result.current.loading).toBe(true);
    expect(result.current.product).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should handle missing id', () => {
    const { result } = renderHook(() => useProduct('', 'experience'));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('ID prodotto mancante');
  });

  it('should handle missing type', () => {
    const { result } = renderHook(() => useProduct('test-id', '' as any));
    expect(result.current.loading).toBe(false);
  });

  it('should fetch product successfully', async () => {
    const mockProduct = {
      id: 'test-id',
      name: 'Test Product',
      description: 'Test description',
      active: true,
      price_adult_base: 50,
      price_dog_base: 20,
    };

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockProduct,
        error: null,
      }),
    } as any);

    const { result } = renderHook(() => useProduct('test-id', 'experience'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.product).toBeTruthy();
    expect(result.current.error).toBe(null);
  });

  it('should handle fetch error', async () => {
    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Product not found' },
      }),
    } as any);

    const { result } = renderHook(() => useProduct('test-id', 'experience'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.product).toBe(null);
    expect(result.current.error).toBeTruthy();
  });

  it('should handle inactive product', async () => {
    const mockProduct = {
      id: 'test-id',
      name: 'Test Product',
      active: false,
    };

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockProduct,
        error: null,
      }),
    } as any);

    const { result } = renderHook(() => useProduct('test-id', 'experience'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.product).toBe(null);
    expect(result.current.error).toBeTruthy();
  });
});




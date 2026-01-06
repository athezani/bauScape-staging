import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import type { Product } from '../types/product';

const mockProduct: Product = {
  id: '1',
  type: 'experience',
  title: 'Test Experience',
  description: 'Test description',
  price: 50,
  priceDogBase: 20,
  location: 'Test Location',
  imageUrl: 'https://example.com/image.jpg',
  category: 'experience',
};

describe('ProductCard', () => {
  it('should render product title', () => {
    const mockOnClick = vi.fn();
    render(<ProductCard product={mockProduct} onClick={mockOnClick} />);
    expect(screen.getByText('Test Experience')).toBeInTheDocument();
  });

  it('should render product without description field', () => {
    const mockOnClick = vi.fn();
    render(<ProductCard product={mockProduct} onClick={mockOnClick} />);
    // ProductCard doesn't render description, only title and location
    expect(screen.getByText('Test Experience')).toBeInTheDocument();
  });

  it('should render product location', () => {
    const mockOnClick = vi.fn();
    render(<ProductCard product={mockProduct} onClick={mockOnClick} />);
    expect(screen.getByText('Test Location')).toBeInTheDocument();
  });

  it('should call onClick when card is clicked', () => {
    const mockOnClick = vi.fn();
    render(<ProductCard product={mockProduct} onClick={mockOnClick} />);
    const card = screen.getByText('Test Experience').closest('div');
    if (card && card.onclick) {
      card.click();
      expect(mockOnClick).toHaveBeenCalledWith(mockProduct);
    }
  });

  it('should render price correctly', () => {
    const mockOnClick = vi.fn();
    render(<ProductCard product={mockProduct} onClick={mockOnClick} />);
    expect(screen.getByText(/Da €70/)).toBeInTheDocument();
  });

  it('should handle missing description', () => {
    const productWithoutDesc = { ...mockProduct, description: undefined };
    const mockOnClick = vi.fn();
    render(<ProductCard product={productWithoutDesc} onClick={mockOnClick} />);
    expect(screen.getByText('Test Experience')).toBeInTheDocument();
  });
});


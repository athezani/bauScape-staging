/**
 * Tests for Product Image Carousel Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductImageCarousel } from '../ProductImageCarousel';

describe('ProductImageCarousel', () => {
  const mockMainImage = '/images/test-main.jpg';
  const mockSecondaryImages = [
    { id: '1', url: '/images/test-1.jpg', display_order: 0 },
    { id: '2', url: '/images/test-2.jpg', display_order: 1 },
    { id: '3', url: '/images/test-3.jpg', display_order: 2 },
  ];

  it('should render main image when no secondary images', () => {
    render(
      <ProductImageCarousel
        mainImage={mockMainImage}
        productTitle="Test Product"
      />
    );

    const image = screen.getByAltText(/Test Product/);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', mockMainImage);
  });

  it('should render all images including secondary', () => {
    render(
      <ProductImageCarousel
        mainImage={mockMainImage}
        secondaryImages={mockSecondaryImages}
        productTitle="Test Product"
      />
    );

    const image = screen.getByAltText(/Test Product.*1 di 4/);
    expect(image).toBeInTheDocument();
  });

  it('should show navigation arrows when multiple images', () => {
    render(
      <ProductImageCarousel
        mainImage={mockMainImage}
        secondaryImages={mockSecondaryImages}
        productTitle="Test Product"
      />
    );

    const prevButton = screen.getByLabelText(/Immagine precedente/i);
    const nextButton = screen.getByLabelText(/Immagine successiva/i);
    
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('should show image indicators when multiple images', () => {
    render(
      <ProductImageCarousel
        mainImage={mockMainImage}
        secondaryImages={mockSecondaryImages}
        productTitle="Test Product"
      />
    );

    const indicators = screen.getAllByLabelText(/Vai all'immagine/i);
    expect(indicators.length).toBe(4); // main + 3 secondary
  });

  it('should navigate to next image on next button click', () => {
    render(
      <ProductImageCarousel
        mainImage={mockMainImage}
        secondaryImages={mockSecondaryImages}
        productTitle="Test Product"
      />
    );

    const nextButton = screen.getByLabelText(/Immagine successiva/i);
    fireEvent.click(nextButton);

    const image = screen.getByAltText(/Test Product.*2 di 4/);
    expect(image).toBeInTheDocument();
  });

  it('should navigate to previous image on previous button click', () => {
    render(
      <ProductImageCarousel
        mainImage={mockMainImage}
        secondaryImages={mockSecondaryImages}
        productTitle="Test Product"
      />
    );

    // Go to second image first
    const nextButton = screen.getByLabelText(/Immagine successiva/i);
    fireEvent.click(nextButton);

    // Then go back
    const prevButton = screen.getByLabelText(/Immagine precedente/i);
    fireEvent.click(prevButton);

    const image = screen.getByAltText(/Test Product.*1 di 4/);
    expect(image).toBeInTheDocument();
  });

  it('should navigate to specific image on indicator click', () => {
    render(
      <ProductImageCarousel
        mainImage={mockMainImage}
        secondaryImages={mockSecondaryImages}
        productTitle="Test Product"
      />
    );

    const thirdIndicator = screen.getByLabelText(/Vai all'immagine 3/i);
    fireEvent.click(thirdIndicator);

    const image = screen.getByAltText(/Test Product.*3 di 4/);
    expect(image).toBeInTheDocument();
  });

  it('should handle keyboard navigation', () => {
    render(
      <ProductImageCarousel
        mainImage={mockMainImage}
        secondaryImages={mockSecondaryImages}
        productTitle="Test Product"
      />
    );

    // Press right arrow
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    let image = screen.getByAltText(/Test Product.*2 di 4/);
    expect(image).toBeInTheDocument();

    // Press left arrow
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    image = screen.getByAltText(/Test Product.*1 di 4/);
    expect(image).toBeInTheDocument();
  });
});


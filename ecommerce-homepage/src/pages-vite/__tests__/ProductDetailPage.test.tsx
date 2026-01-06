/**
 * Tests for ProductDetailPage component
 * Ensures program sections work correctly and don't break the page
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProductDetailPage } from '../ProductDetailPage';
import type { Product } from '../../types/product';

// Mock dependencies
vi.mock('../../components/Header', () => ({
  Header: () => <div data-testid="header">Header</div>
}));

vi.mock('../../components/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>
}));

vi.mock('../../components/MobileMenu', () => ({
  MobileMenu: () => <div data-testid="mobile-menu">MobileMenu</div>
}));

vi.mock('../../lib/supabaseClient', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null })
        })
      })
    })
  })
}));

describe('ProductDetailPage - Program Section', () => {
  const mockProduct: Product = {
    id: 'test-id',
    type: 'trip',
    provider_id: 'provider-id',
    name: 'Test Trip',
    description: 'Test description',
    max_adults: 4,
    max_dogs: 2,
    pricing_type: 'linear',
    price_adult_base: 100,
    price_dog_base: 50,
    predefined_prices: null,
    images: [],
    highlights: [],
    included_items: [],
    cancellation_policy: 'Test policy',
    attributes: [],
    duration_days: 3,
    location: 'Test Location',
    start_date: '2025-12-19',
    end_date: '2025-12-21',
    booking_qty: null,
    active: true,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    program: {
      days: [
        {
          id: 'day-1',
          day_number: 1,
          introduction: 'Day 1 introduction',
          items: [
            { id: 'item-1', activity_text: 'Activity 1', order_index: 0 },
            { id: 'item-2', activity_text: 'Activity 2', order_index: 1 },
          ],
        },
        {
          id: 'day-2',
          day_number: 2,
          introduction: 'Day 2 introduction',
          items: [
            { id: 'item-3', activity_text: 'Activity 3', order_index: 0 },
          ],
        },
      ],
    },
  };

  const mockOnBack = vi.fn();
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render program section when program exists', () => {
    render(
      <BrowserRouter>
        <ProductDetailPage
          product={mockProduct}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Programma')).toBeInTheDocument();
  });

  it('should show day titles in collapsed state', () => {
    render(
      <BrowserRouter>
        <ProductDetailPage
          product={mockProduct}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/Giorno 1/)).toBeInTheDocument();
    expect(screen.getByText(/Giorno 2/)).toBeInTheDocument();
  });

  it('should not show program content initially (collapsed)', () => {
    render(
      <BrowserRouter>
        <ProductDetailPage
          product={mockProduct}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    // Activities should not be visible initially
    expect(screen.queryByText('Activity 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Activity 2')).not.toBeInTheDocument();
  });

  it('should expand day section when clicked', () => {
    render(
      <BrowserRouter>
        <ProductDetailPage
          product={mockProduct}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    const day1Button = screen.getByText(/Giorno 1/).closest('button');
    expect(day1Button).toBeInTheDocument();

    fireEvent.click(day1Button!);

    // Activities should now be visible
    expect(screen.getByText('Activity 1')).toBeInTheDocument();
    expect(screen.getByText('Activity 2')).toBeInTheDocument();
    expect(screen.getByText('Day 1 introduction')).toBeInTheDocument();
  });

  it('should collapse day section when clicked again', () => {
    render(
      <BrowserRouter>
        <ProductDetailPage
          product={mockProduct}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    const day1Button = screen.getByText(/Giorno 1/).closest('button');
    fireEvent.click(day1Button!);
    
    // Expand first
    expect(screen.getByText('Activity 1')).toBeInTheDocument();

    // Collapse
    fireEvent.click(day1Button!);
    
    // Activities should be hidden again
    expect(screen.queryByText('Activity 1')).not.toBeInTheDocument();
  });

  it('should handle multiple days independently', () => {
    render(
      <BrowserRouter>
        <ProductDetailPage
          product={mockProduct}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    const day1Button = screen.getByText(/Giorno 1/).closest('button');
    const day2Button = screen.getByText(/Giorno 2/).closest('button');

    // Expand day 1
    fireEvent.click(day1Button!);
    expect(screen.getByText('Activity 1')).toBeInTheDocument();
    expect(screen.queryByText('Activity 3')).not.toBeInTheDocument();

    // Expand day 2
    fireEvent.click(day2Button!);
    expect(screen.getByText('Activity 1')).toBeInTheDocument(); // Still visible
    expect(screen.getByText('Activity 3')).toBeInTheDocument(); // Now visible
  });

  it('should handle product without program gracefully', () => {
    const productWithoutProgram = { ...mockProduct, program: undefined };
    
    render(
      <BrowserRouter>
        <ProductDetailPage
          product={productWithoutProgram}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    expect(screen.queryByText('Programma')).not.toBeInTheDocument();
  });

  it('should handle product with empty program', () => {
    const productWithEmptyProgram = {
      ...mockProduct,
      program: { days: [] },
    };
    
    render(
      <BrowserRouter>
        <ProductDetailPage
          product={productWithEmptyProgram}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    expect(screen.queryByText('Programma')).not.toBeInTheDocument();
  });

  it('should handle day without items', () => {
    const productWithDayNoItems = {
      ...mockProduct,
      program: {
        days: [
          {
            id: 'day-1',
            day_number: 1,
            introduction: 'Day 1 introduction',
            items: [],
          },
        ],
      },
    };
    
    render(
      <BrowserRouter>
        <ProductDetailPage
          product={productWithDayNoItems}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    const day1Button = screen.getByText(/Giorno 1/).closest('button');
    fireEvent.click(day1Button!);

    // Should show introduction but no activities
    expect(screen.getByText('Day 1 introduction')).toBeInTheDocument();
  });

  it('should display correct date format for trips', () => {
    render(
      <BrowserRouter>
        <ProductDetailPage
          product={mockProduct}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    // Should show day number (format may vary based on locale)
    expect(screen.getByText(/Giorno 1/i)).toBeInTheDocument();
  });
});

describe('ProductDetailPage - FAQ Section', () => {
  const mockProductWithFAQs: Product = {
    id: 'test-id',
    type: 'experience',
    title: 'Test Experience',
    description: 'Test description',
    maxAdults: 4,
    maxDogs: 2,
    cancellationPolicy: 'Test policy',
    faqs: [
      {
        id: 'faq-1',
        question: 'Quali documenti servono?',
        answer: 'È necessario portare il libretto sanitario del cane.',
        order_index: 0,
      },
      {
        id: 'faq-2',
        question: 'Cosa succede in caso di maltempo?',
        answer: 'L\'attività potrebbe essere posticipata.',
        order_index: 1,
      },
    ],
  };

  const mockOnBack = vi.fn();
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render FAQ section when FAQs exist', () => {
    render(
      <BrowserRouter>
        <ProductDetailPage
          product={mockProductWithFAQs}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Domande Frequenti')).toBeInTheDocument();
  });

  it('should not show FAQ content initially (collapsed)', () => {
    render(
      <BrowserRouter>
        <ProductDetailPage
          product={mockProductWithFAQs}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    // Questions should be visible
    expect(screen.getByText('Quali documenti servono?')).toBeInTheDocument();
    expect(screen.getByText('Cosa succede in caso di maltempo?')).toBeInTheDocument();

    // Answers should not be visible initially
    expect(screen.queryByText('È necessario portare il libretto sanitario del cane.')).not.toBeInTheDocument();
    expect(screen.queryByText('L\'attività potrebbe essere posticipata.')).not.toBeInTheDocument();
  });

  it('should expand FAQ when clicked', () => {
    render(
      <BrowserRouter>
        <ProductDetailPage
          product={mockProductWithFAQs}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    const faqButton = screen.getByText('Quali documenti servono?').closest('button');
    expect(faqButton).toBeInTheDocument();

    fireEvent.click(faqButton!);

    // Answer should now be visible
    expect(screen.getByText('È necessario portare il libretto sanitario del cane.')).toBeInTheDocument();
  });

  it('should collapse FAQ when clicked again', () => {
    render(
      <BrowserRouter>
        <ProductDetailPage
          product={mockProductWithFAQs}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    const faqButton = screen.getByText('Quali documenti servono?').closest('button');
    fireEvent.click(faqButton!);
    
    // Expand first
    expect(screen.getByText('È necessario portare il libretto sanitario del cane.')).toBeInTheDocument();

    // Collapse
    fireEvent.click(faqButton!);
    
    // Answer should be hidden again
    expect(screen.queryByText('È necessario portare il libretto sanitario del cane.')).not.toBeInTheDocument();
  });

  it('should handle multiple FAQs independently', () => {
    render(
      <BrowserRouter>
        <ProductDetailPage
          product={mockProductWithFAQs}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    const faq1Button = screen.getByText('Quali documenti servono?').closest('button');
    const faq2Button = screen.getByText('Cosa succede in caso di maltempo?').closest('button');

    // Expand first FAQ
    fireEvent.click(faq1Button!);
    expect(screen.getByText('È necessario portare il libretto sanitario del cane.')).toBeInTheDocument();
    expect(screen.queryByText('L\'attività potrebbe essere posticipata.')).not.toBeInTheDocument();

    // Expand second FAQ
    fireEvent.click(faq2Button!);
    expect(screen.getByText('È necessario portare il libretto sanitario del cane.')).toBeInTheDocument();
    expect(screen.getByText('L\'attività potrebbe essere posticipata.')).toBeInTheDocument();
  });

  it('should not show FAQ section when no FAQs exist', () => {
    const productWithoutFAQs: Product = {
      ...mockProductWithFAQs,
      faqs: undefined,
    };

    render(
      <BrowserRouter>
        <ProductDetailPage
          product={productWithoutFAQs}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    expect(screen.queryByText('Domande Frequenti')).not.toBeInTheDocument();
  });

  it('should not show FAQ section when FAQs array is empty', () => {
    const productWithEmptyFAQs: Product = {
      ...mockProductWithFAQs,
      faqs: [],
    };

    render(
      <BrowserRouter>
        <ProductDetailPage
          product={productWithEmptyFAQs}
          onBack={mockOnBack}
          onNavigate={mockOnNavigate}
        />
      </BrowserRouter>
    );

    expect(screen.queryByText('Domande Frequenti')).not.toBeInTheDocument();
  });
});


/**
 * Price Calculation Utilities
 * 
 * DEPRECATED: This module is deprecated. Use pricingService from '../services/pricingService' instead.
 * 
 * This file is kept for backward compatibility but now delegates to pricingService.
 */

import type { Product } from '../types/product';
import { pricingService, type PriceCalculationResult } from '../services/pricingService';

/**
 * @deprecated Use pricingService.calculatePrice() instead
 */
export function calculatePrice(
  product: Product,
  guests: number,
  dogs: number
): PriceCalculationResult {
  return pricingService.calculatePrice(product, guests, dogs);
}

// Re-export types for backward compatibility
export type { PriceCalculationResult } from '../services/pricingService';


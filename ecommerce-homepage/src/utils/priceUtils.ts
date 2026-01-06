/**
 * Price Utilities
 * 
 * DEPRECATED: This module is deprecated. Use pricingService from '../services/pricingService' instead.
 * 
 * This file is kept for backward compatibility but all functions now delegate to pricingService.
 */

import type { Product } from '../types/product';
import { pricingService } from '../services/pricingService';

/**
 * @deprecated Use pricingService.getMinimumPrice() instead
 */
export function getProductMinimumPrice(product: Product): number {
  return pricingService.getMinimumPrice(product);
}

/**
 * @deprecated Use pricingService.formatPriceFrom() instead
 */
export function formatPriceFrom(price: number): string {
  return pricingService.formatPriceFrom(price);
}

/**
 * Calculate the price for 1 adult + 1 dog
 * @deprecated Use pricingService.calculatePrice(product, 1, 1) instead
 */
export function getPriceForOneAdultOneDog(priceAdult: number | null | undefined, priceDog: number | null | undefined): number {
  const adultPrice = priceAdult ?? 0;
  const dogPrice = priceDog ?? 0;
  const total = adultPrice + dogPrice;

  if (total <= 0) {
    return 0;
  }

  return total;
}

/**
 * Pricing Service - Centralized Price Calculation Module
 * 
 * This is the SINGLE SOURCE OF TRUTH for all price calculations in the frontend.
 * All components MUST use this service to calculate and display prices.
 * 
 * CRITICAL: This module replicates the exact logic from the backend
 * (create-checkout-session Edge Function) to ensure 100% consistency.
 * 
 * Usage:
 *   import { pricingService } from '../services/pricingService';
 *   const price = pricingService.calculateTotal(product, guests, dogs);
 *   const minPrice = pricingService.getMinimumPrice(product);
 */

import type { Product } from '../types/product';

export interface PriceCalculationResult {
  totalAmount: number;
  pricePerAdult: number;
  pricePerDog: number;
  subtotalAdults: number; // pricePerAdult * guests (with precise rounding)
  subtotalDogs: number; // pricePerDog * dogs (with precise rounding)
}

class PricingService {
  /**
   * Calculate the total price and per-unit prices based on the product's pricing model.
   * This function uses the EXACT same logic as the backend to ensure consistency.
   * 
   * @param product - Product object with pricing information
   * @param guests - Number of adult guests
   * @param dogs - Number of dogs
   * @returns Object with totalAmount, pricePerAdult, and pricePerDog
   */
  calculatePrice(
    product: Product,
    guests: number,
    dogs: number
  ): PriceCalculationResult {
    // Use new pricing model if available, otherwise fall back to legacy
    const pricingModel = product.pricingModel || 'percentage'; // Default to percentage for backward compatibility
    const providerCostAdultBase = product.providerCostAdultBase ?? 0;
    const providerCostDogBase = product.providerCostDogBase ?? 0;
    
    // Calculate provider cost total (matching backend exactly)
    // Backend: const providerCostTotal = (providerCostAdultBase * body.guests) + (providerCostDogBase * body.dogs);
    // Backend does NOT round intermediate calculations, only the final totalAmount
    const providerCostTotal = (providerCostAdultBase * guests) + (providerCostDogBase * dogs);
    
    let totalAmount = 0;
    let pricePerAdult = 0;
    let pricePerDog = 0;
    
    if (pricingModel === 'percentage') {
      // Percentage model: price = provider_cost * (1 + margin_percentage/100)
      const marginPercentage = product.marginPercentage ?? 0;
      
      if (providerCostTotal <= 0) {
        // Fallback to legacy pricing if provider cost is invalid
        pricePerAdult = product.price ?? 0;
        pricePerDog = product.priceDogBase ?? 0;
        const totalBeforeRounding = (pricePerAdult * guests) + (pricePerDog * dogs);
        totalAmount = Math.round(totalBeforeRounding * 100) / 100;
      } else {
        // Backend: const totalBeforeRounding = providerCostTotal * (1 + marginPercentage / 100);
        // Backend: totalAmount = Math.round(totalBeforeRounding * 100) / 100;
        const totalBeforeRounding = providerCostTotal * (1 + marginPercentage / 100);
        totalAmount = Math.round(totalBeforeRounding * 100) / 100;
        
        // Calculate per-unit prices proportionally with precise rounding
        // Backend: const priceRatio = totalAmount / providerCostTotal;
        // Backend: pricePerAdult = Math.round((providerCostAdultBase * priceRatio) * 100) / 100;
        if (providerCostTotal > 0) {
          const priceRatio = totalAmount / providerCostTotal;
          pricePerAdult = Math.round((providerCostAdultBase * priceRatio) * 100) / 100;
          pricePerDog = Math.round((providerCostDogBase * priceRatio) * 100) / 100;
        }
      }
    } else if (pricingModel === 'markup') {
      // Markup model: price = provider_cost + markup_adult * num_adults + markup_dog * num_dogs
      const markupAdult = product.markupAdult ?? 0;
      const markupDog = product.markupDog ?? 0;
      
      // Backend: const totalBeforeRounding = providerCostTotal + (markupAdult * body.guests) + (markupDog * body.dogs);
      // Backend: totalAmount = Math.round(totalBeforeRounding * 100) / 100;
      const totalBeforeRounding = providerCostTotal + (markupAdult * guests) + (markupDog * dogs);
      totalAmount = Math.round(totalBeforeRounding * 100) / 100;
      
      // Backend: pricePerAdult = Math.round((providerCostAdultBase + markupAdult) * 100) / 100;
      // Backend: pricePerDog = Math.round((providerCostDogBase + markupDog) * 100) / 100;
      pricePerAdult = Math.round((providerCostAdultBase + markupAdult) * 100) / 100;
      pricePerDog = Math.round((providerCostDogBase + markupDog) * 100) / 100;
    } else {
      // Fallback to old pricing model (backward compatibility)
      // Backend: pricePerAdult = Number(product.price_adult_base) || 0;
      // Backend: pricePerDog = Number(product.price_dog_base) || 0;
      // Backend: const totalBeforeRounding = (pricePerAdult * body.guests) + (pricePerDog * body.dogs);
      // Backend: totalAmount = Math.round(totalBeforeRounding * 100) / 100;
      pricePerAdult = product.price ?? 0;
      pricePerDog = product.priceDogBase ?? 0;
      const totalBeforeRounding = (pricePerAdult * guests) + (pricePerDog * dogs);
      totalAmount = Math.round(totalBeforeRounding * 100) / 100;
    }
    
    // Calculate subtotals ensuring they sum exactly to totalAmount
    // CRITICAL: subtotalAdults + subtotalDogs MUST equal totalAmount exactly
    // This prevents any discrepancy between displayed subtotals and total
    
    // Calculate unrounded subtotals
    const unroundedSubtotalAdults = pricePerAdult * guests;
    const unroundedSubtotalDogs = pricePerDog * dogs;
    
    // Round each subtotal individually
    let subtotalAdults = Math.round(unroundedSubtotalAdults * 100) / 100;
    let subtotalDogs = Math.round(unroundedSubtotalDogs * 100) / 100;
    
    // Calculate the sum of rounded subtotals
    const roundedSum = subtotalAdults + subtotalDogs;
    const difference = totalAmount - roundedSum;
    
    // If there's a difference (due to rounding), adjust to make sum exact
    if (Math.abs(difference) > 0.0001) {
      // Distribute the difference to the larger subtotal to minimize visual impact
      // This ensures the sum is exactly totalAmount
      if (Math.abs(subtotalAdults) >= Math.abs(subtotalDogs)) {
        subtotalAdults = Math.round((subtotalAdults + difference) * 100) / 100;
      } else {
        subtotalDogs = Math.round((subtotalDogs + difference) * 100) / 100;
      }
    }
    
    // Final verification: ensure sum equals totalAmount (within floating point precision)
    const finalSum = subtotalAdults + subtotalDogs;
    const finalDifference = totalAmount - finalSum;
    if (Math.abs(finalDifference) > 0.01) {
      // This should never happen, but if it does, force exact match
      console.error('Pricing calculation error: subtotals do not sum to total', {
        subtotalAdults,
        subtotalDogs,
        sum: finalSum,
        totalAmount,
        difference: finalDifference,
        product: product.id,
        guests,
        dogs,
      });
      // Force exact match
      if (Math.abs(subtotalAdults) >= Math.abs(subtotalDogs)) {
        subtotalAdults = totalAmount - subtotalDogs;
      } else {
        subtotalDogs = totalAmount - subtotalAdults;
      }
    }
    
    return {
      totalAmount,
      pricePerAdult,
      pricePerDog,
      subtotalAdults,
      subtotalDogs,
    };
  }

  /**
   * Calculate total price for a product with given guests and dogs.
   * Convenience method that returns only the total amount.
   * 
   * @param product - Product object
   * @param guests - Number of adult guests
   * @param dogs - Number of dogs
   * @returns Total price
   */
  calculateTotal(product: Product, guests: number, dogs: number): number {
    const result = this.calculatePrice(product, guests, dogs);
    return result.totalAmount;
  }

  /**
   * Get the minimum starting price for a product.
   * Uses the new pricing model if available, otherwise falls back to legacy.
   * 
   * @param product - Product object
   * @returns Minimum starting price
   */
  getMinimumPrice(product: Product): number {
    // If no_adults is true (only for classes and experiences), return only dog price
    if (product.noAdults && (product.type === 'class' || product.type === 'experience')) {
      const result = this.calculatePrice(product, 0, 1);
      return result.pricePerDog;
    }
    
    // Otherwise, return price for 1 adult + 1 dog
    const result = this.calculatePrice(product, 1, 1);
    return result.totalAmount;
  }

  /**
   * Format price as "Da €xxx"
   * 
   * @param price - Price to format
   * @returns Formatted price string
   */
  formatPriceFrom(price: number): string {
    if (price <= 0) {
      return 'Da €0';
    }
    return `Da €${price.toFixed(2)}`;
  }

  /**
   * Format price as "Da €xxx" without decimals (for display in product cards and main price display)
   * 
   * @param price - Price to format
   * @returns Formatted price string without decimal places
   */
  formatPriceFromNoDecimals(price: number): string {
    if (price <= 0) {
      return 'Da €0';
    }
    // Round to nearest integer and display without decimals
    return `Da €${Math.round(price)}`;
  }

  /**
   * Get price and unit for product cards (returns object with price and unit separately)
   * (for display in product cards in lists)
   * 
   * @param product - Product object to determine the unit suffix
   * @returns Object with price string and unit string
   */
  getPriceAndUnitForCard(product: Product): { price: string; unit: string } {
    const minimumPrice = this.getMinimumPrice(product);
    
    if (minimumPrice <= 0) {
      return { price: 'Da €0', unit: '' };
    }
    
    const roundedPrice = Math.round(minimumPrice);
    
    // Determine unit suffix:
    // - If noAdults is true (only for classes and experiences), show "cane"
    // - Otherwise (trips always, classes/experiences without noAdults), show "binomio"
    const isDogOnly = product.noAdults && (product.type === 'class' || product.type === 'experience');
    const unit = isDogOnly ? 'cane' : 'binomio';
    
    return { price: `Da €${roundedPrice}`, unit: `/ ${unit}` };
  }

  /**
   * Format price as "€xxx.xx"
   * 
   * @param price - Price to format
   * @returns Formatted price string
   */
  formatPrice(price: number): string {
    return `€${price.toFixed(2)}`;
  }

  /**
   * Round price to 2 decimal places (precise rounding)
   * 
   * @param price - Price to round
   * @returns Rounded price
   */
  roundPrice(price: number): number {
    return Math.round(price * 100) / 100;
  }
}

// Export singleton instance
export const pricingService = new PricingService();

// Export for backward compatibility (deprecated - use pricingService instead)
export function calculatePrice(
  product: Product,
  guests: number,
  dogs: number
): PriceCalculationResult {
  return pricingService.calculatePrice(product, guests, dogs);
}

export function getProductMinimumPrice(product: Product): number {
  return pricingService.getMinimumPrice(product);
}

export function formatPriceFrom(price: number): string {
  return pricingService.formatPriceFrom(price);
}


/**
 * Odoo Product Synchronization
 * 
 * Functions for synchronizing products from Supabase to Odoo.
 * Ensures 1-to-1 mapping between internal products and Odoo products.
 * 
 * This module handles:
 * - Finding or creating products in Odoo using x_product_id (UUID)
 * - Updating product information when products change
 * - Batch synchronization of all active products
 */

import { createOdooClient } from './client.ts';
import type { OdooConfig } from './types.ts';

/**
 * Product data structure for Odoo synchronization
 */
export interface ProductForOdooSync {
  id: string; // UUID from Supabase
  name: string;
  description?: string | null;
  type: 'class' | 'experience' | 'trip';
  active: boolean;
  // Optional fields for additional metadata
  maxAdults?: number | null;
  maxDogs?: number | null;
  durationHours?: number | null;
  durationDays?: number | null;
  meetingPoint?: string | null;
  location?: string | null;
}

/**
 * Result of product synchronization
 */
export interface ProductSyncResult {
  success: boolean;
  productId?: number; // Odoo product ID
  action: 'created' | 'updated' | 'skipped';
  error?: string;
  errorDetails?: unknown;
}

/**
 * Find or create product in Odoo using x_product_id
 * 
 * This function ensures 1-to-1 mapping between Supabase products and Odoo products.
 * It searches for existing products by x_product_id (UUID) to avoid duplicates.
 * 
 * @param config - Odoo configuration
 * @param product - Product data from Supabase
 * @returns Product synchronization result
 */
export async function syncProductToOdoo(
  config: OdooConfig,
  product: ProductForOdooSync
): Promise<ProductSyncResult> {
  const logContext = {
    productId: product.id,
    productName: product.name,
    productType: product.type,
  };

  try {
    console.log('[Odoo Product Sync] ========================================');
    console.log('[Odoo Product Sync] Syncing product:', logContext);

    const client = createOdooClient(config);
    await client.authenticate();

    // Step 1: Search for existing product by x_product_id
    console.log('[Odoo Product Sync] Searching for existing product by x_product_id:', product.id);
    
    const existingProducts = await client.search('product.product', [
      ['x_product_id', '=', product.id],
    ], { limit: 1 });

    const productValues: Record<string, unknown> = {
      name: product.name,
      type: 'service', // Service product (not storable)
      sale_ok: product.active, // Only active products are for sale
      purchase_ok: false, // Products are only for sale, not purchase
      list_price: 0, // Prices are dynamic (based on adults/dogs), set to 0
      description: product.description || '',
      // Custom fields for product identification and classification
      x_product_id: product.id, // UUID from Supabase (unique identifier)
      x_product_type: product.type, // 'class' | 'experience' | 'trip'
    };

    // Add optional metadata fields if available
    if (product.maxAdults !== null && product.maxAdults !== undefined) {
      productValues.x_max_adults = product.maxAdults;
    }
    if (product.maxDogs !== null && product.maxDogs !== undefined) {
      productValues.x_max_dogs = product.maxDogs;
    }
    if (product.durationHours !== null && product.durationHours !== undefined) {
      productValues.x_duration_hours = product.durationHours;
    }
    if (product.durationDays !== null && product.durationDays !== undefined) {
      productValues.x_duration_days = product.durationDays;
    }
    if (product.meetingPoint) {
      productValues.x_meeting_point = product.meetingPoint;
    }
    if (product.location) {
      productValues.x_location = product.location;
    }

    if (existingProducts.length > 0) {
      // Step 2a: Update existing product
      const odooProductId = existingProducts[0];
      console.log('[Odoo Product Sync] Found existing product, updating:', odooProductId);

      try {
        await client.write('product.product', [odooProductId], productValues);
        console.log('[Odoo Product Sync] Product updated successfully:', odooProductId);
        
        return {
          success: true,
          productId: odooProductId,
          action: 'updated',
        };
      } catch (writeError) {
        // If custom fields don't exist, try without them
        console.warn('[Odoo Product Sync] Update with custom fields failed, trying without them:', writeError);
        
        // Retry with only standard fields
        const standardFields: Record<string, unknown> = {
          name: product.name,
          type: 'service',
          sale_ok: product.active,
          purchase_ok: false,
          list_price: 0,
          description: product.description || '',
        };

        try {
          await client.write('product.product', [odooProductId], standardFields);
          console.log('[Odoo Product Sync] Product updated with standard fields only:', odooProductId);
          
          return {
            success: true,
            productId: odooProductId,
            action: 'updated',
          };
        } catch (standardError) {
          console.error('[Odoo Product Sync] Error updating product:', standardError);
          return {
            success: false,
            action: 'skipped',
            error: 'Failed to update product',
            errorDetails: standardError,
          };
        }
      }
    } else {
      // Step 2b: Create new product
      console.log('[Odoo Product Sync] Product not found, creating new product');

      try {
        const newProductId = await client.create('product.product', productValues);
        console.log('[Odoo Product Sync] Product created successfully:', newProductId);
        
        return {
          success: true,
          productId: newProductId,
          action: 'created',
        };
      } catch (createError) {
        // If custom fields don't exist, try without them
        console.warn('[Odoo Product Sync] Create with custom fields failed, trying without them:', createError);
        
        // Retry with only standard fields
        const standardFields: Record<string, unknown> = {
          name: product.name,
          type: 'service',
          sale_ok: product.active,
          purchase_ok: false,
          list_price: 0,
          description: product.description || '',
        };

        try {
          const newProductId = await client.create('product.product', standardFields);
          console.log('[Odoo Product Sync] Product created with standard fields only:', newProductId);
          
          // Try to update with custom fields in a second step (if they exist)
          try {
            const customFields: Record<string, unknown> = {
              x_product_id: product.id,
              x_product_type: product.type,
            };
            if (product.maxAdults !== null && product.maxAdults !== undefined) {
              customFields.x_max_adults = product.maxAdults;
            }
            if (product.maxDogs !== null && product.maxDogs !== undefined) {
              customFields.x_max_dogs = product.maxDogs;
            }
            if (product.durationHours !== null && product.durationHours !== undefined) {
              customFields.x_duration_hours = product.durationHours;
            }
            if (product.durationDays !== null && product.durationDays !== undefined) {
              customFields.x_duration_days = product.durationDays;
            }
            if (product.meetingPoint) {
              customFields.x_meeting_point = product.meetingPoint;
            }
            if (product.location) {
              customFields.x_location = product.location;
            }
            
            await client.write('product.product', [newProductId], customFields);
            console.log('[Odoo Product Sync] Custom fields added to product:', newProductId);
          } catch (customFieldsError) {
            // Non-blocking: custom fields may not exist in Odoo
            console.warn('[Odoo Product Sync] Could not add custom fields (non-blocking):', customFieldsError);
          }
          
          return {
            success: true,
            productId: newProductId,
            action: 'created',
          };
        } catch (standardError) {
          console.error('[Odoo Product Sync] Error creating product:', standardError);
          return {
            success: false,
            action: 'skipped',
            error: 'Failed to create product',
            errorDetails: standardError,
          };
        }
      }
    }
  } catch (error) {
    console.error('[Odoo Product Sync] Unexpected error:', error);
    return {
      success: false,
      action: 'skipped',
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: error,
    };
  }
}

/**
 * Batch synchronization result
 */
export interface BatchSyncResult {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: ProductSyncResult[];
}

/**
 * Synchronize multiple products to Odoo
 * 
 * @param config - Odoo configuration
 * @param products - Array of products to synchronize
 * @returns Batch synchronization result
 */
export async function syncProductsBatchToOdoo(
  config: OdooConfig,
  products: ProductForOdooSync[]
): Promise<BatchSyncResult> {
  console.log('[Odoo Product Sync] Starting batch synchronization of', products.length, 'products');

  const results: ProductSyncResult[] = [];
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  for (const product of products) {
    const result = await syncProductToOdoo(config, product);
    results.push(result);

    if (result.success) {
      if (result.action === 'created') {
        successful++;
      } else if (result.action === 'updated') {
        successful++;
      } else {
        skipped++;
      }
    } else {
      failed++;
    }

    // Small delay to avoid overwhelming Odoo
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('[Odoo Product Sync] Batch synchronization completed:', {
    total: products.length,
    successful,
    failed,
    skipped,
  });

  return {
    total: products.length,
    successful,
    failed,
    skipped,
    results,
  };
}


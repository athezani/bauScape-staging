/**
 * Odoo Sales Invoice Integration
 * 
 * Functions for creating Sales Invoices in Odoo for accounting.
 * 
 * This module handles the creation of Sales Invoices in Odoo
 * when a customer booking is completed, recording:
 * - Revenue (total_amount_paid)
 * - Cost of Goods Sold (provider_cost_total)
 * - Stripe fees (stripe_fee)
 * - Internal margin (internal_margin / net_revenue)
 */

import { createOdooClient } from './client.ts';
import type { OdooConfig, BookingDataForOdoo, OdooSalesInvoiceResult } from './types.ts';

/**
 * Create a Sales Invoice in Odoo for a booking
 * 
 * This function creates a Sales Invoice in Odoo with:
 * - Customer: Customer partner
 * - Product: Service/product from booking
 * - Revenue line: total_amount_paid
 * - COGS line: provider_cost_total (if configured)
 * - Expense line: stripe_fee (if configured)
 * 
 * @param config - Odoo configuration
 * @param bookingData - Booking data with financial information
 * @returns Sales Invoice creation result
 */
export async function createOdooSalesInvoice(
  config: OdooConfig,
  bookingData: BookingDataForOdoo
): Promise<OdooSalesInvoiceResult> {
  try {
    const client = createOdooClient(config);

    // TODO: Implement Sales Invoice creation logic
    // 
    // Steps to implement:
    // 1. Find or create customer partner in Odoo
    // 2. Find or create product in Odoo (if needed)
    // 3. Create account.move (invoice) with:
    //    - partner_id: Customer partner ID
    //    - move_type: 'out_invoice' (customer invoice)
    //    - invoice_date: bookingDate
    //    - invoice_line_ids: [
    //        Revenue line: total_amount_paid
    //        COGS line: provider_cost_total (if account configured)
    //        Expense line: stripe_fee (if account configured)
    //      ]
    //    - ref: bookingId or orderNumber
    //    - narration: Booking details
    // 4. Post the invoice (action_post) if needed
    // 5. Return invoice ID

    console.log('[Odoo Invoice] Creating Sales Invoice for booking:', bookingData.bookingId);
    console.log('[Odoo Invoice] Customer:', bookingData.customer.fullName || bookingData.customer.email);
    console.log('[Odoo Invoice] Total Amount:', bookingData.totalAmountPaid);
    console.log('[Odoo Invoice] Provider Cost:', bookingData.providerCostTotal);
    console.log('[Odoo Invoice] Stripe Fee:', bookingData.stripeFee);
    console.log('[Odoo Invoice] Net Revenue:', bookingData.netRevenue);

    // Placeholder implementation
    // Replace this with actual invoice creation logic
    
    // Example structure (to be implemented):
    /*
    // 1. Find or create customer partner
    const customerPartnerId = await findOrCreateCustomerPartner(
      client,
      bookingData.customer
    );

    // 2. Find or create product
    const productId = await findOrCreateProduct(
      client,
      bookingData.product
    );

    // 3. Get account IDs from environment or configuration
    const revenueAccountId = getAccountId('REVENUE');
    const cogsAccountId = getAccountId('COGS');
    const expenseAccountId = getAccountId('STRIPE_FEE');

    // 4. Build invoice lines
    const invoiceLines: unknown[] = [];

    // Revenue line
    invoiceLines.push([0, 0, {
      product_id: productId,
      name: buildProductDescription(bookingData),
      quantity: 1,
      price_unit: bookingData.totalAmountPaid,
      account_id: revenueAccountId,
    }]);

    // COGS line (if configured)
    if (cogsAccountId && bookingData.providerCostTotal) {
      invoiceLines.push([0, 0, {
        product_id: productId,
        name: `COGS: ${bookingData.product.name}`,
        quantity: 1,
        price_unit: -bookingData.providerCostTotal, // Negative for cost
        account_id: cogsAccountId,
      }]);
    }

    // Stripe fee line (if configured)
    if (expenseAccountId && bookingData.stripeFee) {
      invoiceLines.push([0, 0, {
        product_id: productId,
        name: 'Stripe Fee',
        quantity: 1,
        price_unit: -bookingData.stripeFee, // Negative for expense
        account_id: expenseAccountId,
      }]);
    }

    // 5. Create invoice
    const invoiceValues = {
      partner_id: customerPartnerId,
      move_type: 'out_invoice',
      invoice_date: bookingData.bookingDate,
      ref: bookingData.orderNumber || bookingData.bookingId,
      narration: buildBookingNotes(bookingData),
      invoice_line_ids: invoiceLines,
    };

    const invoiceId = await client.create('account.move', invoiceValues);

    // 6. Post invoice if needed
    // await client.executeKw('account.move', 'action_post', [[invoiceId]]);

    return {
      success: true,
      invoiceId: invoiceId,
    };
    */

    // Temporary: Return success with placeholder
    return {
      success: true,
      invoiceId: 0, // Placeholder
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Odoo Invoice] Error creating Sales Invoice:', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
      errorDetails: error,
    };
  }
}

/**
 * Find or create customer partner in Odoo
 * 
 * @param client - Odoo client instance
 * @param customer - Customer information
 * @returns Partner ID
 */
async function findOrCreateCustomerPartner(
  client: Awaited<ReturnType<typeof createOdooClient>>,
  customer: BookingDataForOdoo['customer']
): Promise<number> {
  // TODO: Implement customer partner lookup/creation
  // Search by email, create if not found
  throw new Error('Not implemented: findOrCreateCustomerPartner');
}

/**
 * Find or create product in Odoo
 * 
 * Searches for product by x_product_id (UUID) to ensure 1-to-1 mapping.
 * Falls back to environment variable OD_PRODUCT_ID if set.
 * 
 * IMPORTANT: This function now uses x_product_id for product identification
 * to ensure proper product synchronization. Products should be synced
 * using sync-products-to-odoo function first.
 * 
 * @param client - Odoo client instance
 * @param product - Product information (must include id)
 * @returns Product ID
 */
async function findOrCreateProduct(
  client: Awaited<ReturnType<typeof createOdooClient>>,
  product: BookingDataForOdoo['product']
): Promise<number> {
  // Check for environment variable override
  const envProductId = Deno.env.get('OD_PRODUCT_ID');
  if (envProductId) {
    const productId = parseInt(envProductId, 10);
    if (!isNaN(productId)) {
      console.log('[Odoo Invoice] Using product ID from environment variable:', productId);
      return productId;
    }
  }

  // Use x_product_id (UUID) to find product - ensures 1-to-1 mapping
  if (product.id) {
    console.log('[Odoo Invoice] Searching for product by x_product_id:', product.id);
    
    const searchResults = await client.search('product.product', [
      ['x_product_id', '=', product.id],
    ], { limit: 1 });

    if (searchResults.length > 0) {
      const productId = searchResults[0];
      // Ensure we return a number, not an array
      const productIdNum = Array.isArray(productId) ? productId[0] : (typeof productId === 'number' ? productId : Number(productId));
      console.log('[Odoo Invoice] Found existing product by x_product_id:', productIdNum);
      return productIdNum;
    }
  }

  // Fallback: search by name (for backward compatibility with old products)
  console.log('[Odoo Invoice] Product not found by x_product_id, searching by name:', product.name);
  
  const searchResults = await client.search('product.product', [
    ['name', 'ilike', product.name],
  ], { limit: 1 });

  if (searchResults.length > 0) {
    const productId = searchResults[0];
    // Ensure we return a number, not an array
    const productIdNum = Array.isArray(productId) ? productId[0] : (typeof productId === 'number' ? productId : Number(productId));
    console.log('[Odoo Invoice] Found existing product by name:', productIdNum);
    
    // Try to update with x_product_id if available (for migration)
    if (product.id) {
      try {
        await client.write('product.product', [productIdNum], {
          x_product_id: product.id,
          x_product_type: product.type,
        });
        console.log('[Odoo Invoice] Updated product with x_product_id:', productIdNum);
      } catch (updateError) {
        // Non-blocking: custom fields may not exist
        console.warn('[Odoo Invoice] Could not update product with x_product_id (non-blocking):', updateError);
      }
    }
    
    return productIdNum;
  }

  // Product not found - this should not happen if products are synced properly
  // Log warning but don't create here (products should be synced via sync-products-to-odoo)
  console.warn('[Odoo Invoice] Product not found in Odoo. Please sync products using sync-products-to-odoo function.');
  console.warn('[Odoo Invoice] Product details:', { id: product.id, name: product.name, type: product.type });
  
  throw new Error(`Product not found in Odoo: ${product.name} (ID: ${product.id}). Please sync products first.`);
}

/**
 * Get account ID from environment variable
 * 
 * @param accountType - Account type ('REVENUE', 'COGS', 'STRIPE_FEE')
 * @returns Account ID or undefined
 */
function getAccountId(accountType: 'REVENUE' | 'COGS' | 'STRIPE_FEE'): number | undefined {
  const envVar = `OD_ACCOUNT_${accountType}_ID`;
  const value = Deno.env.get(envVar);
  if (value) {
    const id = parseInt(value, 10);
    if (!isNaN(id)) {
      return id;
    }
  }
  return undefined;
}

/**
 * Build product description for invoice line
 * 
 * @param bookingData - Booking data
 * @returns Product description string
 */
function buildProductDescription(bookingData: BookingDataForOdoo): string {
  const parts = [bookingData.product.name];
  
  if (bookingData.numberOfAdults > 0) {
    parts.push(`${bookingData.numberOfAdults} ${bookingData.numberOfAdults === 1 ? 'persona' : 'persone'}`);
  }
  
  if (bookingData.numberOfDogs > 0) {
    parts.push(`${bookingData.numberOfDogs} ${bookingData.numberOfDogs === 1 ? 'cane' : 'cani'}`);
  }
  
  if (bookingData.bookingDate) {
    parts.push(`Data: ${bookingData.bookingDate}`);
  }
  
  return parts.join(' - ');
}

/**
 * Build booking notes for invoice
 * 
 * @param bookingData - Booking data
 * @returns Notes string
 */
function buildBookingNotes(bookingData: BookingDataForOdoo): string {
  const notes = [
    `Booking ID: ${bookingData.bookingId}`,
    `Product: ${bookingData.product.name} (${bookingData.product.type})`,
    `Provider: ${bookingData.provider.name}`,
    `Adults: ${bookingData.numberOfAdults}`,
    `Dogs: ${bookingData.numberOfDogs}`,
  ];
  
  if (bookingData.orderNumber) {
    notes.push(`Order Number: ${bookingData.orderNumber}`);
  }
  
  if (bookingData.stripePaymentIntentId) {
    notes.push(`Payment Intent: ${bookingData.stripePaymentIntentId}`);
  }
  
  // Add financial breakdown
  if (bookingData.providerCostTotal !== null) {
    notes.push(`Provider Cost: €${bookingData.providerCostTotal.toFixed(2)}`);
  }
  
  if (bookingData.stripeFee !== null) {
    notes.push(`Stripe Fee: €${bookingData.stripeFee.toFixed(2)}`);
  }
  
  if (bookingData.netRevenue !== null) {
    notes.push(`Net Revenue: €${bookingData.netRevenue.toFixed(2)}`);
  }
  
  return notes.join('\n');
}


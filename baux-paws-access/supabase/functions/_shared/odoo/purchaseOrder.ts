/**
 * Odoo Purchase Order Integration
 * 
 * Functions for creating Purchase Orders in Odoo for supplier bookings.
 * 
 * This module handles the creation of Purchase Orders (PO) in Odoo
 * when a customer booking is completed, allowing automatic procurement
 * from the Italian supplier.
 */

import { createOdooClient } from './client.ts';
import type { OdooConfig, BookingDataForOdoo, OdooPurchaseOrderResult } from './types.ts';

/**
 * Create or update a Purchase Order in Odoo for a booking
 * 
 * IMPORTANT: This function implements a 1-to-1 relationship between Product and PO.
 * - 1 PO = 1 Product + 1 Supplier + N Bookings (all bookings for that product)
 * - If a PO already exists for this product+supplier (draft state), adds a new line
 * - If no PO exists, creates a new PO with the first line
 * - PO remains in draft state for manual review
 * 
 * This function creates/updates a PO in Odoo with:
 * - Supplier: Provider partner (complete with all details)
 * - Product: Service/product from booking
 * - Each booking becomes a line in the PO
 * - Cost: provider_cost_total from booking
 * - Link: References the sale.order via custom fields
 * 
 * @param config - Odoo configuration
 * @param bookingData - Booking data with financial information
 * @returns Purchase Order creation/update result
 */
export async function createOdooPurchaseOrder(
  config: OdooConfig,
  bookingData: BookingDataForOdoo
): Promise<OdooPurchaseOrderResult> {
  const logContext = {
    bookingId: bookingData.bookingId,
    providerName: bookingData.provider.name,
    productName: bookingData.product.name,
  };

  try {
    console.log('[Odoo PO] ========================================');
    console.log('[Odoo PO] Creating Purchase Order for booking:', logContext);
    console.log('[Odoo PO] Provider Cost Total:', bookingData.providerCostTotal);
    console.log('[Odoo PO] ========================================');

    // Validate required data
    if (!bookingData.providerCostTotal || bookingData.providerCostTotal <= 0) {
      const error = 'provider_cost_total is missing or invalid';
      console.error('[Odoo PO] Validation error:', error);
      return {
        success: false,
        error,
        errorDetails: { bookingData: logContext },
      };
    }

    const client = createOdooClient(config);

    // 1. Find or create supplier partner (provider) in Odoo
    console.log('[Odoo PO] Step 1: Finding/creating supplier partner...');
    const supplierPartnerIdRaw = await findOrCreateSupplierPartner(
      client,
      bookingData.provider
    );

    if (!supplierPartnerIdRaw) {
      const error = 'Failed to find or create supplier partner';
      console.error('[Odoo PO] Error:', error);
      return {
        success: false,
        error,
        errorDetails: { provider: bookingData.provider },
      };
    }

    // Ensure supplierPartnerId is always a number, not an array
    const supplierPartnerId: number = Array.isArray(supplierPartnerIdRaw) 
      ? supplierPartnerIdRaw[0] 
      : (typeof supplierPartnerIdRaw === 'number' ? supplierPartnerIdRaw : Number(supplierPartnerIdRaw));

    if (isNaN(supplierPartnerId) || supplierPartnerId <= 0) {
      const error = 'Invalid supplier partner ID returned from Odoo';
      console.error('[Odoo PO] Error:', error, { supplierPartnerIdRaw, supplierPartnerId });
      return {
        success: false,
        error,
        errorDetails: { provider: bookingData.provider, supplierPartnerIdRaw },
      };
    }

    console.log('[Odoo PO] Supplier partner ID:', supplierPartnerId);

    // 2. Find or create product in Odoo
    console.log('[Odoo PO] Step 2: Finding/creating product...');
    const productIdRaw = await findOrCreateProduct(
      client,
      bookingData.product
    );

    if (!productIdRaw) {
      const error = 'Failed to find or create product';
      console.error('[Odoo PO] Error:', error);
      return {
        success: false,
        error,
        errorDetails: { product: bookingData.product },
      };
    }

    // Ensure productId is always a number, not an array
    // Odoo's create/search methods might return arrays in some cases
    let productId: number;
    if (Array.isArray(productIdRaw)) {
      productId = productIdRaw[0];
      console.warn('[Odoo PO] Product ID was an array, using first element:', productId);
    } else {
      productId = typeof productIdRaw === 'number' ? productIdRaw : Number(productIdRaw);
    }

    if (isNaN(productId) || productId <= 0) {
      const error = 'Invalid product ID returned from Odoo';
      console.error('[Odoo PO] Error:', error, { productIdRaw, productId });
      return {
        success: false,
        error,
        errorDetails: { product: bookingData.product, productIdRaw },
      };
    }

    console.log('[Odoo PO] Product ID:', productId);

    // 3. Find existing PO for this product + supplier (draft state only)
    console.log('[Odoo PO] Step 3: Searching for existing PO (product + supplier, draft)...');
    let existingPoId: number | null = null;
    let existingPo: Record<string, unknown> | null = null;

    try {
      // Search for draft PO with this product and supplier
      // Strategy: Search by custom field x_product_id first (if exists), then fallback to order lines
      
      // Try to search by custom field (most efficient if field exists)
      let poSearchResults: number[] = [];
      
      try {
        // First attempt: search by custom field x_product_id
        poSearchResults = await client.search('purchase.order', [
          ['partner_id', '=', supplierPartnerId],
          ['state', '=', 'draft'],
          ['x_product_id', '=', bookingData.product.id], // Custom field for product ID
        ], { limit: 1 });
        
        if (poSearchResults.length > 0) {
          // Ensure it's a number
          const poIdValue = Array.isArray(poSearchResults[0]) ? poSearchResults[0][0] : poSearchResults[0];
          existingPoId = typeof poIdValue === 'number' ? poIdValue : Number(poIdValue);
          console.log('[Odoo PO] Found existing PO by custom field x_product_id:', existingPoId);
        }
      } catch (error) {
        // Custom field might not exist, fallback to order line search
        console.log('[Odoo PO] Custom field x_product_id not available, using order line search');
      }

      // Fallback: search by order lines if custom field search didn't work
      if (!existingPoId) {
        console.log('[Odoo PO] Custom field search didn\'t find PO, trying order line search...');
        poSearchResults = await client.search('purchase.order', [
          ['partner_id', '=', supplierPartnerId],
          ['state', '=', 'draft'],
        ]);

        console.log(`[Odoo PO] Found ${poSearchResults.length} draft PO(s) for this supplier`);

        if (poSearchResults.length > 0) {
          // Read PO details to check order lines
          // Limit to first 10 POs to avoid reading too many
          const posToCheck = poSearchResults.slice(0, 10);
          const pos = await client.read('purchase.order', posToCheck, [
            'id',
            'name',
            'partner_id',
            'order_line',
          ]);

          // Find PO that has this product in order lines
          for (const po of pos) {
            if (Array.isArray(po.order_line) && po.order_line.length > 0) {
              const orderLineIds = po.order_line as number[];
              
              try {
                const orderLines = await client.read('purchase.order.line', orderLineIds, ['product_id']);
                
                const hasProduct = orderLines.some((line: Record<string, unknown>) => {
                  // Odoo returns product_id as [id, name] tuple
                  if (Array.isArray(line.product_id)) {
                    return line.product_id[0] === productId;
                  }
                  return line.product_id === productId;
                });

                if (hasProduct) {
                  // Ensure po.id is a number, not a list
                  const poIdValue = Array.isArray(po.id) ? po.id[0] : po.id;
                  existingPoId = typeof poIdValue === 'number' ? poIdValue : Number(poIdValue);
                  existingPo = po;
                  console.log('[Odoo PO] Found existing PO with matching product in order lines:', existingPoId);
                  break;
                }
              } catch (lineError) {
                console.warn('[Odoo PO] Error reading order lines for PO', po.id, '(non-blocking):', lineError);
                // Continue to next PO
              }
            }
          }

          if (!existingPoId && poSearchResults.length > 10) {
            console.warn(`[Odoo PO] Found ${poSearchResults.length} draft POs but only checked first 10. Consider using custom field x_product_id for better performance.`);
          }
        }
      }

      if (!existingPoId) {
        console.log('[Odoo PO] No existing PO found, will create new one');
      }
    } catch (error) {
      console.warn('[Odoo PO] Error searching for existing PO (non-blocking):', error);
      // Continue: will create new PO
    }

    // 4. Find related sale.order (if exists) for linking
    console.log('[Odoo PO] Step 4: Finding related sale.order...');
    let saleOrderId: number | null = null;
    let saleOrderName: string | null = null;
    let saleOrderLineId: number | null = null; // ID of the sale order line to link

    if (bookingData.stripePaymentIntentId) {
      try {
        // Search by client_order_ref (payment intent ID)
        const saleOrderIds = await client.search('sale.order', [
          ['client_order_ref', '=', bookingData.stripePaymentIntentId],
        ], { limit: 1 });

        if (saleOrderIds.length > 0) {
          saleOrderId = saleOrderIds[0];
          const saleOrders = await client.read('sale.order', [saleOrderId], ['name', 'order_line']);
          if (saleOrders.length > 0) {
            saleOrderName = saleOrders[0].name || null;
            
            // Get the first order line from the SO (should be the one for this booking)
            // In Odoo, order_line is a One2many field that returns an array of IDs
            const soOrderLineIds = saleOrders[0].order_line as number[] | undefined;
            if (soOrderLineIds && soOrderLineIds.length > 0) {
              // Use the first order line (or find the one matching the product)
              // For now, we'll use the first one since each SO typically has one line per booking
              saleOrderLineId = soOrderLineIds[0];
              console.log('[Odoo PO] Found sale order line ID:', saleOrderLineId);
              
              // Optional: Verify the order line matches the product
              try {
                const soLines = await client.read('sale.order.line', [saleOrderLineId], ['product_id']);
                if (soLines.length > 0 && soLines[0].product_id) {
                  const soProductId = Array.isArray(soLines[0].product_id) 
                    ? soLines[0].product_id[0] 
                    : soLines[0].product_id;
                  if (soProductId !== productId) {
                    console.warn('[Odoo PO] Sale order line product mismatch:', {
                      soProductId,
                      poProductId: productId,
                    });
                    // Still use it, but log the warning
                  }
                }
              } catch (lineReadError) {
                console.warn('[Odoo PO] Could not verify sale order line (non-blocking):', lineReadError);
              }
            } else {
              console.warn('[Odoo PO] Sale order found but has no order lines');
            }
          }
          console.log('[Odoo PO] Found related sale.order:', saleOrderId, saleOrderName);
        } else {
          console.log('[Odoo PO] No sale.order found for payment intent:', bookingData.stripePaymentIntentId);
        }
      } catch (error) {
        console.warn('[Odoo PO] Error searching for sale.order (non-blocking):', error);
        // Continue: PO can be created without sale.order link
      }
    }

    // 5. Build new order line for this booking
    // Include Sales Order number in description for traceability and duplicate detection
    const newOrderLineBase = {
      product_id: productId,
      name: buildProductDescription(bookingData, saleOrderName),
      product_qty: 1, // Always 1 for service bookings
      price_unit: bookingData.providerCostTotal,
    };

    // Add custom fields to order line for tracking (if they exist in Odoo)
    // These will be silently ignored if fields don't exist
    // IMPORTANT: Add sale_line_id to link PO line to SO line (Make to Order connection)
    const newOrderLineWithCustomFields: Record<string, unknown> = {
      ...newOrderLineBase,
      x_booking_id: bookingData.bookingId,
      x_stripe_payment_id: bookingData.stripePaymentIntentId || null,
      x_sale_order_id: saleOrderId,
      x_customer_email: bookingData.customer.email,
      x_customer_name: bookingData.customer.fullName || bookingData.customer.email,
    };
    
    // Add sale_line_id to link PO line to SO line (Odoo native Make to Order connection)
    if (saleOrderLineId) {
      newOrderLineWithCustomFields.sale_line_id = saleOrderLineId;
      console.log('[Odoo PO] Will link PO line to SO line:', saleOrderLineId);
    }

    let poId: number;

    if (existingPoId) {
      // 6a. Add line to existing PO
      console.log('[Odoo PO] Step 5: Adding line to existing PO:', existingPoId);
      
      // Ensure existingPoId is a number
      const poIdToUpdate = typeof existingPoId === 'number' ? existingPoId : Number(existingPoId);
      
      // Check for duplicate: verify if a line for this Sales Order already exists in this PO
      // We use the Sales Order number (e.g., "S00052") as the unique identifier
      try {
        // If we don't have a sale order, we can't check for duplicates by SO number
        // In this case, we'll still try to add the line (it will be identified by booking ID in description)
        if (!saleOrderName) {
          console.log('[Odoo PO] No Sales Order found, cannot check for duplicates by SO number. Will proceed with line creation.');
        } else {
          const existingPoData = existingPo || await client.read('purchase.order', [poIdToUpdate], ['order_line'])[0];
          if (existingPoData && Array.isArray(existingPoData.order_line) && existingPoData.order_line.length > 0) {
            const orderLineIds = existingPoData.order_line as number[];
            
            // Read all order lines to check for duplicates by Sales Order number
            const existingLines = await client.read('purchase.order.line', orderLineIds, ['name']);
            
            // Check if a line for this Sales Order already exists
            // We check by Sales Order number in the description (e.g., "SO: S00052")
            const isDuplicate = existingLines.some((line: Record<string, unknown>) => {
              if (line.name && typeof line.name === 'string') {
                // Check for Sales Order number in description
                // Description format: "Cliente: ... | SO: S00052 | ..."
                if (line.name.includes(`SO: ${saleOrderName}`) || 
                    line.name.includes(`Sales Order: ${saleOrderName}`) ||
                    line.name.includes(saleOrderName)) {
                  return true;
                }
              }
              return false;
            });
            
            if (isDuplicate) {
              console.log('[Odoo PO] ⚠️ Line for this Sales Order already exists in PO. Skipping duplicate creation.');
              console.log('[Odoo PO] Sales Order:', saleOrderName);
              console.log('[Odoo PO] Booking ID:', bookingData.bookingId);
              poId = poIdToUpdate;
              return {
                success: true,
                purchaseOrderId: poId,
                skipped: true,
                reason: `Duplicate line already exists for Sales Order ${saleOrderName}`,
              };
            }
          }
        }
      } catch (duplicateCheckError) {
        console.warn('[Odoo PO] Warning: Could not check for duplicates (non-blocking):', duplicateCheckError);
        // Continue: will try to add line anyway
      }
      
      // Alternative approach: Create order line directly instead of using write on PO
      // This avoids the Odoo internal error "unhashable type: 'list'"
      try {
        // Create order line directly with order_id reference
        const orderLineValues: Record<string, unknown> = {
          order_id: poIdToUpdate,
          product_id: newOrderLineBase.product_id,
          name: newOrderLineBase.name,
          product_qty: newOrderLineBase.product_qty,
          price_unit: newOrderLineBase.price_unit,
        };

        // Add custom fields if they exist
        const orderLineWithCustomFields: Record<string, unknown> = {
          ...orderLineValues,
          x_booking_id: newOrderLineWithCustomFields.x_booking_id,
          x_stripe_payment_id: newOrderLineWithCustomFields.x_stripe_payment_id,
          x_sale_order_id: newOrderLineWithCustomFields.x_sale_order_id,
          x_customer_email: newOrderLineWithCustomFields.x_customer_email,
          x_customer_name: newOrderLineWithCustomFields.x_customer_name,
        };
        
        // Add sale_line_id to link PO line to SO line (Odoo native Make to Order connection)
        if (saleOrderLineId) {
          orderLineWithCustomFields.sale_line_id = saleOrderLineId;
          console.log('[Odoo PO] Will link PO line to SO line:', saleOrderLineId);
        }
        
        // Also update the PO to link it to the SO via sale_order_ids (if field exists)
        if (saleOrderId) {
          try {
            // Read current sale_order_ids to append, not replace
            const currentPo = await client.read('purchase.order', [poIdToUpdate], ['sale_order_ids']);
            const currentSoIds = currentPo[0]?.sale_order_ids as number[] | undefined || [];
            
            // Add the new SO ID if not already present
            if (!currentSoIds.includes(saleOrderId)) {
              const updatedSoIds = [...currentSoIds, saleOrderId];
              await client.write('purchase.order', [poIdToUpdate], {
                sale_order_ids: [[6, 0, updatedSoIds]],
              });
              console.log('[Odoo PO] Linked PO to SO via sale_order_ids:', saleOrderId);
            } else {
              console.log('[Odoo PO] PO already linked to SO:', saleOrderId);
            }
          } catch (soLinkError) {
            // Field might not exist - that's OK
            const errorMsg = soLinkError instanceof Error ? soLinkError.message : String(soLinkError);
            if (errorMsg.includes('sale_order_ids') || errorMsg.includes('Invalid field')) {
              console.log('[Odoo PO] ℹ️ sale_order_ids field does not exist, using origin and sale_line_id only');
            } else {
              console.warn('[Odoo PO] Could not link PO to SO via sale_order_ids (non-blocking):', soLinkError);
            }
          }
        }

        try {
          // Try with custom fields first
          await client.create('purchase.order.line', orderLineWithCustomFields);
          poId = poIdToUpdate;
          console.log('[Odoo PO] ✅ Line added to existing PO with custom fields (via direct create):', poId);
        } catch (customFieldError: unknown) {
          const errorMsg = customFieldError instanceof Error ? customFieldError.message : String(customFieldError);
          const isCustomFieldError = errorMsg.includes('x_booking_id') ||
                                     errorMsg.includes('x_stripe_payment_id') ||
                                     errorMsg.includes('x_sale_order_id') ||
                                     errorMsg.includes('x_customer_email') ||
                                     errorMsg.includes('x_customer_name') ||
                                     errorMsg.includes('unknown field');

          if (isCustomFieldError) {
            console.warn('[Odoo PO] Creating line with custom fields failed, retrying without them:', errorMsg);
            // Try without custom fields
            await client.create('purchase.order.line', orderLineValues);
            poId = poIdToUpdate;
            console.log('[Odoo PO] ✅ Line added to existing PO without custom fields (via direct create):', poId);
            console.warn('[Odoo PO] Custom fields were not added to order line. Please verify that custom fields exist in Odoo.');
          } else {
            throw customFieldError;
          }
        }
      } catch (addLineError) {
        console.error('[Odoo PO] Error adding line to existing PO (via direct create):', addLineError);
        throw addLineError;
      }
    } else {
      // 6b. Create new PO with first line
      console.log('[Odoo PO] Step 5: Creating new PO...');
      
      // Build origin string
      const originParts: string[] = [];
      if (saleOrderName) {
        originParts.push(`SO: ${saleOrderName}`);
      }
      originParts.push(`Product: ${bookingData.product.name}`);
      const origin = originParts.join(' | ');

      const poValues: Record<string, unknown> = {
        partner_id: supplierPartnerId,
        date_order: bookingData.bookingDate,
        origin: origin,
        // Note: In Odoo 19, the field is 'note' (singular), not 'notes'
        note: `PO for ${bookingData.product.name} - ${bookingData.provider.name}\n` +
              `All bookings for this product will be added to this PO.`,
        order_line: [[0, 0, newOrderLineWithCustomFields]],
      };
      
      // Link PO to SO using sale_order_ids (Many2many field for Make to Order connection)
      // NOTE: This field might not exist in all Odoo versions - we'll try and fallback gracefully
      if (saleOrderId) {
        try {
          // Try to set sale_order_ids - will fail gracefully if field doesn't exist
          poValues.sale_order_ids = [[6, 0, [saleOrderId]]];
          console.log('[Odoo PO] Will link PO to SO via sale_order_ids:', saleOrderId);
        } catch (error) {
          console.warn('[Odoo PO] sale_order_ids field might not exist, will use origin and sale_line_id only');
        }
      }

      // Add custom fields to PO (if they exist in Odoo)
      if (bookingData.product.id) {
        poValues.x_product_id = bookingData.product.id; // Key field for grouping
      }
      if (bookingData.product.type) {
        poValues.x_product_type = bookingData.product.type;
      }
      if (bookingData.provider.id) {
        poValues.x_provider_id = bookingData.provider.id;
      }

      // Try to create with custom fields, fallback without them if they cause errors
      try {
        console.log('[Odoo PO] Attempting to create PO with custom fields...');
        const poIdRaw = await client.create('purchase.order', poValues);
        // Ensure poId is always a number, not an array
        poId = Array.isArray(poIdRaw) ? poIdRaw[0] : (typeof poIdRaw === 'number' ? poIdRaw : Number(poIdRaw));
        console.log('[Odoo PO] ✅ New PO created successfully with custom fields, ID:', poId);
        
        // Try to link PO to SO via sale_order_ids (if field exists)
        // NOTE: sale_order_ids might not exist in all Odoo versions
        if (saleOrderId) {
          try {
            await client.write('purchase.order', [poId], {
              sale_order_ids: [[6, 0, [saleOrderId]]],
            });
            console.log('[Odoo PO] ✅ PO linked to SO via sale_order_ids');
          } catch (soLinkError) {
            // Field might not exist - that's OK, we use origin and sale_line_id
            const errorMsg = soLinkError instanceof Error ? soLinkError.message : String(soLinkError);
            if (errorMsg.includes('sale_order_ids') || errorMsg.includes('Invalid field')) {
              console.log('[Odoo PO] ℹ️ sale_order_ids field does not exist in Odoo, using origin and sale_line_id only');
            } else {
              console.warn('[Odoo PO] Could not link PO to SO via sale_order_ids (non-blocking):', soLinkError);
            }
          }
        }
      } catch (createError: unknown) {
        const errorMessage = createError instanceof Error ? createError.message : String(createError);
        const isCustomFieldError = errorMessage.includes('x_product_id') ||
                                   errorMessage.includes('x_product_type') ||
                                   errorMessage.includes('x_provider_id') ||
                                   errorMessage.includes('unknown field');

        if (isCustomFieldError) {
          console.warn('[Odoo PO] PO creation failed with custom fields, retrying without them:', errorMessage);
          // Remove custom fields from PO and order lines, then try again
          const poValuesWithoutCustomFields = { ...poValues };
          delete poValuesWithoutCustomFields.x_product_id;
          delete poValuesWithoutCustomFields.x_product_type;
          delete poValuesWithoutCustomFields.x_provider_id;
          
          // Also remove custom fields from order line
          if (Array.isArray(poValuesWithoutCustomFields.order_line) && 
              poValuesWithoutCustomFields.order_line.length > 0 &&
              Array.isArray(poValuesWithoutCustomFields.order_line[0]) &&
              poValuesWithoutCustomFields.order_line[0].length > 2) {
            const orderLineData = poValuesWithoutCustomFields.order_line[0][2] as Record<string, unknown>;
            const orderLineWithoutCustomFields = { ...orderLineData };
            delete orderLineWithoutCustomFields.x_booking_id;
            delete orderLineWithoutCustomFields.x_stripe_payment_id;
            delete orderLineWithoutCustomFields.x_sale_order_id;
            delete orderLineWithoutCustomFields.x_customer_email;
            delete orderLineWithoutCustomFields.x_customer_name;
            poValuesWithoutCustomFields.order_line = [[0, 0, orderLineWithoutCustomFields]];
          }

          try {
            const poIdRaw = await client.create('purchase.order', poValuesWithoutCustomFields);
            // Ensure poId is always a number, not an array
            poId = Array.isArray(poIdRaw) ? poIdRaw[0] : (typeof poIdRaw === 'number' ? poIdRaw : Number(poIdRaw));
            console.log('[Odoo PO] ✅ New PO created successfully without custom fields, ID:', poId);
            
            // Try to link to SO via sale_order_ids (if field exists)
            if (saleOrderId) {
              try {
                await client.write('purchase.order', [poId], {
                  sale_order_ids: [[6, 0, [saleOrderId]]],
                });
                console.log('[Odoo PO] ✅ Linked PO to SO via sale_order_ids (after creation)');
              } catch (soLinkError) {
                // Field might not exist - that's OK
                const errorMsg = soLinkError instanceof Error ? soLinkError.message : String(soLinkError);
                if (errorMsg.includes('sale_order_ids') || errorMsg.includes('Invalid field')) {
                  console.log('[Odoo PO] ℹ️ sale_order_ids field does not exist, using origin and sale_line_id only');
                } else {
                  console.warn('[Odoo PO] Could not link PO to SO (non-blocking):', soLinkError);
                }
              }
            }
            
            // Try to update the order line with sale_line_id
            if (saleOrderLineId) {
              try {
                const createdPo = await client.read('purchase.order', [poId], ['order_line']);
                const orderLineIds = createdPo[0]?.order_line as number[] | undefined;
                if (orderLineIds && orderLineIds.length > 0) {
                  await client.write('purchase.order.line', [orderLineIds[0]], {
                    sale_line_id: saleOrderLineId,
                  });
                  console.log('[Odoo PO] ✅ Linked PO line to SO line via sale_line_id');
                }
              } catch (lineLinkError) {
                console.warn('[Odoo PO] Could not link PO line to SO line (non-blocking):', lineLinkError);
              }
            }
            console.warn('[Odoo PO] Custom fields were not added. Please verify that custom fields exist in Odoo.');
          } catch (retryError) {
            console.error('[Odoo PO] Error creating PO even without custom fields:', retryError);
            throw retryError;
          }
        } else {
          throw createError;
        }
      }
    }

    console.log('[Odoo PO] ✅ Purchase Order processed successfully');
    console.log('[Odoo PO] PO ID:', poId);
    console.log('[Odoo PO] Action:', existingPoId ? 'Line added to existing PO' : 'New PO created');
    console.log('[Odoo PO] Product:', bookingData.product.name);
    console.log('[Odoo PO] Supplier:', bookingData.provider.name);
    console.log('[Odoo PO] Booking ID:', bookingData.bookingId);
    console.log('[Odoo PO] ========================================');

    return {
      success: true,
      purchaseOrderId: poId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[Odoo PO] ========================================');
    console.error('[Odoo PO] ❌ Error creating Purchase Order');
    console.error('[Odoo PO] Error message:', errorMessage);
    console.error('[Odoo PO] Error stack:', errorStack);
    console.error('[Odoo PO] Booking context:', logContext);
    console.error('[Odoo PO] ========================================');
    
    return {
      success: false,
      error: errorMessage,
      errorDetails: {
        error,
        stack: errorStack,
        bookingData: logContext,
      },
    };
  }
}

/**
 * Find or create supplier partner in Odoo
 * 
 * Creates a complete supplier partner with all available provider information:
 * - company_name (name)
 * - contact_name (contact person)
 * - email
 * - phone
 * - is_company: true
 * - supplier_rank: 1 (marks as supplier)
 * 
 * @param client - Odoo client instance
 * @param provider - Provider information from booking
 * @returns Partner ID or null if creation fails
 */
async function findOrCreateSupplierPartner(
  client: Awaited<ReturnType<typeof createOdooClient>>,
  provider: BookingDataForOdoo['provider']
): Promise<number | null> {
  if (!provider.name || provider.name === 'Unknown Provider') {
    console.error('[Odoo PO] Cannot create supplier partner: name is missing or unknown');
    return null;
  }

  console.log('[Odoo PO] Searching for supplier partner:', provider.name);

  // Search for existing provider partner by name (as company)
  const searchResults = await client.search('res.partner', [
    ['name', '=', provider.name],
    ['is_company', '=', true],
  ], { limit: 1 });

  if (searchResults.length > 0) {
    const partnerIdRaw = searchResults[0];
    // Ensure we return a number, not an array
    const partnerId = Array.isArray(partnerIdRaw) ? partnerIdRaw[0] : (typeof partnerIdRaw === 'number' ? partnerIdRaw : Number(partnerIdRaw));
    console.log('[Odoo PO] Found existing supplier partner:', partnerId);

    // Update partner with latest information (email, phone)
    // NOTE: Temporarily disabled due to Odoo internal error "unhashable type: 'list'"
    // This appears to be an Odoo bug when updating partners that have related records
    // The partner exists and can be used, update is optional
    /*
    const updateData: Record<string, unknown> = {};
    
    if (provider.email) {
      updateData.email = provider.email;
    }
    
    if (provider.phone) {
      updateData.phone = provider.phone;
    }
    
    // Note: contact_name is stored in a separate contact record in Odoo
    // For now, we'll store it in a comment or custom field if available
    // The main partner record uses company_name as 'name'
    
    try {
      await client.write('res.partner', [partnerId], updateData);
      console.log('[Odoo PO] Updated supplier partner with latest info');
    } catch (error) {
      console.warn('[Odoo PO] Warning: Could not update supplier partner (non-blocking):', error);
      // Continue: partner exists, update is optional
    }
    */
    console.log('[Odoo PO] Using existing supplier partner (update skipped due to Odoo internal error)');

    return partnerId;
  }

  // Create new supplier partner
  console.log('[Odoo PO] Creating new supplier partner:', provider.name);
  
  const partnerValues: Record<string, unknown> = {
    name: provider.name, // company_name
    is_company: true, // Mark as company/provider
    supplier_rank: 1, // Mark as supplier for purchase orders
  };

  if (provider.email) {
    partnerValues.email = provider.email;
  }

  if (provider.phone) {
    partnerValues.phone = provider.phone;
  }

  // Note: In Odoo, contact_name for a company is typically stored in a child contact
  // For now, we'll add it to the comment/notes if needed
  // The main partner uses company_name as 'name'
  // If contact_name is needed, it can be added as a child contact later

  try {
    const newPartnerIdRaw = await client.create('res.partner', partnerValues);
    // Ensure we return a number, not an array
    const newPartnerId = Array.isArray(newPartnerIdRaw) ? newPartnerIdRaw[0] : (typeof newPartnerIdRaw === 'number' ? newPartnerIdRaw : Number(newPartnerIdRaw));
    console.log('[Odoo PO] Created new supplier partner:', newPartnerId);
    return newPartnerId;
  } catch (error) {
    console.error('[Odoo PO] Error creating supplier partner:', error);
    return null;
  }
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
 * @returns Product ID or null if creation fails
 */
async function findOrCreateProduct(
  client: Awaited<ReturnType<typeof createOdooClient>>,
  product: BookingDataForOdoo['product']
): Promise<number | null> {
  // Check for environment variable override
  const envProductId = Deno.env.get('OD_PRODUCT_ID');
  if (envProductId) {
    const productId = parseInt(envProductId, 10);
    if (!isNaN(productId)) {
      console.log('[Odoo PO] Using product ID from environment variable:', productId);
      return productId;
    }
  }

  // Use x_product_id (UUID) to find product - ensures 1-to-1 mapping
  if (product.id) {
    console.log('[Odoo PO] Searching for product by x_product_id:', product.id);
    
    const searchResults = await client.search('product.product', [
      ['x_product_id', '=', product.id],
    ], { limit: 1 });

    if (searchResults.length > 0) {
      const productId = searchResults[0];
      // Ensure we return a number, not an array
      const productIdNum = Array.isArray(productId) ? productId[0] : (typeof productId === 'number' ? productId : Number(productId));
      console.log('[Odoo PO] Found existing product by x_product_id:', productIdNum);
      return productIdNum;
    }
  }

  // Fallback: search by name (for backward compatibility with old products)
  console.log('[Odoo PO] Product not found by x_product_id, searching by name:', product.name);
  
  const searchResults = await client.search('product.product', [
    ['name', 'ilike', product.name],
  ], { limit: 1 });

  if (searchResults.length > 0) {
    const productId = searchResults[0];
    // Ensure we return a number, not an array
    const productIdNum = Array.isArray(productId) ? productId[0] : (typeof productId === 'number' ? productId : Number(productId));
    console.log('[Odoo PO] Found existing product by name:', productIdNum);
    
    // Try to update with x_product_id if available (for migration)
    if (product.id) {
      try {
        await client.write('product.product', [productIdNum], {
          x_product_id: product.id,
          x_product_type: product.type,
        });
        console.log('[Odoo PO] Updated product with x_product_id:', productIdNum);
      } catch (updateError) {
        // Non-blocking: custom fields may not exist
        console.warn('[Odoo PO] Could not update product with x_product_id (non-blocking):', updateError);
      }
    }
    
    return productIdNum;
  }

  // Product not found - this should not happen if products are synced properly
  // Log warning but don't create here (products should be synced via sync-products-to-odoo)
  console.warn('[Odoo PO] Product not found in Odoo. Please sync products using sync-products-to-odoo function.');
  console.warn('[Odoo PO] Product details:', { id: product.id, name: product.name, type: product.type });
  
  return null;
}

/**
 * Build product description for PO line
 * 
 * Creates a detailed description for each order line that includes:
 * - Sales Order number (for traceability and duplicate detection)
 * - Product name
 * - Customer details (name/email)
 * - Booking details (adults, dogs, date)
 * - Booking ID for reference
 * 
 * @param bookingData - Booking data
 * @param saleOrderName - Sales Order number (e.g., "S00052") - optional but recommended
 * @returns Product description string for order line
 */
function buildProductDescription(bookingData: BookingDataForOdoo, saleOrderName?: string | null): string {
  const parts: string[] = [];
  
  // Sales Order number (PRIMARY identifier for duplicate detection and traceability)
  if (saleOrderName) {
    parts.push(`SO: ${saleOrderName}`);
  }
  
  // Customer identification
  const customerName = bookingData.customer.fullName || 
                       `${bookingData.customer.firstName || ''} ${bookingData.customer.lastName || ''}`.trim() ||
                       bookingData.customer.email ||
                       'Cliente';
  parts.push(`Cliente: ${customerName}`);
  
  // Product name
  parts.push(bookingData.product.name);
  
  // Booking details
  const bookingDetails: string[] = [];
  if (bookingData.numberOfAdults > 0) {
    bookingDetails.push(`${bookingData.numberOfAdults} ${bookingData.numberOfAdults === 1 ? 'persona' : 'persone'}`);
  }
  if (bookingData.numberOfDogs > 0) {
    bookingDetails.push(`${bookingData.numberOfDogs} ${bookingData.numberOfDogs === 1 ? 'cane' : 'cani'}`);
  }
  if (bookingDetails.length > 0) {
    parts.push(`(${bookingDetails.join(', ')})`);
  }
  
  // Date
  if (bookingData.bookingDate) {
    parts.push(`Data: ${bookingData.bookingDate}`);
  }
  
  // Booking ID for reference (secondary identifier)
  parts.push(`[Booking: ${bookingData.bookingId.substring(0, 8)}...]`);
  
  return parts.join(' - ');
}


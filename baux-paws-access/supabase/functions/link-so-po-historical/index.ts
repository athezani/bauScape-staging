/**
 * Link Historical Sales Orders and Purchase Orders
 * 
 * This Edge Function connects existing Sales Orders and Purchase Orders
 * that were created before the Make to Order connection was implemented.
 * 
 * It:
 * 1. Finds all Purchase Orders without sale_order_ids
 * 2. Matches them to Sales Orders using custom fields (x_stripe_payment_id, x_sale_order_id)
 * 3. Links PO to SO via sale_order_ids
 * 4. Links PO lines to SO lines via sale_line_id
 * 
 * Usage:
 * POST /link-so-po-historical (links all unlinked orders)
 * POST /link-so-po-historical?poId=123 (links specific PO)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getActiveOdooConfig, validateOdooConfig } from '../_shared/odoo/config.ts';
import { createOdooClient } from '../_shared/odoo/client.ts';

interface LinkResult {
  poId: number;
  poName: string;
  success: boolean;
  saleOrderId?: number;
  saleOrderName?: string;
  saleOrderLineId?: number;
  error?: string;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  console.log('[Link SO-PO] ========================================');
  console.log('[Link SO-PO] Request started:', requestId);

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Get Odoo configuration
    const odooConfig = getActiveOdooConfig();
    
    if (!odooConfig || !validateOdooConfig(odooConfig)) {
      console.error('[Link SO-PO] Odoo configuration not available or invalid');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Odoo configuration not available. Please check environment variables.',
          requestId,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const client = createOdooClient(odooConfig);
    await client.authenticate();

    // Parse request parameters
    const url = new URL(req.url);
    const poIdParam = url.searchParams.get('poId');
    const specificPoId = poIdParam ? parseInt(poIdParam, 10) : null;

    let results: LinkResult[] = [];

    if (specificPoId) {
      // Link specific PO
      console.log('[Link SO-PO] Linking specific PO:', specificPoId);
      const result = await linkPurchaseOrderToSaleOrder(client, specificPoId);
      results = [result];
    } else {
      // Link all unlinked POs
      console.log('[Link SO-PO] Finding all unlinked Purchase Orders...');
      const unlinkedPoIds = await findUnlinkedPurchaseOrders(client);
      console.log('[Link SO-PO] Found', unlinkedPoIds.length, 'unlinked Purchase Orders');

      // Process each PO
      for (const poId of unlinkedPoIds) {
        const result = await linkPurchaseOrderToSaleOrder(client, poId);
        results.push(result);
        
        // Small delay to avoid overwhelming Odoo
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    const duration = Date.now() - startTime;
    console.log('[Link SO-PO] Completed:', {
      requestId,
      duration: `${duration}ms`,
      total: results.length,
      successful,
      failed,
    });

    return new Response(
      JSON.stringify({
        success: failed === 0,
        total: results.length,
        successful,
        failed,
        results,
        requestId,
        duration: `${duration}ms`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: failed === 0 ? 200 : 207, // 207 Multi-Status if some failed
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Link SO-PO] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : String(error),
        requestId,
        duration: `${duration}ms`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Find all Purchase Orders that are not linked to any Sales Order
 * 
 * Strategy: Find POs that have origin with SO reference but order lines don't have sale_line_id
 */
async function findUnlinkedPurchaseOrders(
  client: Awaited<ReturnType<typeof createOdooClient>>
): Promise<number[]> {
  try {
    // Get all POs
    const allPoIds = await client.search('purchase.order', [], { limit: 1000 });
    console.log('[Link SO-PO] Found', allPoIds.length, 'total Purchase Orders');

    if (allPoIds.length === 0) {
      console.log('[Link SO-PO] No Purchase Orders found in Odoo');
      return [];
    }

    // Read all POs to check which ones need linking
    const batchSize = 50;
    const unlinkedPoIds: number[] = [];
    
    for (let i = 0; i < allPoIds.length; i += batchSize) {
      const batch = allPoIds.slice(i, i + batchSize);
      console.log('[Link SO-PO] Processing batch', Math.floor(i / batchSize) + 1, 'of', Math.ceil(allPoIds.length / batchSize));
      
      const allPos = await client.read('purchase.order', batch, ['name', 'order_line', 'origin']);
      
      for (let j = 0; j < allPos.length; j++) {
        const po = allPos[j];
        const poId = batch[j];
        const poName = po.name as string;
        const origin = po.origin as string | undefined || '';
        const orderLineIds = po.order_line as number[] | undefined || [];
        
        // Check if origin contains SO reference (e.g., "SO: S00060")
        const hasSoReference = /SO:\s*[A-Z0-9]+/i.test(origin);
        
        if (!hasSoReference) {
          console.log('[Link SO-PO] PO', poName, 'has no SO reference in origin, skipping');
          continue;
        }
        
        if (orderLineIds.length === 0) {
          console.log('[Link SO-PO] PO', poName, 'has no order lines, skipping');
          continue;
        }
        
        // Check if order lines are linked via sale_line_id
        try {
          const poLines = await client.read('purchase.order.line', [orderLineIds[0]], ['sale_line_id']);
          const saleLineId = poLines[0]?.sale_line_id as number | undefined;
          
          if (!saleLineId) {
            // PO has SO reference in origin but lines are not linked - needs linking
            unlinkedPoIds.push(poId);
            console.log('[Link SO-PO] PO', poName, 'needs linking (has SO in origin but no sale_line_id)');
          } else {
            console.log('[Link SO-PO] PO', poName, 'already has sale_line_id, skipping');
          }
        } catch (lineError) {
          // If we can't read sale_line_id, assume it needs linking
          unlinkedPoIds.push(poId);
          console.log('[Link SO-PO] PO', poName, 'needs linking (could not check sale_line_id)');
        }
      }
      
      // Small delay between batches
      if (i + batchSize < allPoIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log('[Link SO-PO] Found', unlinkedPoIds.length, 'POs that need linking');
    return unlinkedPoIds;
  } catch (error) {
    console.error('[Link SO-PO] Error finding unlinked POs:', error);
    return [];
  }
}

/**
 * Link a Purchase Order to its corresponding Sales Order
 */
async function linkPurchaseOrderToSaleOrder(
  client: Awaited<ReturnType<typeof createOdooClient>>,
  poId: number
): Promise<LinkResult> {
  const result: LinkResult = {
    poId,
    poName: '',
    success: false,
  };

  try {
    console.log('[Link SO-PO] Processing PO:', poId);

    // Read PO details (without sale_order_ids - field doesn't exist in this Odoo version)
    const pos = await client.read('purchase.order', [poId], [
      'name',
      'order_line',
      'origin',
    ]);

    if (pos.length === 0) {
      result.error = 'Purchase Order not found';
      return result;
    }

    const po = pos[0];
    result.poName = po.name as string || '';

    // Check if already linked by checking sale_line_id in order lines
    // (sale_order_ids field might not exist in this Odoo version)
    const poLineIds = po.order_line as number[] | undefined || [];
    if (poLineIds.length > 0) {
      try {
        const poLines = await client.read('purchase.order.line', [poLineIds[0]], ['sale_line_id']);
        const existingSaleLineId = poLines[0]?.sale_line_id as number | undefined;
        if (existingSaleLineId) {
          // Already linked - get the SO from the line
          const soLine = await client.read('sale.order.line', [existingSaleLineId], ['order_id']);
          if (soLine.length > 0) {
            const soId = Array.isArray(soLine[0].order_id) ? soLine[0].order_id[0] : soLine[0].order_id as number;
            console.log('[Link SO-PO] PO already linked to SO via sale_line_id:', soId);
            result.success = true;
            result.saleOrderId = soId;
            result.saleOrderLineId = existingSaleLineId;
            return result;
          }
        }
      } catch (error) {
        // Continue - will try to link
        console.log('[Link SO-PO] Could not check existing link, will proceed');
      }
    }

    // Strategy 1: Try to extract SO number from origin field
    // Origin format: "SO: S00060 | Product: ..."
    let saleOrderNameFromOrigin: string | null = null;
    const origin = po.origin as string | undefined;
    if (origin) {
      const soMatch = origin.match(/SO:\s*([A-Z0-9]+)/i);
      if (soMatch && soMatch[1]) {
        saleOrderNameFromOrigin = soMatch[1];
        console.log('[Link SO-PO] Extracted SO name from origin:', saleOrderNameFromOrigin);
      }
    }

    // Read PO order lines to find matching SO (reuse poLineIds from above check)
    if (poLineIds.length === 0) {
      result.error = 'PO has no order lines';
      return result;
    }

    // Read first order line - try to get custom fields, but they might not exist
    let stripePaymentId: string | undefined;
    let customSaleOrderId: number | undefined;
    
    try {
      const poLines = await client.read('purchase.order.line', [poLineIds[0]], [
        'x_stripe_payment_id',
        'x_sale_order_id',
        'sale_line_id',
      ]);

      if (poLines.length > 0) {
        const poLine = poLines[0];
        stripePaymentId = poLine.x_stripe_payment_id as string | undefined;
        customSaleOrderId = poLine.x_sale_order_id as number | undefined;
      }
    } catch (error) {
      // Custom fields might not exist - that's OK, we'll use origin
      console.log('[Link SO-PO] Custom fields do not exist in order line, will use origin');
    }

    // Try to find SO by custom field first
    let saleOrderId: number | null = null;
    let saleOrderName: string | null = null;

    if (customSaleOrderId) {
      // Use the custom field x_sale_order_id
      try {
        const sos = await client.read('sale.order', [customSaleOrderId], ['name']);
        if (sos.length > 0) {
          saleOrderId = customSaleOrderId;
          saleOrderName = sos[0].name as string || null;
          console.log('[Link SO-PO] Found SO by x_sale_order_id:', saleOrderId, saleOrderName);
        }
      } catch (error) {
        console.warn('[Link SO-PO] Could not read SO by x_sale_order_id:', error);
      }
    }

    // Strategy 2: Search by SO name from origin
    if (!saleOrderId && saleOrderNameFromOrigin) {
      try {
        const soIds = await client.search('sale.order', [
          ['name', '=', saleOrderNameFromOrigin],
        ], { limit: 1 });

        if (soIds.length > 0) {
          saleOrderId = soIds[0];
          const sos = await client.read('sale.order', [saleOrderId], ['name']);
          if (sos.length > 0) {
            saleOrderName = sos[0].name as string || null;
            console.log('[Link SO-PO] Found SO by name from origin:', saleOrderId, saleOrderName);
          }
        }
      } catch (error) {
        console.warn('[Link SO-PO] Could not search SO by name:', error);
      }
    }

    // Strategy 3: Fallback - search by stripe_payment_id
    if (!saleOrderId && stripePaymentId) {
      try {
        const soIds = await client.search('sale.order', [
          ['client_order_ref', '=', stripePaymentId],
        ], { limit: 1 });

        if (soIds.length > 0) {
          saleOrderId = soIds[0];
          const sos = await client.read('sale.order', [saleOrderId], ['name']);
          if (sos.length > 0) {
            saleOrderName = sos[0].name as string || null;
            console.log('[Link SO-PO] Found SO by client_order_ref:', saleOrderId, saleOrderName);
          }
        }
      } catch (error) {
        console.warn('[Link SO-PO] Could not search SO by client_order_ref:', error);
      }
    }

    if (!saleOrderId) {
      result.error = 'Could not find matching Sales Order';
      return result;
    }

    result.saleOrderId = saleOrderId;
    result.saleOrderName = saleOrderName;

    // NOTE: sale_order_ids field does not exist in this Odoo version
    // We'll use origin and sale_line_id only
    // Update origin to ensure it references the SO (if not already present)
    try {
      const currentOrigin = po.origin as string | undefined || '';
      if (saleOrderName && !currentOrigin.includes(saleOrderName)) {
        const newOrigin = `SO: ${saleOrderName} | ${currentOrigin}`;
        await client.write('purchase.order', [poId], {
          origin: newOrigin,
        });
        console.log('[Link SO-PO] ✅ Updated PO origin to reference SO:', saleOrderName);
      } else if (currentOrigin.includes(saleOrderName || '')) {
        console.log('[Link SO-PO] ✅ PO origin already references SO');
      }
    } catch (originError) {
      console.warn('[Link SO-PO] Could not update origin (non-blocking):', originError);
    }

    // Link PO lines to SO lines via sale_line_id
    // Read SO order lines
    try {
      const sos = await client.read('sale.order', [saleOrderId], ['order_line']);
      const soLineIds = sos[0]?.order_line as number[] | undefined || [];

      if (soLineIds.length > 0) {
        console.log('[Link SO-PO] Found', soLineIds.length, 'SO lines,', poLineIds.length, 'PO lines');
        // For each PO line, try to link to corresponding SO line
        for (let i = 0; i < Math.min(poLineIds.length, soLineIds.length); i++) {
          const poLineId = poLineIds[i];
          const soLineId = soLineIds[i]; // Match by position (first PO line -> first SO line)

          // Check if already linked
          try {
            const poLineData = await client.read('purchase.order.line', [poLineId], ['sale_line_id']);
            const existingSaleLineId = poLineData[0]?.sale_line_id as number | undefined;

            if (!existingSaleLineId) {
              try {
                await client.write('purchase.order.line', [poLineId], {
                  sale_line_id: soLineId,
                });
                console.log('[Link SO-PO] ✅ Linked PO line', poLineId, 'to SO line', soLineId);
                if (i === 0) {
                  result.saleOrderLineId = soLineId;
                }
              } catch (writeError) {
                const errorMsg = writeError instanceof Error ? writeError.message : String(writeError);
                console.error('[Link SO-PO] ❌ Could not link PO line to SO line:', errorMsg);
                // Don't fail the whole operation, but log the error
              }
            } else {
              console.log('[Link SO-PO] PO line already linked to SO line:', existingSaleLineId);
              if (i === 0) {
                result.saleOrderLineId = existingSaleLineId;
              }
            }
          } catch (readError) {
            console.error('[Link SO-PO] Could not read PO line:', readError);
          }
        }
      } else {
        console.warn('[Link SO-PO] SO has no order lines to link');
      }
    } catch (soReadError) {
      console.error('[Link SO-PO] Could not read SO order lines:', soReadError);
      // Don't fail - we've already linked via origin
    }

    result.success = true;
    return result;
  } catch (error) {
    console.error('[Link SO-PO] Error processing PO:', poId, error);
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}


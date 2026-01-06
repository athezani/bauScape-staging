/**
 * Debug Purchase Orders Status
 * 
 * This function helps debug the status of Purchase Orders in Odoo
 * to understand why they might not be getting linked.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getActiveOdooConfig, validateOdooConfig } from '../_shared/odoo/config.ts';
import { createOdooClient } from '../_shared/odoo/client.ts';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const odooConfig = getActiveOdooConfig();
    
    if (!odooConfig || !validateOdooConfig(odooConfig)) {
      return new Response(
        JSON.stringify({ error: 'Odoo configuration not available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const client = createOdooClient(odooConfig);
    await client.authenticate();

    // Get all POs
    const allPoIds = await client.search('purchase.order', [], { limit: 100 });
    console.log('[Debug] Found', allPoIds.length, 'Purchase Orders');

    if (allPoIds.length === 0) {
      return new Response(
        JSON.stringify({
          total: 0,
          message: 'No Purchase Orders found in Odoo',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Read PO details (without sale_order_ids - might not exist)
    // First, try to read without sale_order_ids to see what fields are available
    const pos = await client.read('purchase.order', allPoIds, [
      'name',
      'order_line',
      'origin',
    ]);

    // Try to check if sale_order_ids exists by reading one PO with it
    let saleOrderIdsFieldExists = false;
    try {
      const testRead = await client.read('purchase.order', [allPoIds[0]], ['sale_order_ids']);
      saleOrderIdsFieldExists = true;
    } catch (error) {
      console.log('[Debug] sale_order_ids field does not exist in purchase.order');
    }

    const results = pos.map((po, index) => {
      const poId = allPoIds[index];
      const orderLineIds = po.order_line as number[] | undefined || [];
      
      const result: Record<string, unknown> = {
        poId,
        poName: po.name as string,
        hasOrderLines: orderLineIds.length > 0,
        orderLinesCount: orderLineIds.length,
        origin: po.origin as string | undefined,
      };

      // Only check sale_order_ids if the field exists
      if (saleOrderIdsFieldExists) {
        const saleOrderIds = (po as any).sale_order_ids as number[] | undefined || [];
        result.hasSaleOrderIds = saleOrderIds.length > 0;
        result.saleOrderIdsCount = saleOrderIds.length;
        result.saleOrderIds = saleOrderIds;
      } else {
        result.hasSaleOrderIds = false;
        result.saleOrderIdsCount = 0;
        result.saleOrderIds = [];
        result.note = 'sale_order_ids field does not exist in Odoo';
      }
      
      return result;
    });

    // Get details of first PO's order lines
    let firstPoLineDetails: unknown[] = [];
    if (results.length > 0 && results[0].orderLinesCount > 0) {
      const firstPo = pos[0];
      const firstPoLineIds = firstPo.order_line as number[] | undefined || [];
      if (firstPoLineIds.length > 0) {
        try {
          const poLines = await client.read('purchase.order.line', [firstPoLineIds[0]], [
            'name',
            'x_stripe_payment_id',
            'x_sale_order_id',
            'sale_line_id',
          ]);
          firstPoLineDetails = poLines;
        } catch (error) {
          firstPoLineDetails = [{ error: String(error) }];
        }
      }
    }

    // Count statistics
    const linkedCount = results.filter(r => (r.hasSaleOrderIds as boolean) === true).length;
    const unlinkedCount = results.filter(r => (r.hasSaleOrderIds as boolean) !== true).length;

    return new Response(
      JSON.stringify({
        total: results.length,
        linked: linkedCount,
        unlinked: unlinkedCount,
        purchaseOrders: results,
        firstPoLineDetails,
        summary: {
          total: results.length,
          linked: linkedCount,
          unlinked: unlinkedCount,
          withOrderLines: results.filter(r => r.hasOrderLines).length,
          withoutOrderLines: results.filter(r => !r.hasOrderLines).length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        errorDetails: error,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});


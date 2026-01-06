// Script per creare automaticamente tutti i custom fields in Odoo
// Eseguibile come Vercel Serverless Function o script standalone

import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Minimal JSON-RPC client for Odoo.
 */
async function odooJsonRpc<T = any>(
  url: string,
  params: Record<string, any>,
): Promise<T> {
  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    id: Date.now(),
    params,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odoo RPC failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  if (json.error) {
    const errMsg = json.error.message || json.error.data || 'unknown';
    const errData = json.error.data ? ` | data: ${JSON.stringify(json.error.data)}` : '';
    throw new Error(`Odoo RPC error: ${errMsg}${errData}`);
  }
  return json.result;
}

async function authenticateOdooUser(
  odooUrl: string,
  db: string,
  login: string,
  apiKey: string,
): Promise<number> {
  const uid = await odooJsonRpc<number>(
    `${odooUrl}/jsonrpc`,
    {
      service: 'common',
      method: 'login',
      args: [db, login, apiKey],
    },
  );

  if (!uid) {
    throw new Error('Odoo authentication failed (empty uid)');
  }
  return uid;
}

/**
 * Check if a field already exists in a model
 */
async function fieldExists(
  odooUrl: string,
  db: string,
  uid: number,
  apiKey: string,
  model: string,
  fieldName: string,
): Promise<boolean> {
  try {
    const result = await odooJsonRpc<number[]>(
      `${odooUrl}/jsonrpc`,
      {
        service: 'object',
        method: 'execute_kw',
        args: [
          db,
          uid,
          apiKey,
          'ir.model.fields',
          'search',
          [[['model', '=', model], ['name', '=', fieldName]]],
          { limit: 1 },
        ],
      },
    );
    return result.length > 0;
  } catch (err) {
    console.error(`Error checking if field exists: ${err}`);
    return false;
  }
}

/**
 * Create a custom field in Odoo
 */
async function createCustomField(
  odooUrl: string,
  db: string,
  uid: number,
  apiKey: string,
  model: string,
  fieldName: string,
  fieldType: string,
  fieldLabel: string,
  options: {
    size?: number;
    required?: boolean;
    selection?: string; // Format: "[('value1', 'Label1'), ('value2', 'Label2')]"
    relation?: string; // For Many2one fields
    help?: string;
  } = {},
): Promise<number | null> {
  // Check if field already exists
  const exists = await fieldExists(odooUrl, db, uid, apiKey, model, fieldName);
  if (exists) {
    console.log(`[create-odoo-custom-fields] Field ${fieldName} already exists in ${model}, skipping...`);
    return null;
  }

  const fieldData: Record<string, any> = {
    model: model,
    name: fieldName,
    field_description: fieldLabel,
    ttype: fieldType,
    required: options.required || false,
    store: true, // Store in database
    index: false, // Don't index by default (can be changed later if needed)
  };

  // Add type-specific options
  if (fieldType === 'char' && options.size) {
    fieldData.size = options.size;
  }

  if (fieldType === 'selection' && options.selection) {
    fieldData.selection = options.selection;
  }

  if (fieldType === 'many2one' && options.relation) {
    fieldData.relation = options.relation;
  }

  if (options.help) {
    fieldData.help = options.help;
  }

  try {
    const fieldId = await odooJsonRpc<number>(
      `${odooUrl}/jsonrpc`,
      {
        service: 'object',
        method: 'execute_kw',
        args: [
          db,
          uid,
          apiKey,
          'ir.model.fields',
          'create',
          [fieldData],
        ],
      },
    );
    console.log(`[create-odoo-custom-fields] ✅ Created field ${fieldName} (${fieldType}) in ${model}: ${fieldId}`);
    return fieldId;
  } catch (err: any) {
    console.error(`[create-odoo-custom-fields] ❌ Failed to create field ${fieldName} in ${model}:`, err?.message || err);
    throw err;
  }
}

/**
 * Define all custom fields to create
 */
const CUSTOM_FIELDS = [
  // sale.order fields
  {
    model: 'sale.order',
    name: 'x_product_id',
    type: 'char',
    label: 'Product ID (Supabase)',
    size: 36,
    help: 'UUID del prodotto da Supabase per identificazione univoca',
  },
  {
    model: 'sale.order',
    name: 'x_customer_email',
    type: 'char',
    label: 'Customer Email',
    size: 100,
    help: 'Email del cliente che ha effettuato l\'ordine',
  },
  {
    model: 'sale.order',
    name: 'x_product_type',
    type: 'selection',
    label: 'Product Type',
    selection: "[('class', 'Classe'), ('experience', 'Esperienza'), ('trip', 'Viaggio')]",
    help: 'Tipo di prodotto: class, experience, trip',
  },
  {
    model: 'sale.order',
    name: 'x_stripe_payment_id',
    type: 'char',
    label: 'Stripe Payment Intent ID',
    size: 50,
    help: 'ID del Payment Intent di Stripe per tracciamento pagamento',
  },
  {
    model: 'sale.order',
    name: 'x_provider_id',
    type: 'many2one',
    label: 'Provider Partner',
    relation: 'res.partner',
    help: 'Riferimento al partner fornitore',
  },
  {
    model: 'sale.order',
    name: 'x_customer_fiscal_code',
    type: 'char',
    label: 'Codice Fiscale Cliente',
    size: 16,
    help: 'Codice fiscale del cliente (se presente)',
  },
  {
    model: 'sale.order',
    name: 'x_customer_address',
    type: 'text',
    label: 'Indirizzo Cliente',
    help: 'Indirizzo completo del cliente',
  },
  {
    model: 'sale.order',
    name: 'x_booking_date',
    type: 'date',
    label: 'Data Slot Prenotato',
    help: 'Data dello slot di disponibilità prenotato (YYYY-MM-DD)',
  },
  {
    model: 'sale.order',
    name: 'x_booking_time',
    type: 'char',
    label: 'Ora Slot Prenotato',
    size: 10,
    help: 'Ora dello slot di disponibilità prenotato (HH:MM:SS o HH:MM)',
  },
  
  // product.product fields
  {
    model: 'product.product',
    name: 'x_product_id',
    type: 'char',
    label: 'Product ID (Supabase)',
    size: 36,
    help: 'UUID del prodotto da Supabase per identificazione univoca',
  },
  {
    model: 'product.product',
    name: 'x_product_type',
    type: 'selection',
    label: 'Product Type',
    selection: "[('class', 'Classe'), ('experience', 'Esperienza'), ('trip', 'Viaggio')]",
    help: 'Tipo di prodotto: class, experience, trip',
  },
  {
    model: 'product.product',
    name: 'x_max_adults',
    type: 'integer',
    label: 'Max Adults',
    help: 'Numero massimo di adulti per questo prodotto',
  },
  {
    model: 'product.product',
    name: 'x_max_dogs',
    type: 'integer',
    label: 'Max Dogs',
    help: 'Numero massimo di cani per questo prodotto',
  },
  {
    model: 'product.product',
    name: 'x_duration_hours',
    type: 'float',
    label: 'Duration (Hours)',
    help: 'Durata del prodotto in ore',
  },
  {
    model: 'product.product',
    name: 'x_duration_days',
    type: 'integer',
    label: 'Duration (Days)',
    help: 'Durata del prodotto in giorni',
  },
  {
    model: 'product.product',
    name: 'x_meeting_point',
    type: 'char',
    label: 'Meeting Point',
    size: 200,
    help: 'Punto di incontro per il prodotto',
  },
  {
    model: 'product.product',
    name: 'x_location',
    type: 'char',
    label: 'Location',
    size: 200,
    help: 'Località del prodotto',
  },
  
  // purchase.order fields
  {
    model: 'purchase.order',
    name: 'x_product_id',
    type: 'char',
    label: 'Product ID (Supabase)',
    size: 36,
    help: 'UUID del prodotto da Supabase per raggruppamento ordini',
  },
  {
    model: 'purchase.order',
    name: 'x_product_type',
    type: 'selection',
    label: 'Product Type',
    selection: "[('class', 'Classe'), ('experience', 'Esperienza'), ('trip', 'Viaggio')]",
    help: 'Tipo di prodotto: class, experience, trip',
  },
  {
    model: 'purchase.order',
    name: 'x_provider_id',
    type: 'many2one',
    label: 'Provider Partner',
    relation: 'res.partner',
    help: 'Riferimento al partner fornitore',
  },
  
  // purchase.order.line fields
  {
    model: 'purchase.order.line',
    name: 'x_booking_id',
    type: 'char',
    label: 'Booking ID',
    size: 36,
    help: 'ID della prenotazione da Supabase',
  },
  {
    model: 'purchase.order.line',
    name: 'x_stripe_payment_id',
    type: 'char',
    label: 'Stripe Payment Intent ID',
    size: 50,
    help: 'ID del Payment Intent di Stripe',
  },
  {
    model: 'purchase.order.line',
    name: 'x_sale_order_id',
    type: 'char',
    label: 'Sale Order ID',
    size: 20,
    help: 'Numero dell\'ordine di vendita collegato',
  },
  {
    model: 'purchase.order.line',
    name: 'x_customer_email',
    type: 'char',
    label: 'Customer Email',
    size: 100,
    help: 'Email del cliente',
  },
  {
    model: 'purchase.order.line',
    name: 'x_customer_name',
    type: 'char',
    label: 'Customer Name',
    size: 200,
    help: 'Nome completo del cliente',
  },
  
  // res.partner fields (for Italian electronic invoicing)
  {
    model: 'res.partner',
    name: 'l10n_it_codice_fiscale',
    type: 'char',
    label: 'Codice Fiscale',
    size: 16,
    help: 'Codice fiscale italiano (per B2C o B2B se diverso da P.IVA)',
  },
  {
    model: 'res.partner',
    name: 'l10n_it_sdi_code',
    type: 'char',
    label: 'Codice Destinatario SDI',
    size: 7,
    help: 'Codice SDI per fatturazione elettronica italiana (7 caratteri alfanumerici) - ESSENZIALE per B2B',
  },
  {
    model: 'res.partner',
    name: 'l10n_it_pec_email',
    type: 'char',
    label: 'PEC Email',
    size: 200,
    help: 'Indirizzo PEC per fatturazione elettronica italiana - ESSENZIALE per B2B',
  },
];

/**
 * Create all custom fields in Odoo
 */
async function createAllCustomFields(
  odooUrl: string,
  db: string,
  uid: number,
  apiKey: string,
): Promise<{ created: number; skipped: number; errors: number; results: Array<{ model: string; field: string; status: string; fieldId?: number; error?: string }> }> {
  const results: Array<{ model: string; field: string; status: string; fieldId?: number; error?: string }> = [];
  let created = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`[create-odoo-custom-fields] Starting creation of ${CUSTOM_FIELDS.length} custom fields...`);

  for (const fieldDef of CUSTOM_FIELDS) {
    try {
      const fieldId = await createCustomField(
        odooUrl,
        db,
        uid,
        apiKey,
        fieldDef.model,
        fieldDef.name,
        fieldDef.type,
        fieldDef.label,
        {
          size: (fieldDef as any).size,
          selection: (fieldDef as any).selection,
          relation: (fieldDef as any).relation,
          help: (fieldDef as any).help,
        },
      );

      if (fieldId === null) {
        skipped++;
        results.push({
          model: fieldDef.model,
          field: fieldDef.name,
          status: 'skipped',
        });
      } else {
        created++;
        results.push({
          model: fieldDef.model,
          field: fieldDef.name,
          status: 'created',
          fieldId,
        });
      }

      // Small delay to avoid overwhelming Odoo
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err: any) {
      errors++;
      const errorMsg = err?.message || String(err);
      console.error(`[create-odoo-custom-fields] Error creating ${fieldDef.name} in ${fieldDef.model}:`, errorMsg);
      results.push({
        model: fieldDef.model,
        field: fieldDef.name,
        status: 'error',
        error: errorMsg,
      });
    }
  }

  return { created, skipped, errors, results };
}

// Vercel Serverless Function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Get Odoo configuration from environment variables
  const odUrl = process.env.OD_URL;
  const odDb = process.env.OD_DB_NAME;
  const odApiKey = process.env.OD_API_KEY;
  const odLogin = process.env.OD_LOGIN;

  // Normalize Odoo URL
  let odooUrl = odUrl;
  if (odooUrl && !odooUrl.startsWith('http://') && !odooUrl.startsWith('https://')) {
    odooUrl = `https://${odooUrl}`;
  }

  if (!odooUrl || !odDb || !odApiKey || !odLogin) {
    return res.status(400).json({
      error: 'Missing required environment variables',
      required: ['OD_URL', 'OD_DB_NAME', 'OD_API_KEY', 'OD_LOGIN'],
    });
  }

  try {
    console.log('[create-odoo-custom-fields] Authenticating with Odoo...');
    const uid = await authenticateOdooUser(odooUrl, odDb, odLogin, odApiKey);
    console.log('[create-odoo-custom-fields] Authentication successful, uid:', uid);

    console.log('[create-odoo-custom-fields] Creating custom fields...');
    const result = await createAllCustomFields(odooUrl, odDb, uid, odApiKey);

    return res.status(200).json({
      success: true,
      summary: {
        total: CUSTOM_FIELDS.length,
        created: result.created,
        skipped: result.skipped,
        errors: result.errors,
      },
      results: result.results,
    });
  } catch (err: any) {
    console.error('[create-odoo-custom-fields] Error:', err);
    return res.status(500).json({
      error: 'Failed to create custom fields',
      message: err?.message || String(err),
    });
  }
}


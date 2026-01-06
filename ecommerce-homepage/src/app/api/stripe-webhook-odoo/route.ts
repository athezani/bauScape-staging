// Next.js API Route for Stripe webhook
// Using Next.js Request/Response for webhook handling
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { secureLogger } from '@/utils/secureLogger';

// Disable body parsing to get raw body for signature verification
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  // Validate that it's a secret key (starts with sk_ or sk_test_)
  if (!key.startsWith('sk_')) {
    throw new Error(`Invalid STRIPE_SECRET_KEY: must start with 'sk_' or 'sk_test_', got key starting with '${key.substring(0, 5)}...'`);
  }
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion });
}

async function getRawBody(req: NextRequest): Promise<Buffer> {
  // Next.js App Router: For Stripe webhooks, we need the raw body as bytes
  // Stripe requires the exact raw bytes for signature verification.
  // In Next.js App Router, we can use req.arrayBuffer() to get raw bytes.
  try {
    // Method 1: Try arrayBuffer first (most reliable for raw bytes)
    try {
      const arrayBuffer = await req.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      secureLogger.log('stripe-webhook-odoo', { action: 'raw_body_read', method: 'arrayBuffer', length: buffer.length });
      return buffer;
    } catch (arrayBufferErr: any) {
      secureLogger.warn('stripe-webhook-odoo', { action: 'arrayBuffer_failed', fallback: 'text', error: arrayBufferErr?.message });
      
      // Method 2: Fallback to text() if arrayBuffer fails
      // This can happen in some edge cases
      const text = await req.text();
      const buffer = Buffer.from(text, 'utf-8');
      secureLogger.log('stripe-webhook-odoo', { action: 'raw_body_read', method: 'text_fallback', length: buffer.length });
      return buffer;
    }
  } catch (err: any) {
    secureLogger.error('stripe-webhook-odoo', err, { action: 'extract_raw_body_failed' });
    throw new Error(`Failed to read raw body: ${err?.message || 'Unknown error'}`);
  }
}

interface PartnerInfo {
  email?: string;
  name?: string;
  phone?: string;
  fiscalCode?: string; // Codice fiscale italiano
  street?: string; // Via/Indirizzo
  city?: string; // Città
  zip?: string; // CAP
  province?: string; // Provincia
  countryCode?: string; // Codice paese (es. 'IT', 'US')
  // B2B fields
  isB2B?: boolean;
  vatNumber?: string; // Partita IVA
  sdiCode?: string; // Codice SDI
  pecEmail?: string; // PEC email
  // Contact name fields (for B2B: nome e cognome del contatto)
  contactName?: string; // Nome del contatto (per B2B)
  contactSurname?: string; // Cognome del contatto (per B2B)
}

interface BookingInfo {
  productName?: string;
  productType?: string;
  providerName?: string;
  providerEmail?: string;
  providerId?: string; // Supabase provider ID
  productInternalId?: string;
  guests?: number;
  dogs?: number;
  total?: number;
  currency?: string;
  date?: string;
  bookingDate?: string; // Data dello slot prenotato (YYYY-MM-DD)
  bookingTime?: string; // Ora dello slot prenotato (HH:MM:SS o HH:MM)
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
 * Find country ID in Odoo by country code (e.g., 'IT', 'US')
 */
async function findCountryId(
  odooUrl: string,
  db: string,
  uid: number,
  apiKey: string,
  countryCode: string,
): Promise<number | null> {
  if (!countryCode || countryCode.length !== 2) {
    return null;
  }
  
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
          'res.country',
          'search',
          [[['code', '=', countryCode.toUpperCase()]]],
          { limit: 1 },
        ],
      },
    );
    
    if (result.length > 0) {
      return result[0];
    }
    return null;
  } catch (err) {
    console.error(`[stripe-webhook-odoo] Error finding country by code ${countryCode}:`, err);
    return null;
  }
}

/**
 * Find state ID in Odoo by state name and country code (e.g., 'RM', 'IT')
 */
async function findStateId(
  odooUrl: string,
  db: string,
  uid: number,
  apiKey: string,
  stateName: string,
  countryCode: string,
): Promise<number | null> {
  if (!stateName || !countryCode || countryCode.length !== 2) {
    return null;
  }
  
  try {
    // First find country ID
    const countryId = await findCountryId(odooUrl, db, uid, apiKey, countryCode);
    if (!countryId) {
      return null;
    }
    
    // Search for state by name and country
    const result = await odooJsonRpc<number[]>(
      `${odooUrl}/jsonrpc`,
      {
        service: 'object',
        method: 'execute_kw',
        args: [
          db,
          uid,
          apiKey,
          'res.country.state',
          'search',
          [[['name', 'ilike', stateName.trim()], ['country_id', '=', countryId]]],
          { limit: 1 },
        ],
      },
    );
    
    if (result.length > 0) {
      return result[0];
    }
    return null;
  } catch (err) {
    console.error(`[stripe-webhook-odoo] Error finding state by name ${stateName} in country ${countryCode}:`, err);
    return null;
  }
}

async function upsertPartner(
  odooUrl: string,
  db: string,
  uid: number,
  apiKey: string,
  partner: PartnerInfo,
) {
  // Validate email - if it's a placeholder, use a fallback
  if (!partner.email || partner.email.startsWith('missing-') || partner.email.includes('@example.com')) {
    console.warn('[stripe-webhook-odoo] Invalid email for partner, using fallback:', partner.email);
    // Use a fallback email based on payment intent ID - this will be unique per order
    // Format: order-{paymentIntentId}@flixdog.internal
    // This allows the order to be created even if email is missing
    partner.email = `order-${Date.now()}@flixdog.internal`;
    secureLogger.log('stripe-webhook-odoo', { action: 'using_fallback_email' });
  }

  const isB2B = partner.isB2B === true;
  secureLogger.log('stripe-webhook-odoo', { 
    action: 'upsert_partner', 
    hasEmail: !!partner.email,
    isB2B,
    hasVat: !!partner.vatNumber,
    hasSdi: !!partner.sdiCode,
    hasPec: !!partner.pecEmail,
  });

  // Determine VAT/CF to use
  // B2B: use vatNumber as VAT (with IT prefix), fiscalCode as l10n_it_codice_fiscale (if different)
  // B2C: fiscalCode goes ONLY in l10n_it_codice_fiscale, NOT in vat (vat field is for P.IVA only)
  // IMPORTANT: Odoo validates vat field as VAT number (IT12345670017 format), so CF cannot go there
  const vatToUse = isB2B && partner.vatNumber 
    ? `IT${partner.vatNumber.trim()}` // Add IT prefix for VAT
    : null; // For B2C, do NOT use vat field - CF goes only in l10n_it_codice_fiscale

  // Search by email or VAT (for B2B)
  let search: number[] = [];
  if (isB2B && vatToUse) {
    // For B2B, try to find by VAT first
    try {
      search = await odooJsonRpc<number[]>(
        `${odooUrl}/jsonrpc`,
        {
          service: 'object',
          method: 'execute_kw',
          args: [
            db,
            uid,
            apiKey,
            'res.partner',
            'search',
            [[['vat', '=', vatToUse]]],
            { limit: 1 },
          ],
        },
      );
      if (search.length > 0) {
        secureLogger.log('stripe-webhook-odoo', { action: 'found_partner_by_vat', hasVat: !!vatToUse });
      }
    } catch (err) {
      secureLogger.warn('stripe-webhook-odoo', { action: 'vat_search_failed', fallback: 'email', error: err instanceof Error ? err.message : String(err) });
    }
  }
  
  // If not found by VAT, search by email
  if (search.length === 0) {
    search = await odooJsonRpc<number[]>(
      `${odooUrl}/jsonrpc`,
      {
        service: 'object',
        method: 'execute_kw',
        args: [
          db,
          uid,
          apiKey,
          'res.partner',
          'search',
          [[['email', '=', partner.email]]],
          { limit: 1 },
        ],
      },
    );
  }

  // Prepare partner data
  // CRITICAL: For B2B, partner.name is already set to ragione sociale (company_name) in buildPartnerFromMetadata
  // For B2C, partner.name is customer_name
  const partnerNameForOdoo = partner.name && partner.name.trim() ? partner.name.trim() : 'Cliente';
  const partnerData: Record<string, any> = {
    name: partnerNameForOdoo,
    email: partner.email,
    phone: partner.phone || '',
    is_company: isB2B, // CRITICAL: Set is_company based on B2B flag - must always be set correctly
  };
  
  secureLogger.log('stripe-webhook-odoo', { 
    action: 'preparing_partner_data', 
    isB2B,
    hasVat: !!vatToUse,
    hasSdi: !!partner.sdiCode,
    hasPec: !!partner.pecEmail,
  });
  
  // B2B DEBUG: Log partner data before adding B2B fields
  secureLogger.debug('stripe-webhook-odoo', { action: 'partner_data_before_b2b', isB2B, isCompany: partnerData.is_company });

  // Add VAT (B2B only)
  // B2B: P.IVA in vat field (with IT prefix)
  // B2C: Do NOT use vat field - it's for P.IVA only (IT12345670017 format)
  // IMPORTANT: Never fail order creation if VAT validation fails
  // Just log warnings and continue without populating invalid fields
  if (vatToUse) {
    try {
      // B2B: P.IVA in vat field (with IT prefix)
      partnerData.vat = vatToUse;
      secureLogger.log('stripe-webhook-odoo', { action: 'setting_vat_b2b' });
    } catch (e) {
      console.warn('[stripe-webhook-odoo] Error setting VAT (non-blocking):', e);
      // Continue without VAT field
    }
  }
  
  // Add codice fiscale
  // B2C: CF goes ONLY in l10n_it_codice_fiscale (NOT in vat - vat is for P.IVA only)
  // B2B: CF goes in l10n_it_codice_fiscale only if different from P.IVA
  if (partner.fiscalCode && partner.fiscalCode.trim()) {
    try {
      if (!isB2B) {
        // B2C: CF ONLY in l10n_it_codice_fiscale (NOT in vat)
        partnerData.l10n_it_codice_fiscale = partner.fiscalCode.trim();
        secureLogger.log('stripe-webhook-odoo', { action: 'setting_codice_fiscale_b2c' });
      } else if (partner.vatNumber && partner.fiscalCode.trim() !== partner.vatNumber.trim()) {
        // B2B: only if CF is different from P.IVA
        partnerData.l10n_it_codice_fiscale = partner.fiscalCode.trim();
        secureLogger.log('stripe-webhook-odoo', { action: 'setting_codice_fiscale_b2b' });
      }
    } catch (e) {
      console.warn('[stripe-webhook-odoo] Error setting codice fiscale (non-blocking):', e);
      // Continue without CF field
    }
  }

  // Add B2B specific fields for Italian electronic invoicing
  // CRITICAL: These fields are ESSENTIAL for Italian electronic invoicing
  // SDI: l10n_it_pa_index (Destination Code (SDI))
  // PEC: l10n_it_pec_email (PEC e-mail)
  if (isB2B) {
    secureLogger.debug('stripe-webhook-odoo', { 
      action: 'adding_b2b_fields',
      hasSdi: !!partner.sdiCode,
      hasPec: !!partner.pecEmail,
      hasVat: !!partner.vatNumber,
    });
    
    if (partner.sdiCode && partner.sdiCode.trim()) {
      // Use l10n_it_pa_index for SDI (Destination Code)
      partnerData.l10n_it_pa_index = partner.sdiCode.trim();
      secureLogger.log('stripe-webhook-odoo', { action: 'sdi_code_set' });
    } else {
      secureLogger.warn('stripe-webhook-odoo', { action: 'sdi_code_missing' });
    }
    if (partner.pecEmail && partner.pecEmail.trim()) {
      // Use l10n_it_pec_email for PEC
      partnerData.l10n_it_pec_email = partner.pecEmail.trim();
      secureLogger.log('stripe-webhook-odoo', { action: 'pec_email_set' });
    } else {
      secureLogger.warn('stripe-webhook-odoo', { action: 'pec_email_missing' });
    }
  } else {
    secureLogger.debug('stripe-webhook-odoo', { action: 'skipping_b2b_fields', isB2B: false });
  }

  // Add address fields
  if (partner.street && partner.street.trim()) {
    partnerData.street = partner.street.trim();
  }
  if (partner.city && partner.city.trim()) {
    partnerData.city = partner.city.trim();
  }
  if (partner.zip && partner.zip.trim()) {
    partnerData.zip = partner.zip.trim();
  }
  // CRITICAL: Always set country for both B2B and B2C
  // For B2B with VAT: always Italy
  // For B2C or B2B without VAT: use countryCode from partner, default to 'IT' if not available
  const countryCodeToUse = isB2B && partner.vatNumber 
    ? 'IT' // B2B with VAT: always Italy
    : (partner.countryCode || 'IT'); // B2C: always set country, default to 'IT' if not present
  
  if (countryCodeToUse && countryCodeToUse.trim()) {
    const countryId = await findCountryId(odooUrl, db, uid, apiKey, countryCodeToUse);
    if (countryId) {
      partnerData.country_id = countryId;
      console.log('[stripe-webhook-odoo] Setting country:', countryCodeToUse, '-> country_id:', countryId, isB2B && partner.vatNumber ? '(forced IT for B2B with VAT)' : (partner.countryCode ? '(from partner data)' : '(default IT for B2C)'));
    } else {
      console.warn('[stripe-webhook-odoo] Country not found in Odoo for code:', countryCodeToUse);
      // Fallback: try to set IT if lookup fails
      const fallbackCountryId = await findCountryId(odooUrl, db, uid, apiKey, 'IT');
      if (fallbackCountryId) {
        partnerData.country_id = fallbackCountryId;
        console.log('[stripe-webhook-odoo] Setting country to IT (fallback):', fallbackCountryId);
      }
    }
  } else {
    // Last resort: always try to set IT
    console.warn('[stripe-webhook-odoo] Country code missing, attempting to set IT directly');
    const countryId = await findCountryId(odooUrl, db, uid, apiKey, 'IT');
    if (countryId) {
      partnerData.country_id = countryId;
      console.log('[stripe-webhook-odoo] Setting country to IT (last resort):', countryId);
    }
  }
  
  // Add province (state)
  if (partner.province && partner.province.trim() && countryCodeToUse) {
    const stateId = await findStateId(odooUrl, db, uid, apiKey, partner.province, countryCodeToUse);
    if (stateId) {
      partnerData.state_id = stateId;
      console.log('[stripe-webhook-odoo] Setting province:', partner.province, '-> state_id:', stateId);
    } else {
      console.warn('[stripe-webhook-odoo] State not found in Odoo for name:', partner.province, 'in country:', partner.countryCode);
    }
  }

  // For B2B: save contact name and surname in comment field
  if (isB2B && (partner.contactName || partner.contactSurname)) {
    const contactInfo = [];
    if (partner.contactName) {
      contactInfo.push(`Nome contatto: ${partner.contactName.trim()}`);
    }
    if (partner.contactSurname) {
      contactInfo.push(`Cognome contatto: ${partner.contactSurname.trim()}`);
    }
    if (contactInfo.length > 0) {
      partnerData.comment = contactInfo.join('\n');
      console.log('[stripe-webhook-odoo] Setting contact info in comment field (B2B):', partnerData.comment);
    }
  }

  if (search.length > 0) {
    // Update existing partner
    const partnerId = search[0];
    secureLogger.log('stripe-webhook-odoo', { action: 'updating_partner', partnerId, isB2B });
    
    // B2B DEBUG: Log before update
    secureLogger.debug('stripe-webhook-odoo', { action: 'updating_existing_partner', partnerId, isCompany: partnerData.is_company });
    
    try {
      await odooJsonRpc(
        `${odooUrl}/jsonrpc`,
        {
          service: 'object',
          method: 'execute_kw',
          args: [
            db,
            uid,
            apiKey,
            'res.partner',
            'write',
            [[partnerId], partnerData],
          ],
        },
      );
      console.log('[stripe-webhook-odoo] Partner updated successfully with name:', partnerNameForOdoo, 'is_company:', partnerData.is_company);
      return partnerId;
    } catch (err: any) {
      // If validation fails (e.g., invalid VAT/CF), try to update without problematic fields
      console.warn('[stripe-webhook-odoo] Error updating partner (non-blocking), trying without problematic fields:', err?.message || err);
      
      // Check if error is related to codice fiscale validation
      const isCodiceFiscaleError = err?.message?.includes('Codice Fiscale') || 
                                   err?.message?.includes('codice_fiscale') ||
                                   err?.message?.includes('Invalid Codice Fiscale');
      
      // CRITICAL: Always include is_company and B2B fields even in fallback
      // Remove fields that might cause validation errors, but keep essential B2B fields
      const safePartnerData: Record<string, any> = {
        name: partnerNameForOdoo,
        email: partner.email,
        phone: partner.phone || '',
        is_company: isB2B, // CRITICAL: Always set is_company based on B2B flag
      };
      
      // CRITICAL: Always include country_id - it's essential and safe
      if (partnerData.country_id) {
        safePartnerData.country_id = partnerData.country_id;
        console.log('[stripe-webhook-odoo] Including country_id in safe partner data:', partnerData.country_id);
      } else {
        // Fallback: try to set IT if country_id is missing
        const countryId = await findCountryId(odooUrl, db, uid, apiKey, 'IT');
        if (countryId) {
          safePartnerData.country_id = countryId;
          console.log('[stripe-webhook-odoo] Setting country_id to IT in safe partner data (fallback):', countryId);
        }
      }
      
      // Add address fields first (usually safe)
      if (partner.street && partner.street.trim()) safePartnerData.street = partner.street.trim();
      if (partner.city && partner.city.trim()) safePartnerData.city = partner.city.trim();
      if (partner.zip && partner.zip.trim()) safePartnerData.zip = partner.zip.trim();
      
      // Try to update without codice fiscale first (if CF validation failed)
      if (isCodiceFiscaleError) {
        console.log('[stripe-webhook-odoo] Codice fiscale validation error detected, updating partner without CF first');
        try {
          await odooJsonRpc(
            `${odooUrl}/jsonrpc`,
            {
              service: 'object',
              method: 'execute_kw',
              args: [
                db,
                uid,
                apiKey,
                'res.partner',
                'write',
                [[partnerId], safePartnerData],
              ],
            },
          );
          console.log('[stripe-webhook-odoo] Partner updated without codice fiscale');
          
          // Now try to update with codice fiscale using different methods to bypass validation
          if (!isB2B && partner.fiscalCode && partner.fiscalCode.trim()) {
            const cfValue = partner.fiscalCode.trim();
            
            // Method 1: Try with context to bypass validation
            try {
              await odooJsonRpc(
                `${odooUrl}/jsonrpc`,
                {
                  service: 'object',
                  method: 'execute_kw',
                  args: [
                    db,
                    uid,
                    apiKey,
                    'res.partner',
                    'write',
                    [[partnerId], { l10n_it_codice_fiscale: cfValue }],
                    { context: { skip_codice_fiscale_validation: true, no_validate: true } }, // Try to bypass validation
                  ],
                },
              );
              console.log('[stripe-webhook-odoo] ✅ Codice fiscale added after partner update (method 1):', cfValue);
            } catch (cfErr1: any) {
              console.warn('[stripe-webhook-odoo] Method 1 failed, trying method 2:', cfErr1?.message || cfErr1);
              
              // Method 2: Try with different context
              try {
                await odooJsonRpc(
                  `${odooUrl}/jsonrpc`,
                  {
                    service: 'object',
                    method: 'execute_kw',
                    args: [
                      db,
                      uid,
                      apiKey,
                      'res.partner',
                      'write',
                      [[partnerId], { l10n_it_codice_fiscale: cfValue }],
                      { context: { validate_codice_fiscale: false } }, // Alternative context flag
                    ],
                  },
                );
                console.log('[stripe-webhook-odoo] ✅ Codice fiscale added after partner update (method 2):', cfValue);
              } catch (cfErr2: any) {
                console.warn('[stripe-webhook-odoo] Method 2 failed, trying method 3:', cfErr2?.message || cfErr2);
                
                // Method 3: Try without any context (sometimes works if validation is only on create)
                try {
                  await odooJsonRpc(
                    `${odooUrl}/jsonrpc`,
                    {
                      service: 'object',
                      method: 'execute_kw',
                      args: [
                        db,
                        uid,
                        apiKey,
                        'res.partner',
                        'write',
                        [[partnerId], { l10n_it_codice_fiscale: cfValue }],
                      ],
                    },
                  );
                  console.log('[stripe-webhook-odoo] ✅ Codice fiscale added after partner update (method 3):', cfValue);
                } catch (cfErr3: any) {
                  console.warn('[stripe-webhook-odoo] ⚠️ All methods failed to add codice fiscale. CF:', cfValue, 'Error:', cfErr3?.message || cfErr3);
                  console.warn('[stripe-webhook-odoo] Partner updated but codice fiscale could not be set. You may need to set it manually in Odoo.');
                  // Partner updated, continue without CF
                }
              }
            }
          }
          return partnerId;
        } catch (retryErr: any) {
          console.warn('[stripe-webhook-odoo] Error updating partner without CF, trying with CF:', retryErr?.message || retryErr);
          // Continue to try with CF
        }
      }
      
      // If not CF error, or if update without CF failed, try with CF
      // For B2C, try to add fiscal code ONLY in l10n_it_codice_fiscale (NOT in vat - vat is for P.IVA only)
      if (!isB2B && partner.fiscalCode && partner.fiscalCode.trim()) {
        safePartnerData.l10n_it_codice_fiscale = partner.fiscalCode.trim();
        console.log('[stripe-webhook-odoo] Fallback: Setting fiscal code in l10n_it_codice_fiscale (B2C):', partner.fiscalCode.trim());
      }
      
      // Add B2B fields even in fallback (these are essential for B2B partners)
      if (isB2B) {
        // Always include SDI and PEC if available (these are safe fields)
        if (partner.sdiCode && partner.sdiCode.trim()) {
          safePartnerData.l10n_it_pa_index = partner.sdiCode.trim();
        }
        if (partner.pecEmail && partner.pecEmail.trim()) {
          safePartnerData.l10n_it_pec_email = partner.pecEmail.trim();
        }
        // Try to add VAT if available (might fail validation, but we try)
        if (vatToUse) {
          try {
            safePartnerData.vat = vatToUse;
          } catch (e) {
            // Skip VAT if it causes validation error
          }
        }
      }
      
      try {
        await odooJsonRpc(
          `${odooUrl}/jsonrpc`,
          {
            service: 'object',
            method: 'execute_kw',
            args: [
              db,
              uid,
              apiKey,
              'res.partner',
              'write',
              [[partnerId], safePartnerData],
            ],
          },
        );
        console.log('[stripe-webhook-odoo] Partner updated with safe fields');
        return partnerId;
      } catch (retryErr: any) {
        console.error('[stripe-webhook-odoo] Error updating partner even with safe fields (non-blocking):', retryErr?.message || retryErr);
        // Return existing partner ID anyway - order creation should continue
        return partnerId;
      }
    }
  }

  // Create new partner
  secureLogger.log('stripe-webhook-odoo', { action: 'creating_new_partner', hasEmail: !!partner.email, isB2B });
  
  // B2B DEBUG: Log before create
  secureLogger.debug('stripe-webhook-odoo', { action: 'creating_new_partner', isCompany: partnerData.is_company });
  
  try {
    const newId = await odooJsonRpc<number>(
      `${odooUrl}/jsonrpc`,
      {
        service: 'object',
        method: 'execute_kw',
        args: [
          db,
          uid,
          apiKey,
          'res.partner',
          'create',
          [partnerData],
        ],
      },
    );
    console.log('[stripe-webhook-odoo] Partner created successfully with name:', partnerNameForOdoo, 'ID:', newId, 'is_company:', partnerData.is_company);
      
      // B2B DEBUG: Log after create
      console.log('[stripe-webhook-odoo] ========================================');
      console.log('[stripe-webhook-odoo] B2B DEBUG: Partner created successfully');
      console.log('[stripe-webhook-odoo] newId:', newId);
      console.log('[stripe-webhook-odoo] partnerData.is_company:', partnerData.is_company);
      console.log('[stripe-webhook-odoo] partnerData.name:', partnerData.name);
      console.log('[stripe-webhook-odoo] ========================================');
    return newId;
  } catch (err: any) {
    // If validation fails (e.g., invalid VAT/CF), try to create without problematic fields
    console.warn('[stripe-webhook-odoo] Error creating partner (non-blocking), trying without problematic fields:', err?.message || err);
    
    // CRITICAL: Always include is_company and B2B fields even in fallback
    // Remove fields that might cause validation errors, but keep essential B2B fields
    const safePartnerData: Record<string, any> = {
      name: partnerNameForOdoo,
      email: partner.email,
      phone: partner.phone || '',
      is_company: isB2B, // CRITICAL: Always set is_company based on B2B flag
    };
    
    // CRITICAL: Always include country_id - it's essential and safe
    if (partnerData.country_id) {
      safePartnerData.country_id = partnerData.country_id;
      console.log('[stripe-webhook-odoo] Including country_id in safe partner data (create fallback):', partnerData.country_id);
    } else {
      // Fallback: try to set IT if country_id is missing
      const countryId = await findCountryId(odooUrl, db, uid, apiKey, 'IT');
      if (countryId) {
        safePartnerData.country_id = countryId;
        console.log('[stripe-webhook-odoo] Setting country_id to IT in safe partner data (create fallback):', countryId);
      }
    }
    
    // Add address fields (usually safe)
    if (partner.street && partner.street.trim()) safePartnerData.street = partner.street.trim();
    if (partner.city && partner.city.trim()) safePartnerData.city = partner.city.trim();
    if (partner.zip && partner.zip.trim()) safePartnerData.zip = partner.zip.trim();
    
    // Add B2B fields even in fallback (these are essential for B2B partners)
    if (isB2B) {
      // Always include SDI and PEC if available (these are safe fields)
      if (partner.sdiCode && partner.sdiCode.trim()) {
        safePartnerData.l10n_it_pa_index = partner.sdiCode.trim();
      }
      if (partner.pecEmail && partner.pecEmail.trim()) {
        safePartnerData.l10n_it_pec_email = partner.pecEmail.trim();
      }
      // Try to add VAT if available (might fail validation, but we try)
      if (vatToUse) {
        try {
          safePartnerData.vat = vatToUse;
        } catch (e) {
          // Skip VAT if it causes validation error
        }
      }
    }
    
    // Add address fields (usually safe)
    if (partner.street && partner.street.trim()) safePartnerData.street = partner.street.trim();
    if (partner.city && partner.city.trim()) safePartnerData.city = partner.city.trim();
    if (partner.zip && partner.zip.trim()) safePartnerData.zip = partner.zip.trim();
    
    try {
      const newId = await odooJsonRpc<number>(
        `${odooUrl}/jsonrpc`,
        {
          service: 'object',
          method: 'execute_kw',
          args: [
            db,
            uid,
            apiKey,
            'res.partner',
            'create',
            [safePartnerData],
          ],
        },
      );
      console.log('[stripe-webhook-odoo] Partner created with safe fields only, ID:', newId);
      return newId;
    } catch (retryErr: any) {
      console.error('[stripe-webhook-odoo] Error creating partner even with safe fields (non-blocking):', retryErr?.message || retryErr);
      // Throw error only if we absolutely cannot create partner - but this should be rare
      // In most cases, we should be able to create a minimal partner
      throw new Error(`Could not create partner in Odoo even with minimal fields: ${retryErr?.message || String(retryErr)}`);
    }
  }
}

async function upsertProviderPartner(
  odooUrl: string,
  db: string,
  uid: number,
  apiKey: string,
  providerName: string,
  providerEmail?: string,
) {
  if (!providerName || providerName === 'Unknown provider') {
    console.warn('[stripe-webhook-odoo] Cannot create provider partner: name is missing or unknown');
    return null;
  }

  // Search for existing provider partner by name
  const search = await odooJsonRpc<number[]>(
    `${odooUrl}/jsonrpc`,
    {
      service: 'object',
      method: 'execute_kw',
      args: [
        db,
        uid,
        apiKey,
        'res.partner',
        'search',
        [[['name', '=', providerName], ['is_company', '=', true]]],
        { limit: 1 },
      ],
    },
  );

  if (search.length > 0) {
    const providerPartnerId = search[0];
    console.log('[stripe-webhook-odoo] Found existing provider partner:', providerPartnerId);
    
    // Update provider partner if email is provided
    if (providerEmail) {
      await odooJsonRpc(
        `${odooUrl}/jsonrpc`,
        {
          service: 'object',
          method: 'execute_kw',
          args: [
            db,
            uid,
            apiKey,
            'res.partner',
            'write',
            [[providerPartnerId], {
              email: providerEmail,
            }],
          ],
        },
      );
    }
    return providerPartnerId;
  }

  // Create new provider partner
  console.log('[stripe-webhook-odoo] Creating new provider partner:', providerName);
  const newProviderPartnerId = await odooJsonRpc<number>(
    `${odooUrl}/jsonrpc`,
    {
      service: 'object',
      method: 'execute_kw',
      args: [
        db,
        uid,
        apiKey,
        'res.partner',
        'create',
        [{
          name: providerName,
          is_company: true, // Mark as company/provider
          email: providerEmail || '',
          supplier_rank: 1, // Mark as supplier for purchase orders
        }],
      ],
    },
  );
  console.log('[stripe-webhook-odoo] Created provider partner:', newProviderPartnerId);
  return newProviderPartnerId;
}

/**
 * Find or create product in Odoo using x_product_id (UUID from Supabase)
 * 
 * This function ensures that all orders for the same product point to the same Odoo product.
 * If the product doesn't exist in Odoo, it will be created with the correct data from Supabase.
 * 
 * @param odooUrl - Odoo URL
 * @param db - Odoo database name
 * @param uid - Odoo user ID
 * @param apiKey - Odoo API key
 * @param productInternalId - UUID from Supabase (x_product_id)
 * @param productName - Product name (fallback if product not found in Supabase)
 * @param productType - Product type: 'class' | 'experience' | 'trip'
 * @param supabaseUrl - Supabase URL (for fetching product data)
 * @param supabaseServiceKey - Supabase service role key
 * @returns Odoo product ID
 */
async function findOrCreateProductInOdoo(
  odooUrl: string,
  db: string,
  uid: number,
  apiKey: string,
  productInternalId: string,
  productName: string,
  productType: string,
  supabaseUrl?: string,
  supabaseServiceKey?: string,
): Promise<number> {
  console.log('[stripe-webhook-odoo] Finding or creating product in Odoo:', {
    productInternalId,
    productName,
    productType,
  });

  // Step 1: Search for existing product by x_product_id
  try {
    const searchResult = await odooJsonRpc<number[]>(
      `${odooUrl}/jsonrpc`,
      {
        service: 'object',
        method: 'execute_kw',
        args: [
          db,
          uid,
          apiKey,
          'product.product',
          'search',
          [[['x_product_id', '=', productInternalId]]],
          { limit: 1 },
        ],
      },
    );

    if (searchResult.length > 0) {
      const productId = searchResult[0];
      console.log('[stripe-webhook-odoo] Found existing product by x_product_id:', productId);
      return productId;
    }
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    // If x_product_id field doesn't exist, continue to create product
    if (errorMessage.includes('x_product_id') || errorMessage.includes('Invalid field')) {
      console.warn('[stripe-webhook-odoo] x_product_id field does not exist in Odoo, will create product without it');
    } else {
      console.error('[stripe-webhook-odoo] Error searching for product:', err);
      throw err;
    }
  }

  // Step 2: Product not found - fetch data from Supabase and create it
  console.log('[stripe-webhook-odoo] Product not found in Odoo, fetching data from Supabase and creating...');
  
  let productData: {
    name: string;
    description?: string | null;
    type: string;
    active: boolean;
  } = {
    name: productName,
    type: productType,
    active: true,
  };

  // Try to fetch full product data from Supabase
  if (supabaseUrl && supabaseServiceKey && productInternalId) {
    try {
      const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);
      
      // Try experience table first
      let { data: expData, error: expError } = await supabase
        .from('experience')
        .select('name, description, active')
        .eq('id', productInternalId)
        .single();
      
      if (expData && !expError) {
        productData = {
          name: expData.name || productName,
          description: expData.description || null,
          type: 'experience',
          active: expData.active !== false,
        };
        console.log('[stripe-webhook-odoo] Fetched product data from experience table');
      } else {
        // Try class table
        const { data: classData, error: classError } = await supabase
          .from('class')
          .select('name, description, active')
          .eq('id', productInternalId)
          .single();
        
        if (classData && !classError) {
          productData = {
            name: classData.name || productName,
            description: classData.description || null,
            type: 'class',
            active: classData.active !== false,
          };
          console.log('[stripe-webhook-odoo] Fetched product data from class table');
        } else {
          // Try trip table
          const { data: tripData, error: tripError } = await supabase
            .from('trip')
            .select('name, description, active')
            .eq('id', productInternalId)
            .single();
          
          if (tripData && !tripError) {
            productData = {
              name: tripData.name || productName,
              description: tripData.description || null,
              type: 'trip',
              active: tripData.active !== false,
            };
            console.log('[stripe-webhook-odoo] Fetched product data from trip table');
          } else {
            console.warn('[stripe-webhook-odoo] Product not found in Supabase, using provided data');
          }
        }
      }
    } catch (supaErr) {
      console.error('[stripe-webhook-odoo] Error fetching product from Supabase (non-blocking):', supaErr);
      // Continue with provided data
    }
  }

  // Step 3: Create product in Odoo
  console.log('[stripe-webhook-odoo] Creating product in Odoo:', productData);
  
  try {
    // Try to create with custom fields first
    const productValues: Record<string, unknown> = {
      name: productData.name,
      type: 'service', // Service product (not storable)
      sale_ok: productData.active,
      purchase_ok: false, // Products are only for sale, not purchase
      list_price: 0, // Prices are dynamic (based on adults/dogs), set to 0
      description: productData.description || '',
      x_product_id: productInternalId, // UUID from Supabase (unique identifier)
      x_product_type: productData.type, // 'class' | 'experience' | 'trip'
    };

    try {
      const newProductId = await odooJsonRpc<number>(
        `${odooUrl}/jsonrpc`,
        {
          service: 'object',
          method: 'execute_kw',
          args: [
            db,
            uid,
            apiKey,
            'product.product',
            'create',
            [productValues],
          ],
        },
      );
      console.log('[stripe-webhook-odoo] Product created successfully with custom fields:', newProductId);
      return newProductId;
    } catch (createErr: any) {
      // If custom fields don't exist, try without them
      const errorMessage = createErr?.message || String(createErr);
      if (errorMessage.includes('x_product_id') || errorMessage.includes('x_product_type') || errorMessage.includes('Invalid field')) {
        console.warn('[stripe-webhook-odoo] Custom fields not available, creating product without them');
        
        const standardFields: Record<string, unknown> = {
          name: productData.name,
          type: 'service',
          sale_ok: productData.active,
          purchase_ok: false,
          list_price: 0,
          description: productData.description || '',
        };

        const newProductId = await odooJsonRpc<number>(
          `${odooUrl}/jsonrpc`,
          {
            service: 'object',
            method: 'execute_kw',
            args: [
              db,
              uid,
              apiKey,
              'product.product',
              'create',
              [standardFields],
            ],
          },
        );
        
        // Try to update with custom fields in a second step (if they exist)
        try {
          await odooJsonRpc(
            `${odooUrl}/jsonrpc`,
            {
              service: 'object',
              method: 'execute_kw',
              args: [
                db,
                uid,
                apiKey,
                'product.product',
                'write',
                [[newProductId], {
                  x_product_id: productInternalId,
                  x_product_type: productData.type,
                }],
              ],
            },
          );
          console.log('[stripe-webhook-odoo] Custom fields added to product:', newProductId);
        } catch (customFieldsErr) {
          // Non-blocking: custom fields may not exist
          console.warn('[stripe-webhook-odoo] Could not add custom fields (non-blocking):', customFieldsErr);
        }
        
        console.log('[stripe-webhook-odoo] Product created successfully without custom fields:', newProductId);
        return newProductId;
      } else {
        throw createErr;
      }
    }
  } catch (err: any) {
    console.error('[stripe-webhook-odoo] Failed to create product in Odoo:', err);
    throw new Error(`Could not create product in Odoo: ${err?.message || String(err)}`);
  }
}

async function createOrUpdateSaleOrder(
  odooUrl: string,
  db: string,
  uid: number,
  apiKey: string,
  paymentIntentId: string,
  partnerId: number,
  booking: BookingInfo,
  partner: PartnerInfo,
  providerPartnerId?: number | null,
  customerFiscalCode?: string | null,
  customerAddress?: string | null,
  orderNumber?: string | null,
) {
  // Optional overrides from env (if provided)
  const maybeInt = (v: string | undefined) => {
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? n : undefined;
  };
  const envPricelistId = maybeInt(process.env.OD_PRICELIST_ID);
  const envPaymentTermId = maybeInt(process.env.OD_PAYMENT_TERM_ID);
  const envCompanyId = maybeInt(process.env.OD_COMPANY_ID);
  const envTeamId = maybeInt(process.env.OD_TEAM_ID);
  const envTaxId22 = maybeInt(process.env.OD_TAX_ID_22);

  // Idempotency: search by client_order_ref = paymentIntentId
  const existing = await odooJsonRpc<number[]>(
    `${odooUrl}/jsonrpc`,
    {
      service: 'object',
      method: 'execute_kw',
      args: [
        db,
        uid,
        apiKey,
        'sale.order',
        'search',
        [[['client_order_ref', '=', paymentIntentId]]],
        { limit: 1 },
      ],
    },
  );

  const orderValues: any = {
    partner_id: partnerId,
    partner_shipping_id: partnerId,
    partner_invoice_id: partnerId,
    client_order_ref: paymentIntentId,
    origin: booking.productName || 'Stripe Order',
    note: [
      ...(orderNumber ? [`Numero Ordine: #${orderNumber}`] : []),
      `Product: ${booking.productName || 'n/a'}`,
      `Provider: ${booking.providerName || 'n/a'}`,
      `Type: ${booking.productType || 'n/a'}`,
      `Guests: ${booking.guests !== undefined && booking.guests !== null ? booking.guests : 'n/a'}`,
      `Dogs: ${booking.dogs !== undefined && booking.dogs !== null ? booking.dogs : 'n/a'}`,
      `Total: ${booking.total ?? 'n/a'} ${booking.currency || ''}`,
      `Date: ${booking.date || 'n/a'}`,
      `ProductId: ${booking.productInternalId || 'n/a'}`,
      `Email: ${partner.email || 'n/a'}`,
      // B2B fields in description
      ...(partner.isB2B ? [
        `B2B: Sì`,
        `Ragione Sociale: ${partner.name || 'n/a'}`,
        ...(partner.contactName || partner.contactSurname ? [
          `Nome contatto: ${partner.contactName || 'n/a'}`,
          `Cognome contatto: ${partner.contactSurname || 'n/a'}`,
        ] : []),
        `P.IVA: ${partner.vatNumber || 'n/a'}`,
        ...(partner.fiscalCode ? [`CF: ${partner.fiscalCode}`] : []),
        ...(partner.sdiCode ? [`SDI: ${partner.sdiCode}`] : []),
        ...(partner.pecEmail ? [`PEC: ${partner.pecEmail}`] : []),
        `Indirizzo: ${partner.street || 'n/a'}, ${partner.city || 'n/a'} ${partner.zip || ''} ${partner.province || ''}`,
      ] : [
        `B2B: No`,
        `Nome: ${partner.name || 'n/a'}`,
        ...(partner.fiscalCode ? [`CF: ${partner.fiscalCode}`] : []),
        `Indirizzo: ${partner.street || 'n/a'}, ${partner.city || 'n/a'} ${partner.zip || ''} ${partner.province || ''}`,
      ]),
    ].join(' | '),
    date_order: formatOdooDatetime(booking.date),
    currency_id: undefined as any, // optional; relies on company currency
    // Optional defaults
    pricelist_id: envPricelistId,
    payment_term_id: envPaymentTermId,
    company_id: envCompanyId,
    team_id: envTeamId,
  };

  // Add custom fields: ProductId, Customer Email, Product Type, Stripe Payment ID, Provider ID
  // Store them separately so we can retry without them if they cause errors
  const customFields: Record<string, any> = {};
  
  // Add provider partner to order if available (as custom field)
  // Try custom field x_provider_id, but handle gracefully if it doesn't exist
  if (providerPartnerId) {
    customFields.x_provider_id = providerPartnerId;
    console.log('[stripe-webhook-odoo] Will add provider partner to order:', providerPartnerId);
  }
  if (booking.productInternalId) {
    customFields.x_product_id = booking.productInternalId;
    console.log('[stripe-webhook-odoo] Will add product ID to order:', booking.productInternalId);
  }
  
  if (partner.email) {
    customFields.x_customer_email = partner.email;
    console.log('[stripe-webhook-odoo] Will add customer email to order:', partner.email);
  }
  
  if (booking.productType) {
    customFields.x_product_type = booking.productType;
    console.log('[stripe-webhook-odoo] Will add product type to order:', booking.productType);
  }
  
  // Add Stripe Payment Intent ID
  if (paymentIntentId) {
    customFields.x_stripe_payment_id = paymentIntentId;
    console.log('[stripe-webhook-odoo] Will add Stripe Payment ID to order:', paymentIntentId);
  }
  
  // Add Customer Fiscal Code
  if (customerFiscalCode) {
    customFields.x_customer_fiscal_code = customerFiscalCode;
    console.log('[stripe-webhook-odoo] Will add customer fiscal code to order:', customerFiscalCode);
  }
  
  // Add Customer Address
  if (customerAddress) {
    customFields.x_customer_address = customerAddress;
    console.log('[stripe-webhook-odoo] Will add customer address to order:', customerAddress);
  }
  
  // Add Booking Date (data dello slot prenotato)
  if (booking.bookingDate) {
    customFields.x_booking_date = booking.bookingDate;
    console.log('[stripe-webhook-odoo] Will add booking date to order:', booking.bookingDate);
  }
  
  // Add Booking Time (ora dello slot prenotato)
  if (booking.bookingTime) {
    customFields.x_booking_time = booking.bookingTime;
    console.log('[stripe-webhook-odoo] Will add booking time to order:', booking.bookingTime);
  }
  
  // Add Order Number (ultimi 8 caratteri del checkout_session_id in uppercase, es. #A0GWPTWH)
  if (orderNumber) {
    customFields.x_order_number = orderNumber;
    console.log('[stripe-webhook-odoo] Will add order number to order:', orderNumber);
  } else {
    console.warn('[stripe-webhook-odoo] ⚠️ Order number is missing! Will not be saved to x_order_number field.');
  }
  
  // NOTE: country_id is NOT a valid field on sale.order - it's inherited from partner
  // The partner already has country_id set (in upsertPartner), so the order will inherit it automatically
  // through partner_id, partner_shipping_id, and partner_invoice_id
  // No need to set country_id explicitly on the order
  
  // Add custom fields to orderValues
  Object.assign(orderValues, customFields);

  // Build minimal order lines if we have a total
  const total = typeof booking.total === 'number' ? booking.total : Number(booking.total);
  const guests = typeof booking.guests === 'number' ? booking.guests : Number(booking.guests);
  
  // IMPORTANT: Quantity is always 1 - the product quantity never changes
  // The number of guests is shown in the product name/description, not in quantity
  const qty = 1;
  
  if (Number.isFinite(total) && total > 0) {
    // CRITICAL: Perfect price matching strategy
    // The total price already includes 22% tax (IVA inclusa).
    // Odoo tax is configured as "EXCLUDED from price", so we must:
    // 1. Calculate the perfect untaxed amount
    // 2. Pass it as price_unit
    // 3. Odoo will add 22% tax on top and reach the exact total
    
    const TAX_RATE = 0.22;
    let priceUnit: number;
    
    if (envTaxId22) {
      // CRITICAL: Find the perfect untaxed amount where: untaxed + round(untaxed × 0.22, 2) === total
      // Some prices require more than 2 decimals for untaxed to achieve perfect matching
      // Strategy: Try with progressively more decimals (2, 3, 4) until we find a perfect match
      
      let perfectUntaxed: number | null = null;
      let bestUntaxed: number | null = null;
      let bestDiff = Infinity;
      let usedDecimals = 2;
      
      // Try with 2, 3, and 4 decimals
      for (const decimals of [2, 3, 4]) {
        const multiplier = Math.pow(10, decimals);
        const estimatedUntaxed = total / (1 + TAX_RATE);
        const minCents = Math.floor(estimatedUntaxed * multiplier) - 10;
        const maxCents = Math.ceil(estimatedUntaxed * multiplier) + 10;
        
        for (let cents = minCents; cents <= maxCents; cents++) {
          const testUntaxed = cents / multiplier;
          const testTax = Math.round(testUntaxed * TAX_RATE * 100) / 100;
          const testTotal = Math.round((testUntaxed + testTax) * 100) / 100;
          const diff = Math.abs(testTotal - total);
          
          if (diff < 0.001) {
            perfectUntaxed = testUntaxed;
            usedDecimals = decimals;
            break;
          }
          
          if (diff < bestDiff) {
            bestUntaxed = testUntaxed;
            bestDiff = diff;
          }
        }
        
        if (perfectUntaxed !== null) {
          break; // Found perfect match, no need to try more decimals
        }
      }
      
      priceUnit = perfectUntaxed !== null ? perfectUntaxed : (bestUntaxed !== null ? bestUntaxed : total / (1 + TAX_RATE));
      
      // Verify the calculation
      const calculatedTax = Math.round(priceUnit * TAX_RATE * 100) / 100;
      const calculatedTotal = Math.round((priceUnit + calculatedTax) * 100) / 100;
      const finalDiff = Math.abs(calculatedTotal - total);
      
      console.log('[stripe-webhook-odoo] Perfect price calculation:', {
        customerPaidTotal: total,
        priceUnit: priceUnit,
        decimalsUsed: usedDecimals,
        calculatedTax: calculatedTax,
        calculatedTotal: calculatedTotal,
        difference: finalDiff,
        isPerfect: finalDiff < 0.001,
        note: 'Odoo will add 22% tax to price_unit and reach exact customer payment',
      });
      
      if (finalDiff >= 0.01) {
        console.error('[stripe-webhook-odoo] ⚠️  Price calculation not perfect:', {
          expected: total,
          calculated: calculatedTotal,
          difference: finalDiff,
          priceUnit,
          decimalsUsed: usedDecimals,
        });
      }
    } else {
      // No tax configured, use total as-is
      priceUnit = total;
    }
    
    // Build product name with guests info if available
    let productName = booking.productName || 'Order line';
    if (guests && guests > 0) {
      productName = `${productName} (${guests} ${guests === 1 ? 'persona' : 'persone'})`;
    }
    if (booking.dogs && booking.dogs > 0) {
      productName = `${productName}, ${booking.dogs} ${booking.dogs === 1 ? 'cane' : 'cani'}`;
    }
    
    // Find or create the correct product in Odoo using x_product_id (UUID from Supabase)
    // This ensures we use the actual product that was synced, and creates it if it doesn't exist
    // All orders for the same product will point to the same Odoo product
    let productId: number | null = null;
    const envProductId = process.env.OD_PRODUCT_ID;
    
    // Priority 1: Use environment variable override if set
    if (envProductId) {
      productId = Number(envProductId);
      console.log('[stripe-webhook-odoo] Using product_id from environment variable:', productId);
    } else if (booking.productInternalId) {
      // Priority 2: Find or create product by x_product_id (UUID from Supabase)
      // This ensures all orders for the same product point to the same Odoo product
      try {
        // Get Supabase credentials from environment (passed from handler)
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        productId = await findOrCreateProductInOdoo(
          odooUrl,
          db,
          uid,
          apiKey,
          booking.productInternalId,
          booking.productName || 'Product',
          booking.productType || 'experience',
          supabaseUrl,
          supabaseServiceKey,
        );
        console.log('[stripe-webhook-odoo] Product found or created:', productId);
      } catch (err: any) {
        console.error('[stripe-webhook-odoo] Error finding/creating product:', err);
        throw new Error(`Could not find or create product in Odoo: ${err?.message || String(err)}`);
      }
    } else {
      // No product ID available - this should not happen in normal flow
      console.error('[stripe-webhook-odoo] No product ID available in booking data');
      throw new Error('Product ID is required to create order line. Please ensure product_id is included in booking metadata.');
    }
    
    const orderLineData: any = {
      product_id: productId, // Required: Odoo needs a product_id for each order line
      name: productName,
      product_uom_qty: qty, // Always 1
      price_unit: priceUnit, // UNTAXED amount - Odoo will add 22% tax on top
      display_type: null,
    };
    // Add 22% tax if tax_id is configured
    // In Odoo, the field is tax_ids (plural, Many2many) not tax_id
    // CRITICAL: Tax is configured as "EXCLUDED from price", so Odoo will:
    // - Take price_unit as the untaxed amount
    // - Add 22% tax on top: tax = round(price_unit × 0.22, 2)
    // - Display total = price_unit + tax (matches exact customer payment)
    if (envTaxId22) {
      orderLineData.tax_ids = [[6, 0, [envTaxId22]]];
    }
    (orderValues as any).order_line = [[0, 0, orderLineData]];
  }

  if (existing.length > 0) {
    const orderId = existing[0];
    console.log('[stripe-webhook-odoo] Updating existing order:', orderId);
    try {
      await odooJsonRpc(
        `${odooUrl}/jsonrpc`,
        {
          service: 'object',
          method: 'execute_kw',
          args: [
            db,
            uid,
            apiKey,
            'sale.order',
            'write',
            [[orderId], orderValues],
          ],
        },
      );
      console.log('[stripe-webhook-odoo] Order updated successfully with all fields, orderId:', orderId);
    } catch (updateErr: any) {
      // If update fails due to custom fields, try without them
      const errorMessage = updateErr?.message || String(updateErr);
      const isCustomFieldError = errorMessage.includes('x_product_id') || 
                                 errorMessage.includes('x_customer_email') || 
                                 errorMessage.includes('x_product_type') ||
                                 errorMessage.includes('x_stripe_payment_id') ||
                                 errorMessage.includes('x_provider_id') ||
                                 errorMessage.includes('x_customer_fiscal_code') ||
                                 errorMessage.includes('x_customer_address') ||
                                 errorMessage.includes('x_booking_date') ||
                                 errorMessage.includes('x_booking_time') ||
                                 errorMessage.includes('Invalid field') ||
                                 errorMessage.includes('unknown field');
      
      if (isCustomFieldError && Object.keys(customFields).length > 0) {
        console.warn('[stripe-webhook-odoo] Order update failed with custom fields, retrying without them:', errorMessage);
        // Remove custom fields and try again
        const orderValuesWithoutCustomFields = { ...orderValues };
        delete orderValuesWithoutCustomFields.x_product_id;
        delete orderValuesWithoutCustomFields.x_customer_email;
        delete orderValuesWithoutCustomFields.x_product_type;
        delete orderValuesWithoutCustomFields.x_stripe_payment_id;
        delete orderValuesWithoutCustomFields.x_provider_id;
        delete orderValuesWithoutCustomFields.x_customer_fiscal_code;
        delete orderValuesWithoutCustomFields.x_customer_address;
        delete orderValuesWithoutCustomFields.x_booking_date;
        delete orderValuesWithoutCustomFields.x_booking_time;
        
        await odooJsonRpc(
          `${odooUrl}/jsonrpc`,
          {
            service: 'object',
            method: 'execute_kw',
            args: [
              db,
              uid,
              apiKey,
              'sale.order',
              'write',
              [[orderId], orderValuesWithoutCustomFields],
            ],
          },
        );
        console.log('[stripe-webhook-odoo] Order updated successfully without custom fields, orderId:', orderId);
        
        // Try to update custom fields separately
        try {
          await odooJsonRpc(
            `${odooUrl}/jsonrpc`,
            {
              service: 'object',
              method: 'execute_kw',
              args: [
                db,
                uid,
                apiKey,
                'sale.order',
                'write',
                [[orderId], customFields],
              ],
            },
          );
          console.log('[stripe-webhook-odoo] Custom fields added to existing order via separate update, orderId:', orderId);
        } catch (customFieldErr) {
          console.warn('[stripe-webhook-odoo] Could not update existing order with custom fields (fields may not exist in Odoo):', customFieldErr);
        }
      } else {
        // Re-throw if it's not a custom field error
        throw updateErr;
      }
    }
    // Confirm order if not already confirmed
    try {
      await odooJsonRpc(
        `${odooUrl}/jsonrpc`,
        {
          service: 'object',
          method: 'execute_kw',
          args: [
            db,
            uid,
            apiKey,
            'sale.order',
            'action_confirm',
            [[orderId]],
          ],
        },
      );
      console.log('[stripe-webhook-odoo] Order confirmed (existing), orderId:', orderId);
      // Ensure state is set to sale
      try {
        await odooJsonRpc(
          `${odooUrl}/jsonrpc`,
          {
            service: 'object',
            method: 'execute_kw',
            args: [
              db,
              uid,
              apiKey,
              'sale.order',
              'write',
              [[orderId], { state: 'sale' }],
            ],
          },
        );
        console.log('[stripe-webhook-odoo] Order state set to sale (existing), orderId:', orderId);
      } catch (stateErr) {
        console.error('[stripe-webhook-odoo] Failed to set order state to sale (existing)', stateErr);
      }
    } catch (confirmErr) {
      // Order might already be confirmed, ignore error
      console.log('[stripe-webhook-odoo] Order confirmation skipped (might already be confirmed)', confirmErr);
    }
    return orderId;
  }

  // Create new sale order
  // Try with custom fields first, fallback without them if they cause errors
  let orderId: number;
  try {
    console.log('[stripe-webhook-odoo] Attempting to create order with custom fields:', Object.keys(customFields));
    orderId = await odooJsonRpc<number>(
      `${odooUrl}/jsonrpc`,
      {
        service: 'object',
        method: 'execute_kw',
        args: [
          db,
          uid,
          apiKey,
          'sale.order',
          'create',
          [{
            ...orderValues,
          }],
        ],
      },
    );
    console.log('[stripe-webhook-odoo] Order created successfully with custom fields, orderId:', orderId);
  } catch (createErr: any) {
    // If creation fails, try without custom fields (they might not exist in Odoo yet)
    const errorMessage = createErr?.message || String(createErr);
    const isCustomFieldError = errorMessage.includes('x_product_id') || 
                               errorMessage.includes('x_customer_email') || 
                               errorMessage.includes('x_product_type') ||
                               errorMessage.includes('x_stripe_payment_id') ||
                               errorMessage.includes('x_provider_id') ||
                               errorMessage.includes('x_customer_fiscal_code') ||
                               errorMessage.includes('x_customer_address') ||
                               errorMessage.includes('Invalid field') ||
                               errorMessage.includes('unknown field');
    
    if (isCustomFieldError && Object.keys(customFields).length > 0) {
      console.warn('[stripe-webhook-odoo] Order creation failed with custom fields, retrying without them:', errorMessage);
      // Remove custom fields and try again
      const orderValuesWithoutCustomFields = { ...orderValues };
      delete orderValuesWithoutCustomFields.x_product_id;
      delete orderValuesWithoutCustomFields.x_customer_email;
      delete orderValuesWithoutCustomFields.x_product_type;
      delete orderValuesWithoutCustomFields.x_stripe_payment_id;
      delete orderValuesWithoutCustomFields.x_provider_id;
      delete orderValuesWithoutCustomFields.x_customer_fiscal_code;
      delete orderValuesWithoutCustomFields.x_customer_address;
      
      orderId = await odooJsonRpc<number>(
        `${odooUrl}/jsonrpc`,
        {
          service: 'object',
          method: 'execute_kw',
          args: [
            db,
            uid,
            apiKey,
            'sale.order',
            'create',
            [orderValuesWithoutCustomFields],
          ],
        },
      );
      console.log('[stripe-webhook-odoo] Order created successfully without custom fields, orderId:', orderId);
      console.warn('[stripe-webhook-odoo] Custom fields were not added. Please verify that x_product_id, x_customer_email, and x_product_type exist in Odoo.');
      
      // Try to update the order with custom fields separately (they might exist but failed during create)
      if (Object.keys(customFields).length > 0) {
        try {
          await odooJsonRpc(
            `${odooUrl}/jsonrpc`,
            {
              service: 'object',
              method: 'execute_kw',
              args: [
                db,
                uid,
                apiKey,
                'sale.order',
                'write',
                [[orderId], customFields],
              ],
            },
          );
          console.log('[stripe-webhook-odoo] Custom fields added to order via update, orderId:', orderId);
        } catch (updateErr) {
          console.warn('[stripe-webhook-odoo] Could not update order with custom fields (fields may not exist in Odoo):', updateErr);
        }
      }
    } else {
      // Re-throw if it's not a custom field error
      throw createErr;
    }
  }

  // Confirm the order immediately (convert from quotation to sale order)
  try {
    await odooJsonRpc(
      `${odooUrl}/jsonrpc`,
      {
        service: 'object',
        method: 'execute_kw',
        args: [
          db,
          uid,
          apiKey,
          'sale.order',
          'action_confirm',
          [[orderId]],
        ],
      },
    );
    console.log('[stripe-webhook-odoo] Order confirmed successfully, orderId:', orderId);
    // Ensure state is set to sale
    try {
      await odooJsonRpc(
        `${odooUrl}/jsonrpc`,
        {
          service: 'object',
          method: 'execute_kw',
          args: [
            db,
            uid,
            apiKey,
            'sale.order',
            'write',
            [[orderId], { state: 'sale' }],
          ],
        },
      );
      console.log('[stripe-webhook-odoo] Order state set to sale, orderId:', orderId);
    } catch (stateErr) {
      console.error('[stripe-webhook-odoo] Failed to set order state to sale', stateErr);
    }
  } catch (confirmErr) {
    console.error('[stripe-webhook-odoo] Failed to confirm order', confirmErr);
    // Still return orderId even if confirmation fails (order exists, just not confirmed)
  }

  return orderId;
}

async function persistBookingToSupabase(
  booking: Record<string, any>,
) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase env vars');
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/booking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(booking),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase booking insert failed: ${res.status} ${text}`);
  }
}

function buildPartnerFromMetadata(meta: Stripe.Metadata): PartnerInfo {
  // B2B DEBUG: Log all metadata before processing
  console.log('[stripe-webhook-odoo] ========================================');
  console.log('[stripe-webhook-odoo] B2B DEBUG: buildPartnerFromMetadata - Input');
  console.log('[stripe-webhook-odoo] All metadata keys:', Object.keys(meta));
  console.log('[stripe-webhook-odoo] is_b2b variants:', {
    'meta.is_b2b': meta.is_b2b,
    'meta.isB2B': meta.isB2B,
    'meta.is_b2B': meta.is_b2B,
    'typeof is_b2b': typeof meta.is_b2b,
    'typeof isB2B': typeof meta.isB2B,
  });
  console.log('[stripe-webhook-odoo] Company fields:', {
    company_name: meta.company_name,
    company_vat_number: meta.company_vat_number,
    company_sdi_code: meta.company_sdi_code,
    company_pec_email: meta.company_pec_email,
  });
  console.log('[stripe-webhook-odoo] Customer fields:', {
    customer_name: meta.customer_name,
    customer_surname: meta.customer_surname,
    customer_email: meta.customer_email,
  });
  console.log('[stripe-webhook-odoo] ========================================');
  
  // CRITICAL: Check is_b2b from metadata (must be in Payment Intent metadata, not just Customer metadata)
  // Check multiple possible formats: 'true', true, '1', 1
  // Note: Stripe.Metadata values are always strings, but we check for boolean for safety
  // IMPORTANT: Convert to boolean explicitly to avoid TypeScript errors
  const isB2B: boolean = !!(
    meta.is_b2b === 'true' || 
    meta.isB2B === 'true' || 
    meta.is_b2B === 'true' ||
    (typeof meta.is_b2b === 'boolean' && meta.is_b2b === true) ||
    (typeof meta.isB2B === 'boolean' && meta.isB2B === true) ||
    (typeof meta.is_b2B === 'boolean' && meta.is_b2B === true) ||
    meta.is_b2b === '1' ||
    meta.isB2B === '1' ||
    meta.is_b2B === '1' ||
    (meta.company_vat_number && meta.company_vat_number.trim() !== '') || // Fallback: if VAT is present, assume B2B
    (meta.company_name && meta.company_name.trim() !== '') // Fallback: if company_name is present, assume B2B
  );
  
  console.log('[stripe-webhook-odoo] buildPartnerFromMetadata - isB2B flag:', {
    is_b2b: meta.is_b2b,
    isB2B: meta.isB2B,
    is_b2B: meta.is_b2B,
    resolved: isB2B,
    hasCompanyVat: !!meta.company_vat_number,
    hasCompanyName: !!meta.company_name,
    company_vat_number: meta.company_vat_number,
    company_name: meta.company_name,
    allMetadataKeys: Object.keys(meta),
    fallback_used_vat: !!(meta.company_vat_number && meta.company_vat_number.trim() !== '') && !meta.is_b2b && !meta.isB2B && !meta.is_b2B,
    fallback_used_company_name: !!(meta.company_name && meta.company_name.trim() !== '') && !meta.is_b2b && !meta.isB2B && !meta.is_b2B && !(meta.company_vat_number && meta.company_vat_number.trim() !== ''),
  });
  
  // For B2B: name MUST be company_name (ragione sociale), NEVER customer_name (which is contact name)
  // For B2C: name is customer_name (or fallback)
  let partnerName: string;
  if (isB2B) {
    // B2B: MUST use company_name (ragione sociale)
    // CRITICAL: Do NOT use customer_name as fallback - it's the contact name, not company name!
    if (meta.company_name && meta.company_name.trim()) {
      partnerName = meta.company_name.trim();
    } else {
      // Log warning if company_name is missing for B2B
      console.warn('[stripe-webhook-odoo] ⚠️⚠️⚠️ B2B WARNING: company_name (ragione sociale) is missing!');
      console.warn('[stripe-webhook-odoo] B2B metadata:', {
        is_b2b: meta.is_b2b,
        company_name: meta.company_name,
        customer_name: meta.customer_name,
        customer_surname: meta.customer_surname,
        company_vat_number: meta.company_vat_number,
        allKeys: Object.keys(meta),
      });
      // Use a default value instead of customer_name
      partnerName = 'Cliente B2B (ragione sociale mancante)';
    }
  } else {
    // B2C: use customer_name
    partnerName = meta.customer_name || meta.name || meta.customerName || 'Cliente';
  }
  
  // For B2B with Italian VAT: always set country to IT
  // For B2C or B2B without VAT: use country from metadata, default to 'IT' if not present
  const hasItalianVat = isB2B && (meta.company_vat_number || meta.vat_number);
  const countryCodeForPartner = hasItalianVat 
    ? 'IT' // B2B with Italian VAT: always Italy
    : (meta.customer_address_country || meta.address_country || meta.country || 'IT'); // B2C: default to 'IT' if not present
  
  const partnerInfo: PartnerInfo = {
    email: meta.customer_email || meta.email || meta.customerEmail || meta.customerEmail || '',
    // CRITICAL: For B2B, name MUST be ragione sociale (company_name), never customer_name
    name: partnerName,
    phone: meta.phone || meta.customer_phone || '',
    fiscalCode: meta.customer_fiscal_code || meta.fiscal_code || meta.codice_fiscale || undefined,
    street: meta.customer_address_line1 || meta.address_line1 || undefined,
    city: meta.customer_address_city || meta.address_city || undefined,
    zip: meta.customer_address_postal_code || meta.address_postal_code || meta.postal_code || undefined,
    province: meta.customer_address_province || meta.address_province || undefined,
    // CRITICAL: For B2B with Italian VAT, always use 'IT' as country
    countryCode: countryCodeForPartner,
    // B2B fields
    isB2B,
    vatNumber: meta.company_vat_number || meta.vat_number || undefined,
    sdiCode: meta.company_sdi_code || meta.sdi_code || undefined,
    pecEmail: meta.company_pec_email || meta.pec_email || undefined,
    // Contact name fields (for B2B: nome e cognome del contatto)
    contactName: meta.customer_name || undefined,
    contactSurname: meta.customer_surname || undefined,
  };
  
  // B2B DEBUG: Log complete partner info
  console.log('[stripe-webhook-odoo] ========================================');
  console.log('[stripe-webhook-odoo] B2B DEBUG: buildPartnerFromMetadata - Output');
  console.log('[stripe-webhook-odoo] Partner Info:', {
    email: partnerInfo.email,
    name: partnerInfo.name,
    name_source: isB2B 
      ? (meta.company_name && meta.company_name.trim() 
          ? 'company_name (B2B - ragione sociale)' 
          : '⚠️ WARNING: company_name missing, using fallback')
      : 'customer_name (B2C)',
    phone: partnerInfo.phone,
    isB2B: partnerInfo.isB2B,
    vatNumber: partnerInfo.vatNumber,
    hasItalianVat: hasItalianVat,
    sdiCode: partnerInfo.sdiCode,
    pecEmail: partnerInfo.pecEmail,
    fiscalCode: partnerInfo.fiscalCode,
    street: partnerInfo.street,
    city: partnerInfo.city,
    zip: partnerInfo.zip,
    province: partnerInfo.province,
    countryCode: partnerInfo.countryCode,
    countryCode_source: hasItalianVat ? 'forced IT (B2B with VAT)' : (meta.customer_address_country ? 'from metadata' : 'default IT (B2C)'),
    contactName: partnerInfo.contactName,
    contactSurname: partnerInfo.contactSurname,
    // DEBUG: Show what was in metadata
    metadata_company_name: meta.company_name,
    metadata_customer_name: meta.customer_name,
    metadata_customer_surname: meta.customer_surname,
  });
  console.log('[stripe-webhook-odoo] ========================================');
  
  return partnerInfo;
}

function buildBookingFromMetadata(meta: Stripe.Metadata): BookingInfo {
  const productInternalId =
    meta.product_id ||
    meta.productId ||
    meta.productIdInternal ||
    meta.internal_product_id ||
    meta.internalProductId;

  // Extract guests/adults - support multiple field names
  const guests = meta.guests 
    ? Number(meta.guests) 
    : meta.number_of_adults 
    ? Number(meta.number_of_adults)
    : meta.numberOfAdults
    ? Number(meta.numberOfAdults)
    : undefined;

  // Extract dogs - support multiple field names
  const dogs = meta.dogs 
    ? Number(meta.dogs) 
    : meta.number_of_dogs 
    ? Number(meta.number_of_dogs)
    : meta.numberOfDogs
    ? Number(meta.numberOfDogs)
    : undefined;

  return {
    productName: meta.product_name || meta.productName,
    productType: meta.product_type || meta.productType,
    providerName: meta.provider_name || meta.providerName,
    productInternalId,
    guests,
    dogs,
    total: meta.total ? Number(meta.total) : meta.total_amount ? Number(meta.total_amount) : undefined,
    currency: meta.currency || meta.currency_code,
    date: meta.date || meta.start_date || meta.booking_date,
    bookingDate: meta.booking_date || undefined, // Data dello slot prenotato (YYYY-MM-DD)
    bookingTime: meta.booking_time || undefined, // Ora dello slot prenotato (HH:MM:SS o HH:MM)
  };
}

function formatOdooDatetime(value?: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  // Format: YYYY-MM-DD HH:mm:ss (UTC)
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

// Next.js API Route exports
// For Stripe webhooks, we need raw body access
// In Next.js App Router, we read the body as text to get the raw bytes
// without any JSON parsing that would invalidate the signature
// Note: In App Router, body is not automatically parsed, so req.text() gives us raw body

// GET handler for testing/health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Stripe webhook endpoint is ready',
    endpoint: '/api/stripe-webhook-odoo',
    methods: ['POST'],
  });
}

// POST handler for Stripe webhooks
export async function POST(req: NextRequest) {
  // Minimal logging - only in development
  secureLogger.log('stripe-webhook-odoo', {
    action: 'webhook_received',
    method: 'POST',
  });

  let odUrl = process.env.OD_URL;
  const odDb = process.env.OD_DB_NAME;
  const odApiKey = process.env.OD_API_KEY;
  const odLogin = process.env.OD_LOGIN;
  const webhookSecret = process.env.ST_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  // Normalize Odoo URL: add https:// if protocol is missing
  if (odUrl && !odUrl.startsWith('http://') && !odUrl.startsWith('https://')) {
    console.log('[stripe-webhook-odoo] ⚠️ OD_URL missing protocol, adding https://');
    odUrl = `https://${odUrl}`;
  }

  // Check environment variables (no logging of values for security)
  const envCheck = {
    odUrl: !!odUrl,
    odDb: !!odDb,
    odApiKey: !!odApiKey,
    odLogin: !!odLogin,
    webhookSecret: !!webhookSecret,
    supabaseUrl: !!supabaseUrl,
    supabaseServiceKey: !!supabaseServiceKey,
    stripeSecretKey: !!stripeSecretKey,
  };
  secureLogger.log('stripe-webhook-odoo', { envCheck });

  if (!odUrl || !odDb || !odApiKey || !odLogin || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    secureLogger.error('stripe-webhook-odoo', new Error('Missing required environment variables'), { envCheck });
    return NextResponse.json({ error: 'Missing required environment variables' }, { status: 500 });
  }

  // Validate Stripe secret key format (optional - only needed for checkout session retrieval)
  if (stripeSecretKey && !stripeSecretKey.startsWith('sk_')) {
    console.warn('[stripe-webhook-odoo] STRIPE_SECRET_KEY appears invalid (should start with sk_ or sk_test_). Checkout session retrieval may fail.');
  }

  let event: Stripe.Event;
  
  // Next.js App Router: Get raw body for signature verification
  try {
    const stripe = getStripe();
    
    // Get signature from headers
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      secureLogger.error('stripe-webhook-odoo', new Error('Missing Stripe signature header'));
      return NextResponse.json({ error: 'Missing Stripe signature header' }, { status: 400 });
    }
    
    // Read raw body
    const rawBody = await getRawBody(req);
    
    if (rawBody.length === 0) {
      secureLogger.error('stripe-webhook-odoo', new Error('Empty request body - cannot verify signature'));
      return NextResponse.json({ error: 'Empty request body - cannot verify signature' }, { status: 400 });
    }
    
    // Verify webhook secret format
    if (!webhookSecret) {
      secureLogger.error('stripe-webhook-odoo', new Error('ST_WEBHOOK_SECRET is not set'));
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    
    if (!webhookSecret.startsWith('whsec_')) {
      secureLogger.warn('stripe-webhook-odoo', { warning: 'ST_WEBHOOK_SECRET does not start with whsec_' });
    }
    
    // Verify signature using Stripe SDK
    secureLogger.log('stripe-webhook-odoo', { action: 'verifying_signature', bodyLength: rawBody.length });
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    
    secureLogger.log('stripe-webhook-odoo', { action: 'signature_verified', eventType: event.type });
    console.log('[stripe-webhook-odoo] Event ID:', event.id);
  } catch (err: any) {
    console.error('[stripe-webhook-odoo] ❌ Signature verification failed');
    console.error('[stripe-webhook-odoo] Error type:', err?.constructor?.name || typeof err);
    console.error('[stripe-webhook-odoo] Error message:', err?.message);
    console.error('[stripe-webhook-odoo] Error details:', {
      message: err?.message,
      type: err?.type,
      header: err?.header,
      payloadLength: err?.payload?.length || 0,
      code: err?.code,
      statusCode: err?.statusCode,
    });
    
    // Check if it's a Stripe signature verification error
    if (err?.type === 'StripeSignatureVerificationError' || err?.message?.includes('signature')) {
      console.error('[stripe-webhook-odoo] This is a signature verification error');
      console.error('[stripe-webhook-odoo] Possible causes:');
      console.error('[stripe-webhook-odoo] 1. Webhook secret mismatch (check ST_WEBHOOK_SECRET)');
      console.error('[stripe-webhook-odoo] 2. Body was modified before verification');
      console.error('[stripe-webhook-odoo] 3. Wrong webhook endpoint secret (test vs live)');
      console.error('[stripe-webhook-odoo] 4. Timestamp too old (replay attack protection)');
    }
    
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'payment_intent.succeeded') {
    console.log('[stripe-webhook-odoo] Ignoring event type:', event.type);
    return NextResponse.json({ received: true, ignored: true });
  }

  console.log('[stripe-webhook-odoo] Processing payment_intent.succeeded event:', event.id);

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const metadata = paymentIntent.metadata || {};

  secureLogger.debug('stripe-webhook-odoo', { action: 'payment_intent_metadata', keys: Object.keys(metadata) });
  
  // B2B DEBUG: Complete metadata dump
  console.log('[stripe-webhook-odoo] ========================================');
  console.log('[stripe-webhook-odoo] B2B DEBUG: Payment Intent Metadata Dump');
  console.log('[stripe-webhook-odoo] Payment Intent ID:', paymentIntent.id);
  console.log('[stripe-webhook-odoo] All metadata keys:', Object.keys(metadata));
  console.log('[stripe-webhook-odoo] is_b2b values:', {
    is_b2b: metadata.is_b2b,
    isB2B: metadata.isB2B,
    is_b2B: metadata.is_b2B,
    all_is_b2b_variants: Object.keys(metadata).filter(k => k.toLowerCase().includes('b2b')),
  });
  console.log('[stripe-webhook-odoo] B2B company fields:', {
    company_name: metadata.company_name,
    company_vat_number: metadata.company_vat_number,
    company_sdi_code: metadata.company_sdi_code,
    company_pec_email: metadata.company_pec_email,
  });
  console.log('[stripe-webhook-odoo] Customer fields:', {
    customer_name: metadata.customer_name,
    customer_surname: metadata.customer_surname,
    customer_email: metadata.customer_email,
    customer_phone: metadata.customer_phone,
    customer_fiscal_code: metadata.customer_fiscal_code,
  });
  secureLogger.debug('stripe-webhook-odoo', { action: 'complete_metadata', keys: Object.keys(metadata) });
  console.log('[stripe-webhook-odoo] ========================================');

  // NEW FLOW: Check if we have customer data in metadata (from internal checkout)
  // This has HIGHEST priority - metadata contains all customer data for new flow
  const hasInternalCheckoutMetadata = metadata.customer_name && metadata.customer_surname;
  
  // Try to fetch checkout session to get customer email and custom fields (Nome/Cognome/Codice Fiscale/Indirizzo)
  // Note: This is CRITICAL for getting the correct customer name, fiscal code, and address from custom fields (legacy flow)
  let checkoutSessionEmail: string | null = null;
  let checkoutSessionFirstName: string | null = null;
  let checkoutSessionLastName: string | null = null;
  let checkoutSessionFiscalCode: string | null = null;
  let checkoutSessionAddress: string | null = null;
  let checkoutSessionRetrieved = false;
  let checkoutSessionId: string | null = null; // Store session ID to calculate order number
  
  // NEW FLOW: Extract customer data from metadata if available (internal checkout)
  if (hasInternalCheckoutMetadata) {
    console.log('[stripe-webhook-odoo] ✅ NEW FLOW: Using customer data from metadata (internal checkout)');
    checkoutSessionFirstName = metadata.customer_name || null;
    checkoutSessionLastName = metadata.customer_surname || null;
    checkoutSessionEmail = metadata.customer_email || null;
    checkoutSessionFiscalCode = metadata.customer_fiscal_code || null;
    // Address is split into components in new flow
    const addressParts = [
      metadata.customer_address_line1,
      metadata.customer_address_city,
      metadata.customer_address_postal_code,
      metadata.customer_address_country || 'IT'
    ].filter(Boolean);
    checkoutSessionAddress = addressParts.length > 0 ? addressParts.join(', ') : null;
    checkoutSessionRetrieved = true; // Mark as retrieved since we have the data
    
    secureLogger.debug('stripe-webhook-odoo', { 
      action: 'customer_data_from_metadata',
      hasFirstName: !!checkoutSessionFirstName,
      hasLastName: !!checkoutSessionLastName,
      hasEmail: !!checkoutSessionEmail,
      hasFiscalCode: !!checkoutSessionFiscalCode,
      hasAddress: !!checkoutSessionAddress,
    });
  }
  // B2B DEBUG: Check if we need to fetch checkout session for B2B metadata
  // Even if we have internal checkout metadata, we might need to fetch session metadata for B2B fields
  const hasB2BMetadata = metadata.is_b2b === 'true' || metadata.isB2B === 'true' || metadata.is_b2B === 'true' || 
                         metadata.company_name || metadata.company_vat_number;
  
  secureLogger.debug('stripe-webhook-odoo', { 
    action: 'checking_b2b_metadata',
    hasB2BMetadata,
    hasIsB2B: !!metadata.is_b2b,
    hasCompanyName: !!metadata.company_name,
    hasVatNumber: !!metadata.company_vat_number,
  });
  
  // Only fetch checkout session if we don't have data from metadata (legacy flow) OR if B2B metadata is missing
  if (!hasInternalCheckoutMetadata || !hasB2BMetadata) {
  if (!hasInternalCheckoutMetadata) {
    console.log('[stripe-webhook-odoo] LEGACY FLOW: Fetching checkout session for custom fields');
    } else {
      secureLogger.debug('stripe-webhook-odoo', { action: 'b2b_metadata_missing', fetching: 'checkout_session' });
    }
  try {
    const stripe = getStripe();
    // First, search for checkout sessions with this payment intent
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntent.id,
      limit: 1,
    });
    if (sessions.data.length > 0) {
      const sessionId = sessions.data[0].id;
      checkoutSessionId = sessionId; // Store for later use
      console.log('[stripe-webhook-odoo] Found checkout session ID:', sessionId);
      
      // Calculate order number from session ID (ultimi 8 caratteri in uppercase)
      const calculatedOrderNumber = sessionId.slice(-8).toUpperCase();
      if (!metadata.order_number) {
        metadata.order_number = calculatedOrderNumber;
        console.log('[stripe-webhook-odoo] Calculated order number from session ID:', calculatedOrderNumber);
      }
      
      // Retrieve the full session details (list() might not include all fields)
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['customer', 'payment_intent'],
      });
      
      // B2B DEBUG: Check session metadata for B2B fields
      secureLogger.debug('stripe-webhook-odoo', { 
        action: 'checkout_session_metadata',
        metadataKeys: Object.keys(session.metadata || {}),
        hasIsB2B: !!(session.metadata?.is_b2b || session.metadata?.isB2B),
        hasCompanyName: !!session.metadata?.company_name,
      });
      
      // If Payment Intent metadata is missing B2B fields, try to get them from session metadata
      if (!hasB2BMetadata && session.metadata) {
        secureLogger.debug('stripe-webhook-odoo', { action: 'merging_b2b_metadata_from_session' });
        if (session.metadata.is_b2b && !metadata.is_b2b) {
          metadata.is_b2b = session.metadata.is_b2b;
          secureLogger.debug('stripe-webhook-odoo', { action: 'added_is_b2b_from_session' });
        }
        if (session.metadata.company_name && !metadata.company_name) {
          metadata.company_name = session.metadata.company_name;
          secureLogger.debug('stripe-webhook-odoo', { action: 'added_company_name_from_session' });
        }
        if (session.metadata.company_vat_number && !metadata.company_vat_number) {
          metadata.company_vat_number = session.metadata.company_vat_number;
          console.log('[stripe-webhook-odoo] B2B DEBUG: Added company_vat_number from session metadata');
        }
        if (session.metadata.company_sdi_code && !metadata.company_sdi_code) {
          metadata.company_sdi_code = session.metadata.company_sdi_code;
          console.log('[stripe-webhook-odoo] B2B DEBUG: Added company_sdi_code from session metadata');
        }
        if (session.metadata.company_pec_email && !metadata.company_pec_email) {
          metadata.company_pec_email = session.metadata.company_pec_email;
          console.log('[stripe-webhook-odoo] B2B DEBUG: Added company_pec_email from session metadata');
        }
      }
      
      checkoutSessionRetrieved = true;
      checkoutSessionEmail = session.customer_email || session.customer_details?.email || null;
      
      // Extract custom fields (Nome and Cognome) - these have ABSOLUTE priority
      secureLogger.debug('stripe-webhook-odoo', { action: 'extracting_custom_fields', hasCustomFields: !!session.custom_fields, customFieldsCount: session.custom_fields?.length || 0 });
      
      if (session.custom_fields && Array.isArray(session.custom_fields)) {
        console.log('[stripe-webhook-odoo] 🔍 DEBUG: Starting custom fields extraction. Total fields:', session.custom_fields.length);
        session.custom_fields.forEach((field: any, index: number) => {
          console.log(`[stripe-webhook-odoo] 🔍 DEBUG [Field ${index + 1}/${session.custom_fields.length}]: Full field structure:`, JSON.stringify(field, null, 2));
          // Check both 'key' and potentially other field names
          const fieldKey = field.key || field.name || field.id;
          console.log(`[stripe-webhook-odoo] 🔍 DEBUG [Field ${index + 1}]: Extracted fieldKey:`, fieldKey);
          
          // Extract value - handle multiple possible structures
          // IMPORTANT: field.label.text.value contains the LABEL (e.g., "Nome", "Cognome"), NOT the user input!
          // The actual user input is in field.value directly
          let fieldValue: string | null = null;
          
          // PRIORITY 1: Try field.value (direct string) - this is where the actual user input is
          console.log(`[stripe-webhook-odoo] 🔍 DEBUG [Field ${index + 1}]: Checking field.value:`, {
            exists: field.value !== undefined && field.value !== null,
            type: typeof field.value,
            value: field.value,
            isString: typeof field.value === 'string',
            isObject: typeof field.value === 'object',
          });
          
          if (field.value !== undefined && field.value !== null) {
            if (typeof field.value === 'string') {
              fieldValue = field.value;
              console.log(`[stripe-webhook-odoo] ✅ DEBUG [Field ${index + 1}]: Found value in field.value (string):`, fieldValue);
            } else if (typeof field.value === 'object') {
              // Nested structure: value.text.value or value.value
              console.log(`[stripe-webhook-odoo] 🔍 DEBUG [Field ${index + 1}]: field.value is object, structure:`, JSON.stringify(field.value, null, 2));
              fieldValue = field.value.text?.value || field.value.value || field.value.text || null;
              if (fieldValue && typeof fieldValue !== 'string') {
                fieldValue = String(fieldValue);
              }
              if (fieldValue) {
                console.log(`[stripe-webhook-odoo] ✅ DEBUG [Field ${index + 1}]: Found value in field.value (object):`, fieldValue);
              } else {
                console.log(`[stripe-webhook-odoo] ⚠️ DEBUG [Field ${index + 1}]: No value extracted from field.value object`);
              }
            } else {
              fieldValue = String(field.value);
              console.log(`[stripe-webhook-odoo] ✅ DEBUG [Field ${index + 1}]: Found value in field.value (converted):`, fieldValue);
            }
          } else {
            console.log(`[stripe-webhook-odoo] ⚠️ DEBUG [Field ${index + 1}]: field.value is undefined or null`);
          }
          
          // PRIORITY 2: Try field.text.value (but NOT field.label.text.value which is the label!)
          // Only use field.text.value if field.value is not available
          if (!fieldValue && field.text !== undefined && field.text !== null) {
            if (typeof field.text === 'string') {
              fieldValue = field.text;
              console.log('[stripe-webhook-odoo] Found value in field.text (string):', fieldValue);
            } else if (typeof field.text === 'object' && field.text.value !== undefined && field.text.value !== null) {
              // Check if this is NOT the label (field.label.text.value contains "Nome" or "Cognome" which are labels)
              const labelValue = field.label?.text?.value;
              const textValue = field.text.value;
              // Only use if it's different from the label (to avoid using label as value)
              if (textValue !== labelValue) {
                fieldValue = typeof textValue === 'string' ? textValue : String(textValue);
                console.log('[stripe-webhook-odoo] Found value in field.text.value:', fieldValue);
              } else {
                console.log('[stripe-webhook-odoo] Skipping field.text.value (same as label):', textValue);
              }
            }
          }
          
          // PRIORITY 3: Try field.dropdown
          if (!fieldValue && field.dropdown !== undefined && field.dropdown !== null) {
            fieldValue = typeof field.dropdown === 'string' ? field.dropdown : String(field.dropdown);
            if (fieldValue) {
              console.log('[stripe-webhook-odoo] Found value in field.dropdown:', fieldValue);
            }
          }
          
          // VALIDATION: Reject values that are clearly labels (not user input)
          // Common labels: "Nome", "Cognome", "Nome *", "Cognome *"
          if (fieldValue) {
            const lowerValue = fieldValue.toLowerCase().trim();
            if (lowerValue === 'nome' || lowerValue === 'cognome' || lowerValue === 'nome *' || lowerValue === 'cognome *') {
              console.warn('[stripe-webhook-odoo] Rejecting value (appears to be a label, not user input):', fieldValue);
              fieldValue = null;
            }
          }
          
          // Clean up the value - remove any object stringification
          if (fieldValue && (fieldValue.includes('[object Object]') || fieldValue === '[object Object]')) {
            console.warn('[stripe-webhook-odoo] Invalid field value (object):', fieldValue);
            fieldValue = null;
          }
          
          // Trim whitespace
          if (fieldValue) {
            fieldValue = fieldValue.trim();
            if (fieldValue === '') {
              fieldValue = null;
            }
          }
          
          // Check both key and label to identify the field
          // Label can be: field.label.custom (e.g., "Nome", "Cognome") or field.label.text.custom
          const labelText = field.label?.custom || field.label?.text?.custom || field.label?.text || '';
          const labelTextLower = typeof labelText === 'string' ? labelText.toLowerCase() : '';
          
          console.log(`[stripe-webhook-odoo] 🔍 DEBUG [Field ${index + 1}]: Field identification:`, {
            fieldKey,
            labelText,
            labelTextLower,
            fieldValue,
            fieldType: field.type,
          });
          
          // Check for full name field (NEW - single field for name and surname)
          // IMPORTANT: Check this FIRST before checking separate first/last name fields
          const isFullName = fieldKey === 'customer_full_name' || 
                            labelTextLower.includes('nome e cognome') ||
                            labelTextLower.includes('nome completo') ||
                            labelTextLower.includes('full name');
          
          // Legacy: separate first and last name fields (for backward compatibility)
          const isLastName = !isFullName && (
                           fieldKey === 'customer_last_name' || 
                           fieldKey === 'Cognome' ||
                           labelText === 'Cognome' || 
                           labelText === 'Cognome *' ||
                           labelTextLower === 'cognome' ||
                           labelTextLower.includes('cognome') ||
                           labelTextLower.includes('last') ||
                           labelTextLower.includes('surname'));
          
          // Only match firstName if it's NOT a lastName and NOT a fullName
          const isFirstName = !isFullName && !isLastName && (
                             fieldKey === 'customer_first_name' || 
                             fieldKey === 'Nome' ||
                             labelText === 'Nome' || 
                             labelText === 'Nome *' ||
                             labelTextLower === 'nome' ||
                             (labelTextLower.includes('nome') && !labelTextLower.includes('cognome')) ||
                             labelTextLower.includes('first') ||
                             (labelTextLower.includes('name') && !labelTextLower.includes('last') && !labelTextLower.includes('cognome')));
          
          // Check for fiscal code field
          const isFiscalCode = fieldKey === 'customer_fiscal_code' || 
                              fieldKey === 'Codice Fiscale' ||
                              labelText === 'Codice Fiscale' || 
                              labelText === 'Codice Fiscale *' ||
                              labelTextLower === 'codice fiscale' ||
                              labelTextLower.includes('codice fiscale') ||
                              labelTextLower.includes('fiscal code') ||
                              labelTextLower.includes('tax id');
          
          // Check for address field
          const isAddress = fieldKey === 'customer_address' || 
                           fieldKey === 'Indirizzo' ||
                           labelText === 'Indirizzo' || 
                           labelText === 'Indirizzo *' ||
                           labelTextLower === 'indirizzo' ||
                           labelTextLower.includes('indirizzo') ||
                           labelTextLower.includes('address');
          
          console.log(`[stripe-webhook-odoo] 🔍 DEBUG [Field ${index + 1}]: Field classification:`, {
            isFullName,
            isFirstName,
            isLastName,
            isFiscalCode,
            isAddress,
            hasValue: !!fieldValue,
            value: fieldValue,
            priority: isFullName ? 'FULL_NAME (highest priority)' : isLastName ? 'LAST_NAME' : isFirstName ? 'FIRST_NAME' : isFiscalCode ? 'FISCAL_CODE' : isAddress ? 'ADDRESS' : 'NONE',
          });
          
          // IMPORTANT: Check fullName FIRST (highest priority)
          // If we have a full name field, split it into first and last name
          if (isFullName && fieldValue) {
            const nameParts = fieldValue.trim().split(/\s+/);
            if (nameParts.length > 0) {
              checkoutSessionFirstName = nameParts[0];
              checkoutSessionLastName = nameParts.slice(1).join(' ') || '';
              console.log(`[stripe-webhook-odoo] ✅✅✅ DEBUG [Field ${index + 1}]: ASSIGNED AS FULL NAME (split)!`, {
                fullName: fieldValue,
                firstName: checkoutSessionFirstName,
                lastName: checkoutSessionLastName,
                key: fieldKey,
                label: labelText,
                value: fieldValue,
              });
            }
          } else if (isLastName && fieldValue) {
            // Legacy: separate last name field
            const previousLastName = checkoutSessionLastName;
            checkoutSessionLastName = fieldValue;
            console.log(`[stripe-webhook-odoo] ✅✅✅ DEBUG [Field ${index + 1}]: ASSIGNED AS LAST NAME!`, {
              previousLastName,
              newLastName: checkoutSessionLastName,
              key: fieldKey,
              label: labelText,
              value: fieldValue,
              matchedBy: fieldKey === 'customer_last_name' ? 'key' : 'label',
            });
          } else if (isFirstName && fieldValue) {
            // Legacy: separate first name field
            const previousFirstName = checkoutSessionFirstName;
            checkoutSessionFirstName = fieldValue;
            console.log(`[stripe-webhook-odoo] ✅✅✅ DEBUG [Field ${index + 1}]: ASSIGNED AS FIRST NAME!`, {
              previousFirstName,
              newFirstName: checkoutSessionFirstName,
              key: fieldKey,
              label: labelText,
              value: fieldValue,
              matchedBy: fieldKey === 'customer_first_name' ? 'key' : 'label',
            });
          } else if (isFiscalCode && fieldValue) {
            const previousFiscalCode = checkoutSessionFiscalCode;
            checkoutSessionFiscalCode = fieldValue;
            console.log(`[stripe-webhook-odoo] ✅✅✅ DEBUG [Field ${index + 1}]: ASSIGNED AS FISCAL CODE!`, {
              previousFiscalCode,
              newFiscalCode: checkoutSessionFiscalCode,
              key: fieldKey,
              label: labelText,
              value: fieldValue,
              matchedBy: fieldKey === 'customer_fiscal_code' ? 'key' : 'label',
            });
          } else if (isAddress && fieldValue) {
            const previousAddress = checkoutSessionAddress;
            checkoutSessionAddress = fieldValue;
            console.log(`[stripe-webhook-odoo] ✅✅✅ DEBUG [Field ${index + 1}]: ASSIGNED AS ADDRESS!`, {
              previousAddress,
              newAddress: checkoutSessionAddress,
              key: fieldKey,
              label: labelText,
              value: fieldValue,
              matchedBy: fieldKey === 'customer_address' ? 'key' : 'label',
            });
          } else if (fieldValue) {
            // Log all custom fields to help debug
            console.log(`[stripe-webhook-odoo] ⚠️ DEBUG [Field ${index + 1}]: Custom field (NOT matched as first or last name):`, {
              key: fieldKey,
              label: labelText,
              value: fieldValue,
              type: field.type,
              isFirstName,
              isLastName,
              reason: !isFirstName && !isLastName ? 'Does not match first or last name patterns' : !fieldValue ? 'No value extracted' : 'Unknown',
            });
          } else {
            console.log(`[stripe-webhook-odoo] ⚠️ DEBUG [Field ${index + 1}]: No value extracted from field`, {
              key: fieldKey,
              label: labelText,
              isFirstName,
              isLastName,
            });
          }
        });
      } else {
        console.warn('[stripe-webhook-odoo] No custom_fields found in checkout session or not an array');
        console.warn('[stripe-webhook-odoo] Session structure:', {
          hasCustomFields: !!session.custom_fields,
          customFieldsType: typeof session.custom_fields,
          customFieldsValue: session.custom_fields,
        });
      }
      
      console.log('[stripe-webhook-odoo] ✅✅✅ DEBUG: FINAL CUSTOM FIELDS EXTRACTION RESULT:', {
        sessionId: session.id,
        email: checkoutSessionEmail,
        firstName: checkoutSessionFirstName,
        lastName: checkoutSessionLastName,
        fiscalCode: checkoutSessionFiscalCode,
        address: checkoutSessionAddress,
        hasFirstName: !!checkoutSessionFirstName,
        hasLastName: !!checkoutSessionLastName,
        hasFiscalCode: !!checkoutSessionFiscalCode,
        hasAddress: !!checkoutSessionAddress,
        hasBoth: !!(checkoutSessionFirstName && checkoutSessionLastName),
        hasCustomFields: !!(checkoutSessionFirstName || checkoutSessionLastName || checkoutSessionFiscalCode || checkoutSessionAddress),
        customFieldsCount: session.custom_fields?.length || 0,
        warning: !checkoutSessionFirstName ? '⚠️ FIRST NAME MISSING!' : '',
        warning2: !checkoutSessionLastName ? '⚠️ LAST NAME MISSING!' : '',
        warning3: !checkoutSessionFiscalCode ? '⚠️ FISCAL CODE MISSING!' : '',
        warning4: !checkoutSessionAddress ? '⚠️ ADDRESS MISSING!' : '',
      });
    } else {
      console.warn('[stripe-webhook-odoo] No checkout session found for payment intent:', paymentIntent.id);
    }
  } catch (err: any) {
    // Log error but don't block order creation - we have other sources for email
    console.error('[stripe-webhook-odoo] Could not fetch checkout session (non-blocking):', err?.message || err);
    console.error('[stripe-webhook-odoo] Error details:', JSON.stringify(err, null, 2));
    // If it's an authentication error, log it more prominently
    if (err?.type === 'StripeAuthenticationError' || err?.statusCode === 401) {
      console.error('[stripe-webhook-odoo] STRIPE_SECRET_KEY is invalid or missing. Check Vercel environment variables.');
      console.error('[stripe-webhook-odoo] WARNING: Cannot retrieve custom fields (Nome/Cognome) without valid Stripe API key!');
    }
  }
  } else {
    console.log('[stripe-webhook-odoo] Skipping checkout session fetch - using metadata (new flow)');
  }

  // Build partner and booking info
  // CRITICAL DEBUG: Log metadata before building partner to verify company_name is present
  console.log('[stripe-webhook-odoo] ========================================');
  console.log('[stripe-webhook-odoo] 🔍 CRITICAL DEBUG: Before buildPartnerFromMetadata');
  console.log('[stripe-webhook-odoo] Metadata company_name:', metadata.company_name);
  console.log('[stripe-webhook-odoo] Metadata customer_name:', metadata.customer_name);
  console.log('[stripe-webhook-odoo] Metadata customer_surname:', metadata.customer_surname);
  console.log('[stripe-webhook-odoo] Metadata is_b2b:', metadata.is_b2b);
  console.log('[stripe-webhook-odoo] All metadata keys:', Object.keys(metadata));
  console.log('[stripe-webhook-odoo] ========================================');
  
  const partnerData = buildPartnerFromMetadata(metadata);
  
  // CRITICAL DEBUG: Log partner data after building to verify name is correct
  console.log('[stripe-webhook-odoo] ========================================');
  console.log('[stripe-webhook-odoo] 🔍 CRITICAL DEBUG: After buildPartnerFromMetadata');
  console.log('[stripe-webhook-odoo] Partner name (should be ragione sociale for B2B):', partnerData.name);
  console.log('[stripe-webhook-odoo] Partner isB2B:', partnerData.isB2B);
  console.log('[stripe-webhook-odoo] Partner contactName:', partnerData.contactName);
  console.log('[stripe-webhook-odoo] Partner contactSurname:', partnerData.contactSurname);
  console.log('[stripe-webhook-odoo] ========================================');
  
  const bookingData = buildBookingFromMetadata(metadata);
  
  // Override fiscal code with value from checkout session custom fields if available (higher priority)
  if (checkoutSessionFiscalCode && checkoutSessionFiscalCode.trim()) {
    partnerData.fiscalCode = checkoutSessionFiscalCode.trim();
    console.log('[stripe-webhook-odoo] Using fiscal code from checkout session custom fields:', partnerData.fiscalCode);
  }
  
  // Enrich address data from metadata (NEW FLOW) - components are already extracted
  // In NEW FLOW, metadata contains customer_address_line1, customer_address_city, etc.
  if (hasInternalCheckoutMetadata) {
    if (metadata.customer_address_line1 && !partnerData.street) {
      partnerData.street = metadata.customer_address_line1.trim();
      secureLogger.log('stripe-webhook-odoo', { action: 'using_street_from_metadata', hasStreet: !!partnerData.street });
    }
    if (metadata.customer_address_city && !partnerData.city) {
      partnerData.city = metadata.customer_address_city.trim();
      secureLogger.log('stripe-webhook-odoo', { action: 'using_city_from_metadata', hasCity: !!partnerData.city });
    }
    if (metadata.customer_address_postal_code && !partnerData.zip) {
      partnerData.zip = metadata.customer_address_postal_code.trim();
      secureLogger.log('stripe-webhook-odoo', { action: 'using_zip_from_metadata', hasZip: !!partnerData.zip });
    }
    if (metadata.customer_address_country && !partnerData.countryCode) {
      partnerData.countryCode = metadata.customer_address_country.trim().toUpperCase();
      secureLogger.log('stripe-webhook-odoo', { action: 'using_country_from_metadata', hasCountry: !!partnerData.countryCode });
    }
  }
  
  // For LEGACY FLOW: if we have checkoutSessionAddress as a string but no components,
  // use it as street (best effort)
  if (checkoutSessionAddress && checkoutSessionAddress.trim() && !partnerData.street && !hasInternalCheckoutMetadata) {
    partnerData.street = checkoutSessionAddress.trim();
    secureLogger.log('stripe-webhook-odoo', { action: 'using_address_string_legacy', hasStreet: !!partnerData.street });
  }

  // Enrich partner/booking with fallbacks from paymentIntent and checkout session
  // Priority: checkout session custom fields (Nome/Cognome) > checkout session > payment intent metadata > payment intent fields
  if (!partnerData.email || partnerData.email.startsWith('missing-') || partnerData.email.includes('@example.com')) {
    const enrichedEmail = 
      checkoutSessionEmail ||
      metadata.customer_email ||
      metadata.email ||
      paymentIntent.receipt_email ||
      (paymentIntent as any).billing_details?.email ||
      (paymentIntent as any).customer_email ||
      (paymentIntent.customer as string) ||
      null;
    
    if (enrichedEmail && !enrichedEmail.includes('@example.com') && !enrichedEmail.startsWith('missing-')) {
      partnerData.email = enrichedEmail;
    } else if (!partnerData.email) {
      // Last resort: use payment intent ID as email (will be rejected by upsertPartner)
      partnerData.email = `missing-${paymentIntent.id}@example.com`;
    }
    secureLogger.log('stripe-webhook-odoo', { action: 'email_enriched', hasEmail: !!partnerData.email });
  }
  
  // CRITICAL: For B2B, partner.name is already set to ragione sociale (company_name) in buildPartnerFromMetadata
  // DO NOT override it with firstName + lastName - those are the contact person's name, not the company name!
  const isB2B = partnerData.isB2B === true;
  
  // IMPORTANT: For B2C only, use custom fields (Nome/Cognome) from checkout session if available
  // For B2B, partner.name is already the ragione sociale and must NOT be changed
  let nameFromCustomFields: string | null = null;
  
  console.log('[stripe-webhook-odoo] 🔍 DEBUG: Building full name from custom fields:', {
    isB2B,
    hasFirstName: !!checkoutSessionFirstName,
    hasLastName: !!checkoutSessionLastName,
    firstName: checkoutSessionFirstName,
    lastName: checkoutSessionLastName,
    checkoutSessionRetrieved,
    currentPartnerName: partnerData.name,
    warning: isB2B ? '⚠️⚠️⚠️ B2B: Will NOT override partner.name (ragione sociale) with firstName+lastName' : null,
  });
  
  // CRITICAL: For B2B, DO NOT override partner.name - it's already the ragione sociale
  if (!isB2B && (checkoutSessionFirstName || checkoutSessionLastName)) {
    const firstName = checkoutSessionFirstName ? String(checkoutSessionFirstName).trim() : '';
    const lastName = checkoutSessionLastName ? String(checkoutSessionLastName).trim() : '';
    
    console.log('[stripe-webhook-odoo] 🔍 DEBUG: Trimmed values:', {
      firstName,
      lastName,
      firstNameLength: firstName.length,
      lastNameLength: lastName.length,
    });
    
    // Always format as "Nome Cognome" - use both if available
    let fullName = '';
    if (firstName && lastName) {
      fullName = `${firstName} ${lastName}`.trim();
      console.log('[stripe-webhook-odoo] ✅✅✅ DEBUG: Full name built (BOTH first and last):', fullName);
    } else if (firstName) {
      fullName = firstName;
      console.log('[stripe-webhook-odoo] ⚠️⚠️⚠️ DEBUG: Full name built (ONLY first, missing last!):', fullName);
    } else if (lastName) {
      fullName = lastName;
      console.log('[stripe-webhook-odoo] ⚠️⚠️⚠️ DEBUG: Full name built (ONLY last, missing first!):', fullName);
    }
    
    if (fullName) {
      nameFromCustomFields = fullName;
      partnerData.name = fullName;
      console.log('[stripe-webhook-odoo] ✅✅✅ DEBUG: Final partner name set from custom fields:', {
        partnerName: partnerData.name,
        firstName: checkoutSessionFirstName,
        lastName: checkoutSessionLastName,
        fullName: fullName,
        hasBothNames: !!(firstName && lastName),
        warning: !firstName ? '⚠️⚠️⚠️ FIRST NAME MISSING IN FINAL NAME!' : '',
        warning2: !lastName ? '⚠️⚠️⚠️ LAST NAME MISSING IN FINAL NAME!' : '',
      });
    } else {
      console.error('[stripe-webhook-odoo] ❌❌❌ DEBUG: Custom fields found but fullName is empty!', { 
        firstName: checkoutSessionFirstName, 
        lastName: checkoutSessionLastName,
        firstNameTrimmed: firstName,
        lastNameTrimmed: lastName,
      });
    }
  } else if (checkoutSessionRetrieved) {
    // Checkout session was retrieved but custom fields are missing
    console.error('[stripe-webhook-odoo] ⚠️ Checkout session retrieved but custom fields (Nome/Cognome) are missing!');
    console.error('[stripe-webhook-odoo] This should not happen - custom fields are required in checkout.');
  }
  
  // If we still don't have a name from custom fields, use fallback
  // BUT: NEVER use email as name - it's always wrong
  // CRITICAL: For B2B, partnerData.name is already the ragione sociale from buildPartnerFromMetadata
  // DO NOT override it with customer_name (which is the contact name, not company name)
  if (!nameFromCustomFields) {
    // Check if we tried to get custom fields but they weren't in the session
    const triedCustomFields = checkoutSessionRetrieved && (checkoutSessionFirstName !== null || checkoutSessionLastName !== null);
    
    if (isB2B) {
      // For B2B: preserve the ragione sociale already set by buildPartnerFromMetadata
      // Only use company_name as fallback if current name is missing/invalid
      if (!partnerData.name || partnerData.name.trim() === '' || partnerData.name === 'Cliente' || partnerData.name.includes('mancante')) {
        // Try to get company_name from metadata as last resort
        const companyName = metadata.company_name?.trim();
        if (companyName) {
          partnerData.name = companyName;
          console.log('[stripe-webhook-odoo] ✅ B2B: Using company_name (ragione sociale) from metadata:', partnerData.name);
        } else {
          console.warn('[stripe-webhook-odoo] ⚠️ B2B: Ragione sociale missing, keeping current name:', partnerData.name);
        }
      } else {
        console.log('[stripe-webhook-odoo] ✅ B2B: Preserving ragione sociale from buildPartnerFromMetadata:', partnerData.name);
      }
    } else {
      // For B2C: use fallback but NEVER email
      if (!checkoutSessionRetrieved) {
        // Checkout session not retrieved - this is a problem
        console.error('[stripe-webhook-odoo] ⚠️ Checkout session NOT retrieved - cannot get custom fields (Nome/Cognome)!');
        console.error('[stripe-webhook-odoo] Check STRIPE_SECRET_KEY in Vercel environment variables.');
        // Use fallback but NEVER email
        partnerData.name = 
          metadata.customer_name ||
          metadata.name ||
          paymentIntent.shipping?.name || 
          (paymentIntent as any).billing_details?.name || 
          paymentIntent.customer || 
          'Unknown Customer';
        console.log('[stripe-webhook-odoo] Using fallback name (checkout session not retrieved):', partnerData.name);
      } else if (triedCustomFields && !checkoutSessionFirstName && !checkoutSessionLastName) {
        // Custom fields were checked but were empty - this is a problem
        console.error('[stripe-webhook-odoo] ⚠️ Custom fields checked but both are empty!');
        // Use fallback but NEVER email
        partnerData.name = 
          metadata.customer_name ||
          metadata.name ||
          paymentIntent.shipping?.name || 
          (paymentIntent as any).billing_details?.name || 
          'Unknown Customer';
        console.log('[stripe-webhook-odoo] Using fallback name (custom fields empty):', partnerData.name);
      } else {
        // Custom fields not found in session - use fallback but NEVER email
        console.warn('[stripe-webhook-odoo] Custom fields not found in checkout session, using fallback');
        partnerData.name = 
          metadata.customer_name ||
          metadata.name ||
          paymentIntent.shipping?.name || 
          (paymentIntent as any).billing_details?.name || 
          'Unknown Customer';
        console.log('[stripe-webhook-odoo] Using fallback name (custom fields not found):', partnerData.name);
      }
    }
  }
  
  // Final validation: if name contains @ or / or looks like an email, it's wrong
  // CRITICAL: For B2B, do NOT use custom fields (contact name) - use company_name instead
  if (partnerData.name && (partnerData.name.includes('@') || partnerData.name.includes('/') || partnerData.name.length < 2)) {
    console.error('[stripe-webhook-odoo] ❌ Invalid name detected (looks like email/path or too short):', partnerData.name);
    
    if (isB2B) {
      // For B2B: use company_name (ragione sociale) as correction, NEVER contact name
      const companyName = metadata.company_name?.trim();
      if (companyName) {
        partnerData.name = companyName;
        console.log('[stripe-webhook-odoo] ✅ B2B: Corrected name using company_name (ragione sociale):', partnerData.name);
      } else {
        // Last resort: use a generic B2B name
        partnerData.name = 'Cliente B2B';
        console.warn('[stripe-webhook-odoo] ⚠️ B2B: Using generic name "Cliente B2B" instead of invalid name (company_name missing)');
      }
    } else {
      // For B2C: try to extract a better name from custom fields if available
      if (checkoutSessionFirstName || checkoutSessionLastName) {
        const firstName = checkoutSessionFirstName || '';
        const lastName = checkoutSessionLastName || '';
        const fullName = `${firstName}${lastName ? ' ' + lastName : ''}`.trim();
        if (fullName) {
          partnerData.name = fullName;
          console.log('[stripe-webhook-odoo] ✅ B2C: Corrected name from custom fields:', partnerData.name);
        }
      } else {
        // If we can't get custom fields, use a generic name instead of email
        partnerData.name = 'Cliente';
        console.warn('[stripe-webhook-odoo] Using generic name "Cliente" instead of invalid name');
      }
    }
  }
  
  // Final verification: ensure partnerData.name is correct for Odoo
  // CRITICAL: For B2B, partner.name is already the ragione sociale and must NOT be changed
  // For B2C, ensure it's the full name (Nome + Cognome)
  if (!isB2B && (checkoutSessionFirstName || checkoutSessionLastName)) {
    const firstName = checkoutSessionFirstName ? String(checkoutSessionFirstName).trim() : '';
    const lastName = checkoutSessionLastName ? String(checkoutSessionLastName).trim() : '';
    
    // Rebuild full name to ensure it's correct (B2C only)
    if (firstName && lastName) {
      partnerData.name = `${firstName} ${lastName}`.trim();
    } else if (firstName) {
      partnerData.name = firstName;
    } else if (lastName) {
      partnerData.name = lastName;
    }
    
    console.log('[stripe-webhook-odoo] ✅ Final partner name for Odoo (Nome + Cognome - B2C):', partnerData.name, {
      firstName: checkoutSessionFirstName,
      lastName: checkoutSessionLastName,
      fromCustomFields: true,
    });
  } else if (isB2B) {
    console.log('[stripe-webhook-odoo] ✅ Final partner name for Odoo (Ragione Sociale - B2B):', partnerData.name, {
      isB2B: true,
      nameSource: 'company_name (ragione sociale)',
      contactName: checkoutSessionFirstName,
      contactSurname: checkoutSessionLastName,
      warning: '⚠️⚠️⚠️ B2B: partner.name is ragione sociale, NOT contact name',
    });
  } else {
    console.log('[stripe-webhook-odoo] Final partner name:', partnerData.name, {
      fromCustomFields: !!nameFromCustomFields,
      checkoutSessionRetrieved,
      firstName: checkoutSessionFirstName,
      lastName: checkoutSessionLastName,
    });
  }
  if (!partnerData.phone && paymentIntent.shipping?.phone) {
    partnerData.phone = paymentIntent.shipping.phone;
  }
  if (!partnerData.phone && (paymentIntent as any).billing_details?.phone) {
    partnerData.phone = (paymentIntent as any).billing_details.phone;
  }

  const amountFromPI = (paymentIntent.amount_received ?? paymentIntent.amount ?? 0) / 100;
  const currencyFromPI = paymentIntent.currency || bookingData.currency;
  const dateFromPI = paymentIntent.created
    ? formatOdooDatetime(new Date(paymentIntent.created * 1000).toISOString())
    : formatOdooDatetime(bookingData.date);

  bookingData.productName = bookingData.productName || paymentIntent.description || 'Stripe Order';
  bookingData.productType = bookingData.productType || 'experience';
  // Ensure guests and dogs are set - try metadata first, then defaults
  if (bookingData.guests === undefined || bookingData.guests === null) {
    bookingData.guests = metadata.number_of_adults ? Number(metadata.number_of_adults) : metadata.guests ? Number(metadata.guests) : 1;
  }
  if (bookingData.dogs === undefined || bookingData.dogs === null) {
    bookingData.dogs = metadata.number_of_dogs ? Number(metadata.number_of_dogs) : metadata.dogs ? Number(metadata.dogs) : 0;
  }
  console.log('[stripe-webhook-odoo] Final guests and dogs:', { guests: bookingData.guests, dogs: bookingData.dogs });
  bookingData.productInternalId = bookingData.productInternalId || metadata.product_id || metadata.productId || (paymentIntent as any).metadata?.product_id;
  bookingData.total = bookingData.total ?? amountFromPI;
  bookingData.currency = bookingData.currency || currencyFromPI;
  bookingData.date = dateFromPI || bookingData.date || formatOdooDatetime(new Date().toISOString());
  
  // Ensure booking_date and booking_time are set from metadata if available
  if (!bookingData.bookingDate && metadata.booking_date) {
    bookingData.bookingDate = metadata.booking_date;
    console.log('[stripe-webhook-odoo] Using booking_date from metadata:', bookingData.bookingDate);
  }
  if (!bookingData.bookingTime && metadata.booking_time) {
    bookingData.bookingTime = metadata.booking_time;
    console.log('[stripe-webhook-odoo] Using booking_time from metadata:', bookingData.bookingTime);
  }

  // Try to fetch provider name from Supabase if not in metadata
  if ((!bookingData.providerName || bookingData.providerName === 'Unknown provider') && bookingData.productInternalId) {
    console.log('[stripe-webhook-odoo] Fetching provider for product:', bookingData.productInternalId);
    try {
      const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);
      // Try experience table first
      let providerId: string | null = null;
      const { data: expData, error: expError } = await supabase
        .from('experience')
        .select('provider_id')
        .eq('id', bookingData.productInternalId)
        .single();
      if (expData && !expError) {
        providerId = expData.provider_id;
        console.log('[stripe-webhook-odoo] Found provider_id from experience:', providerId);
      } else {
        // Try class table
        const { data: classData, error: classError } = await supabase
          .from('class')
          .select('provider_id')
          .eq('id', bookingData.productInternalId)
          .single();
        if (classData && !classError) {
          providerId = classData.provider_id;
          console.log('[stripe-webhook-odoo] Found provider_id from class:', providerId);
        } else {
          // Try trip table
          const { data: tripData, error: tripError } = await supabase
            .from('trip')
            .select('provider_id')
            .eq('id', bookingData.productInternalId)
            .single();
          if (tripData && !tripError) {
            providerId = tripData.provider_id;
            console.log('[stripe-webhook-odoo] Found provider_id from trip:', providerId);
          } else {
            console.error('[stripe-webhook-odoo] Product not found in any table:', {
              productId: bookingData.productInternalId,
              expError,
              classError,
              tripError,
            });
          }
        }
      }
      
      // Fetch provider details if we found a provider_id
      if (providerId) {
        bookingData.providerId = providerId; // Save provider ID for reference
        const { data: profileData, error: profileError } = await supabase
          .from('profile')
          .select('company_name, email, contact_name')
          .eq('id', providerId)
          .single();
        if (profileData && !profileError) {
          bookingData.providerName = profileData.company_name || bookingData.providerName;
          bookingData.providerEmail = profileData.email || undefined;
          console.log('[stripe-webhook-odoo] Found provider from Supabase:', {
            name: bookingData.providerName,
            email: bookingData.providerEmail,
            contactName: profileData.contact_name,
          });
        } else {
          console.error('[stripe-webhook-odoo] Profile not found or error:', {
            providerId,
            profileError,
            profileData,
          });
        }
      }
    } catch (supaErr) {
      console.error('[stripe-webhook-odoo] Error fetching provider from Supabase', supaErr);
    }
  }
  if (!bookingData.providerName || bookingData.providerName === 'Unknown provider') {
    bookingData.providerName = metadata.provider_name || metadata.providerName || 'Unknown provider';
  }

  console.log('[stripe-webhook-odoo] Partner data:', JSON.stringify(partnerData));
  console.log('[stripe-webhook-odoo] Booking data:', JSON.stringify(bookingData));

  // Idempotent key: paymentIntent.id
  try {
    console.log('[stripe-webhook-odoo] Authenticating with Odoo...');
    const uid = await authenticateOdooUser(odUrl, odDb, odLogin, odApiKey);
    console.log('[stripe-webhook-odoo] Odoo authentication successful, uid:', uid);

    // Final verification: ensure partnerData.name is correct for Odoo
    // CRITICAL: For B2B, partner.name is already the ragione sociale and must NOT be changed
    // For B2C, ensure it's "Nome + Cognome"
    const isB2B = partnerData.isB2B === true;
    console.log('[stripe-webhook-odoo] 🔍 DEBUG: Final verification before Odoo save:', {
      isB2B,
      currentPartnerName: partnerData.name,
      hasFirstName: !!checkoutSessionFirstName,
      hasLastName: !!checkoutSessionLastName,
      firstName: checkoutSessionFirstName,
      lastName: checkoutSessionLastName,
      warning: isB2B ? '⚠️⚠️⚠️ B2B: Will NOT override partner.name (ragione sociale) with firstName+lastName' : null,
    });
    
    // CRITICAL: For B2B, DO NOT override partner.name - it's already the ragione sociale
    if (!isB2B && (checkoutSessionFirstName || checkoutSessionLastName)) {
      const firstName = checkoutSessionFirstName ? String(checkoutSessionFirstName).trim() : '';
      const lastName = checkoutSessionLastName ? String(checkoutSessionLastName).trim() : '';
      
      // Rebuild full name to ensure it's correct for Odoo (B2C only)
      if (firstName && lastName) {
        partnerData.name = `${firstName} ${lastName}`.trim();
        console.log('[stripe-webhook-odoo] ✅✅✅ DEBUG: Final partner name for Odoo (BOTH Nome + Cognome - B2C):', partnerData.name);
      } else if (firstName) {
        partnerData.name = firstName;
        console.error('[stripe-webhook-odoo] ❌❌❌ DEBUG: PROBLEM! Only first name available for Odoo (LAST NAME MISSING!):', partnerData.name);
      } else if (lastName) {
        partnerData.name = lastName;
        console.error('[stripe-webhook-odoo] ❌❌❌ DEBUG: PROBLEM! Only last name available for Odoo (FIRST NAME MISSING!):', partnerData.name);
      }
    } else if (isB2B) {
      console.log('[stripe-webhook-odoo] ✅✅✅ DEBUG: Final partner name for Odoo (Ragione Sociale - B2B):', partnerData.name, {
        isB2B: true,
        nameSource: 'company_name (ragione sociale)',
        contactName: checkoutSessionFirstName,
        contactSurname: checkoutSessionLastName,
        warning: '⚠️⚠️⚠️ B2B: partner.name is ragione sociale, NOT contact name',
      });
    }
    
    console.log('[stripe-webhook-odoo] ✅✅✅ DEBUG: FINAL partnerData before Odoo upsert:', {
      name: partnerData.name,
      email: partnerData.email,
      phone: partnerData.phone,
      nameLength: partnerData.name?.length || 0,
      nameParts: partnerData.name?.split(' ') || [],
      warning: partnerData.name?.split(' ').length === 1 ? '⚠️⚠️⚠️ NAME HAS ONLY ONE PART - MISSING FIRST OR LAST NAME!' : '',
    });
    
    let partnerId: number;
    try {
      console.log('[stripe-webhook-odoo] Upserting partner in Odoo with name:', partnerData.name);
      partnerId = await upsertPartner(odUrl, odDb, uid, odApiKey, partnerData);
      console.log('[stripe-webhook-odoo] ✅✅✅ DEBUG: Partner upserted successfully:', {
        partnerId,
        name: partnerData.name,
        nameParts: partnerData.name?.split(' ') || [],
        hasMultipleParts: (partnerData.name?.split(' ') || []).length > 1,
      });
    } catch (err: any) {
      const safeErr = err instanceof Error ? { message: err.message, stack: err.stack } : { error: String(err) };
      console.error('[stripe-webhook-odoo] Odoo partner upsert error (non-blocking):', { error: safeErr, partnerData, paymentIntentId: paymentIntent.id });
      
      // Try to find existing partner by email as fallback
      try {
        const searchByEmail = await odooJsonRpc<number[]>(
          `${odUrl}/jsonrpc`,
          {
            service: 'object',
            method: 'execute_kw',
            args: [
              odDb,
              uid,
              odApiKey,
              'res.partner',
              'search',
              [[['email', '=', partnerData.email || '']]],
              { limit: 1 },
            ],
          },
        );
        
        if (searchByEmail.length > 0) {
          partnerId = searchByEmail[0];
          console.log('[stripe-webhook-odoo] Using existing partner as fallback, partnerId:', partnerId);
        } else {
          // Last resort: create minimal partner without problematic fields
          console.log('[stripe-webhook-odoo] Creating minimal partner without problematic fields...');
          const minimalPartner: PartnerInfo = {
            name: partnerData.name || 'Cliente',
            email: partnerData.email || `order-${paymentIntent.id}@flixdog.internal`,
            phone: partnerData.phone || '',
            isB2B: partnerData.isB2B || false,
            street: partnerData.street,
            city: partnerData.city,
            zip: partnerData.zip,
            countryCode: partnerData.countryCode || 'IT',
            // Explicitly exclude VAT/CF/SDI/PEC to avoid validation errors
          };
          
          partnerId = await upsertPartner(odUrl, odDb, uid, odApiKey, minimalPartner);
          console.log('[stripe-webhook-odoo] Minimal partner created, partnerId:', partnerId);
        }
      } catch (fallbackErr: any) {
        console.error('[stripe-webhook-odoo] All partner creation attempts failed (non-blocking):', fallbackErr);
        // If we absolutely cannot create/find a partner, we still need to create the order
        // Use a default partner ID or create order without partner (if Odoo allows)
        // For now, throw error but this should be handled gracefully
        throw new Error(`Could not create or find partner in Odoo: ${err?.message || String(err)}. Fallback also failed: ${fallbackErr?.message || String(fallbackErr)}`);
      }
    }

    // Upsert provider as separate partner for purchase order tracking
    let providerPartnerId: number | null = null;
    if (bookingData.providerName && bookingData.providerName !== 'Unknown provider') {
      try {
        console.log('[stripe-webhook-odoo] Upserting provider partner in Odoo:', bookingData.providerName);
        providerPartnerId = await upsertProviderPartner(
          odUrl,
          odDb,
          uid,
          odApiKey,
          bookingData.providerName,
          bookingData.providerEmail,
        );
        if (providerPartnerId) {
          console.log('[stripe-webhook-odoo] Provider partner upserted successfully, providerPartnerId:', providerPartnerId);
        }
      } catch (err: any) {
        // Don't fail the entire operation if provider partner creation fails
        console.error('[stripe-webhook-odoo] Provider partner upsert error (non-blocking):', err);
      }
    }

    let orderId: number;
    try {
      console.log('[stripe-webhook-odoo] ========================================');
      console.log('[stripe-webhook-odoo] Creating/updating sale order in Odoo...');
      console.log('[stripe-webhook-odoo] Payment Intent ID:', paymentIntent.id);
      console.log('[stripe-webhook-odoo] Partner ID:', partnerId);
      console.log('[stripe-webhook-odoo] Booking Data:', JSON.stringify(bookingData, null, 2));
      console.log('[stripe-webhook-odoo] Partner Data:', JSON.stringify(partnerData, null, 2));
      console.log('[stripe-webhook-odoo] Provider Partner ID:', providerPartnerId);
      console.log('[stripe-webhook-odoo] ========================================');
      
      // Calculate order number from metadata or checkout session
      let orderNumber: string | null = metadata.order_number || null;
      if (!orderNumber) {
        // Try to calculate from checkout session ID if we have it
        // This is a fallback - ideally order_number should be in metadata
        console.log('[stripe-webhook-odoo] Order number not in metadata, will try to calculate from checkout session');
      }
      
      orderId = await createOrUpdateSaleOrder(
        odUrl,
        odDb,
        uid,
        odApiKey,
        paymentIntent.id,
        partnerId,
        bookingData,
        partnerData,
        providerPartnerId,
        checkoutSessionFiscalCode || null,
        checkoutSessionAddress || null,
        orderNumber || null,
      );
      console.log('[stripe-webhook-odoo] ✅ Sale order created/updated successfully, orderId:', orderId);
      console.log('[stripe-webhook-odoo] ========================================');
    } catch (err: any) {
      const safeErr = err instanceof Error ? { message: err.message, stack: err.stack } : { error: String(err) };
      console.error('[stripe-webhook-odoo] ❌ Odoo sale.order error', { 
        error: safeErr, 
        bookingData, 
        paymentIntentId: paymentIntent.id, 
        partnerId,
        providerPartnerId 
      });
      console.error('[stripe-webhook-odoo] ========================================');
      throw err;
    }

    // Try to update existing booking in Supabase with correct customer name/surname
    // IMPORTANT: The booking should already exist (created by stripe-webhook -> create-booking)
    // We only update customer_name and customer_surname if they're incorrect
    try {
      const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);
      
      // IMPORTANT: In Supabase, save Nome and Cognome separately
      // customer_name = Nome (from custom field)
      // customer_surname = Cognome (from custom field)
      // NOT the full name or "Full name on card"
      // Use the EXACT values from custom fields that were successfully extracted
      const customerNameForSupabase = checkoutSessionFirstName ? String(checkoutSessionFirstName).trim() : null; // Only Nome
      const customerSurnameForSupabase = checkoutSessionLastName ? String(checkoutSessionLastName).trim() : null; // Only Cognome
      
      console.log('[stripe-webhook-odoo] ✅✅✅ DEBUG: Supabase update - Customer data extraction:', {
        checkoutSessionFirstName: checkoutSessionFirstName,
        checkoutSessionLastName: checkoutSessionLastName,
        customerNameForSupabase: customerNameForSupabase,
        customerSurnameForSupabase: customerSurnameForSupabase,
      });
      
      // Check if booking already exists (created by stripe-webhook -> create-booking)
      const { data: existingBooking, error: searchError } = await supabase
        .from('booking')
        .select('id, customer_name, customer_surname')
        .eq('stripe_payment_intent_id', paymentIntent.id)
        .maybeSingle();
      
      if (searchError) {
        console.error('[stripe-webhook-odoo] Error searching for existing booking:', searchError);
      } else if (existingBooking) {
        // Booking exists - update customer_name and customer_surname if needed
        const needsUpdate = 
          existingBooking.customer_name !== customerNameForSupabase ||
          existingBooking.customer_surname !== customerSurnameForSupabase;
        
        if (needsUpdate) {
          console.log('[stripe-webhook-odoo] Updating existing booking with correct customer name/surname:', {
            bookingId: existingBooking.id,
            oldName: existingBooking.customer_name,
            newName: customerNameForSupabase,
            oldSurname: existingBooking.customer_surname,
            newSurname: customerSurnameForSupabase,
          });
          
          const { error: updateError } = await supabase
            .from('booking')
            .update({
              customer_name: customerNameForSupabase,
              customer_surname: customerSurnameForSupabase,
            })
            .eq('id', existingBooking.id);
          
          if (updateError) {
            console.error('[stripe-webhook-odoo] Error updating booking:', updateError);
          } else {
            console.log('[stripe-webhook-odoo] ✅✅✅ Booking updated successfully with correct customer name/surname');
          }
        } else {
          console.log('[stripe-webhook-odoo] Booking already has correct customer name/surname, no update needed');
        }
      } else {
        // Booking doesn't exist yet - this is normal if this webhook (payment_intent.succeeded)
        // arrives before the Supabase webhook (checkout.session.completed) creates the booking
        // We'll create it as a fallback with correct customer name/surname
        console.log('[stripe-webhook-odoo] ℹ️ Booking not found yet (normal if webhook arrives early), creating as fallback:', paymentIntent.id);
        
        const insertData: any = {
          stripe_payment_intent_id: paymentIntent.id,
          product_type: bookingData.productType,
          product_name: bookingData.productName,
          provider_id: bookingData.providerId, // Required field - must be present
          number_of_adults: bookingData.guests,
          number_of_dogs: bookingData.dogs || 0,
          total_amount_paid: bookingData.total,
          currency: bookingData.currency || paymentIntent.currency,
          booking_date: bookingData.date ? bookingData.date.split(' ')[0] : null, // Extract date only
          customer_email: partnerData.email,
          customer_name: customerNameForSupabase, // Nome from custom field (CRITICAL)
          customer_surname: customerSurnameForSupabase, // Cognome from custom field (CRITICAL)
        };
        
        if (!bookingData.providerId) {
          console.error('[stripe-webhook-odoo] ⚠️⚠️⚠️ provider_id is missing! This will cause a NOT NULL constraint violation.');
        }
        
        const { error: insertError } = await supabase
          .from('booking')
          .insert(insertData);
        
        if (insertError) {
          console.error('[stripe-webhook-odoo] ❌❌❌ Supabase fallback insert failed', insertError);
        } else {
          console.log('[stripe-webhook-odoo] ✅✅✅ Supabase fallback insert successful');
        }
      }
    } catch (supabaseErr) {
      console.error('[stripe-webhook-odoo] Supabase update/insert failed', supabaseErr);
      // Continue: Odoo is source of truth
    }

    // Send confirmation email if booking exists and email not sent yet
    try {
      console.log('[stripe-webhook-odoo] Checking if confirmation email needs to be sent...');
      const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);
      
      // Get full booking data
      const { data: booking, error: bookingError } = await supabase
        .from('booking')
        .select('*')
        .eq('stripe_payment_intent_id', paymentIntent.id)
        .maybeSingle();
      
      if (bookingError) {
        console.error('[stripe-webhook-odoo] Error fetching booking for email:', bookingError);
      } else if (booking && !booking.confirmation_email_sent) {
        console.log('[stripe-webhook-odoo] Booking found, sending confirmation email...');
        
        // Get product data (no_adults flag and additional info for email)
        // CRITICAL: All product data must come from database, not from booking table
        let productName: string | undefined = undefined;
        let productDescription: string | undefined = undefined;
        let productNoAdults = false;
        let productIncludedItems: string[] | undefined = undefined;
        let productExcludedItems: string[] | undefined = undefined;
        let productMeetingInfo: { text: string; googleMapsLink: string } | undefined = undefined;
        let productShowMeetingInfo: boolean = false;
        let productCancellationPolicy: string | undefined = undefined;
        let productTime: string | undefined = undefined; // Time from product (full_day_start_time/end_time), not from booking slot
        let productProgram: {
          days: Array<{
            day_number: number;
            introduction?: string | null;
            items: Array<{
              activity_text: string;
              order_index: number;
            }>;
          }>;
        } | undefined = undefined;
        
        // Try to get product_id from booking, bookingData (metadata), or slot
        let productId = booking.product_id || bookingData.productInternalId;
        if (!productId && booking.availability_slot_id) {
          const { data: slot } = await supabase
            .from('availability_slot')
            .select('product_id')
            .eq('id', booking.availability_slot_id)
            .single();
          productId = slot?.product_id;
        }
        
        // Log per debugging
        console.log('[stripe-webhook-odoo] Product ID lookup:', {
          booking_product_id: booking.product_id,
          bookingData_productInternalId: bookingData.productInternalId,
          availability_slot_id: booking.availability_slot_id,
          final_productId: productId,
        });
        
        if (productId) {
          // Determine table name based on product type
          const tableName = booking.product_type === 'experience' ? 'experience' : 
                          booking.product_type === 'class' ? 'class' : 'trip';
          
          // Get product data with all fields needed for email
          // CRITICAL: Include name and description to ensure we use database values, not booking values
          // Also include full_day_start_time and full_day_end_time for product time display
          const { data: product } = await supabase
            .from(tableName)
            .select('name, description, no_adults, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy, full_day_start_time, full_day_end_time')
            .eq('id', productId)
            .single();
          
          if (product) {
            // CRITICAL: Use product data from database, not from booking table
            productName = (product as any).name;
            productDescription = (product as any).description || undefined;
            productNoAdults = (product as any).no_adults === true || (product as any).no_adults === 1;
            
            // Log dettagliato per included/excluded items
            console.log('[stripe-webhook-odoo] Product data retrieved:', {
              productId,
              productName: (product as any).name,
              included_items_raw: (product as any).included_items,
              included_items_type: typeof (product as any).included_items,
              is_included_array: Array.isArray((product as any).included_items),
              excluded_items_raw: (product as any).excluded_items,
              excluded_items_type: typeof (product as any).excluded_items,
              is_excluded_array: Array.isArray((product as any).excluded_items),
            });
            
            productIncludedItems = Array.isArray((product as any).included_items) 
              ? (product as any).included_items 
              : undefined;
            productExcludedItems = Array.isArray((product as any).excluded_items) 
              ? (product as any).excluded_items 
              : undefined;
            
            console.log('[stripe-webhook-odoo] Processed items:', {
              productIncludedItems,
              productIncludedItemsLength: productIncludedItems?.length || 0,
              productExcludedItems,
              productExcludedItemsLength: productExcludedItems?.length || 0,
            });
            
            // Parse meeting_info
            if ((product as any).meeting_info && typeof (product as any).meeting_info === 'object') {
              const meetingInfo = (product as any).meeting_info;
              productMeetingInfo = {
                text: meetingInfo.text || '',
                googleMapsLink: meetingInfo.google_maps_link || '',
              };
            }
            
            productShowMeetingInfo = (product as any).show_meeting_info === true || (product as any).show_meeting_info === 1;
            productCancellationPolicy = (product as any).cancellation_policy || undefined;
            
            // Get product time (full_day_start_time/end_time) - only show if present in product
            // Format time from product, not from booking slot
            const formatTimeForDisplay = (timeStr: string | null | undefined): string => {
              if (!timeStr) return '';
              const timeParts = timeStr.split(':');
              if (timeParts.length >= 2) {
                const hours = timeParts[0].padStart(2, '0');
                const minutes = timeParts[1].padStart(2, '0');
                return `${hours}:${minutes}`;
              }
              return timeStr;
            };
            
            const productStartTime = (product as any).full_day_start_time;
            const productEndTime = (product as any).full_day_end_time;
            
            if (productStartTime) {
              const formattedStartTime = formatTimeForDisplay(productStartTime);
              if (productEndTime) {
                const formattedEndTime = formatTimeForDisplay(productEndTime);
                productTime = `${formattedStartTime} - ${formattedEndTime}`;
              } else {
                productTime = formattedStartTime;
              }
            }
            
            // Log cancellation policy for debugging - ensure it matches product page
            console.log('[stripe-webhook-odoo] Product cancellation policy retrieved:', {
              productId,
              productName: (product as any).name,
              cancellationPolicy: productCancellationPolicy,
              cancellationPolicyLength: productCancellationPolicy?.length || 0,
              cancellationPolicyType: typeof productCancellationPolicy,
              rawValue: (product as any).cancellation_policy,
            });
            
            // Log product time for debugging
            console.log('[stripe-webhook-odoo] Product time retrieved:', {
              productId,
              productName: (product as any).name,
              full_day_start_time: productStartTime,
              full_day_end_time: productEndTime,
              formattedProductTime: productTime,
            });
          }
          
          // Load program if exists
          try {
            const { data: programDays, error: programError } = await supabase
              .from('trip_program_day')
              .select(`
                day_number,
                introduction,
                trip_program_item (
                  activity_text,
                  order_index
                )
              `)
              .eq('product_id', productId)
              .eq('product_type', booking.product_type)
              .order('day_number', { ascending: true });
            
            if (!programError && programDays && programDays.length > 0) {
              productProgram = {
                days: programDays.map((day: any) => ({
                  day_number: day.day_number,
                  introduction: day.introduction || null,
                  items: (day.trip_program_item || [])
                    .sort((a: any, b: any) => a.order_index - b.order_index)
                    .map((item: any) => ({
                      activity_text: item.activity_text,
                      order_index: item.order_index,
                    })),
                })),
              };
            }
          } catch (programErr) {
            console.log('[stripe-webhook-odoo] Error loading program (non-blocking):', programErr);
            // Non-blocking: continue without program
          }
        }
        
        // Format order number from checkout session ID or booking ID
        const formatOrderNumber = (sessionId: string | null): string => {
          if (!sessionId) return booking.order_number || booking.id.slice(-8).toUpperCase();
          return sessionId.slice(-8).toUpperCase();
        };
        
        const orderNumber = formatOrderNumber(checkoutSessionId || booking.stripe_checkout_session_id);
        
        // Prepare email payload
        // CRITICAL: Use product data from database, not from booking table
        // The booking table may have outdated product info if product was updated after booking
        const emailPayload = {
          type: 'order_confirmation',
          bookingId: booking.id,
          customerEmail: booking.customer_email,
          customerName: booking.customer_name,
          customerSurname: booking.customer_surname || undefined,
          customerPhone: booking.customer_phone || undefined,
          productName: productName || booking.product_name, // FROM DATABASE if available, fallback to booking
          productDescription: productDescription || booking.product_description || undefined, // FROM DATABASE if available
          productType: booking.product_type,
          bookingDate: booking.booking_date,
          bookingTime: productTime || undefined, // Only use product time (full_day_start_time/end_time), never booking slot time
          numberOfAdults: booking.number_of_adults,
          numberOfDogs: booking.number_of_dogs,
          totalAmount: booking.total_amount_paid,
          currency: booking.currency,
          orderNumber: orderNumber,
          noAdults: productNoAdults,
          // New fields for email content - ALL FROM DATABASE
          // CRITICAL: Always include all fields, even if undefined (convert to null for JSON serialization)
          includedItems: productIncludedItems ?? null,
          excludedItems: productExcludedItems ?? null,
          meetingInfo: productMeetingInfo ?? null,
          showMeetingInfo: productShowMeetingInfo ?? false,
          program: productProgram ?? null,
          cancellationPolicy: productCancellationPolicy ?? null, // Always include, even if undefined
        };
        
        // Log complete payload for verification - ensure all product data matches database
        console.log('[stripe-webhook-odoo] Sending confirmation email - VERIFY ALL DATA MATCHES PRODUCT DATABASE:', {
          productId: productId,
          productNameFromDB: productName,
          productNameInPayload: emailPayload.productName,
          productNameFromBooking: booking.product_name,
          productDescriptionFromDB: productDescription,
          productDescriptionInPayload: emailPayload.productDescription,
          cancellationPolicyFromDB: productCancellationPolicy,
          cancellationPolicyInPayload: emailPayload.cancellationPolicy,
          cancellationPolicyInPayloadType: typeof emailPayload.cancellationPolicy,
          cancellationPolicyInPayloadLength: emailPayload.cancellationPolicy?.length || 0,
          cancellationPolicyIsUndefined: emailPayload.cancellationPolicy === undefined,
          cancellationPolicyIsNull: emailPayload.cancellationPolicy === null,
          cancellationPolicyIsEmptyString: emailPayload.cancellationPolicy === '',
          includedItemsCount: productIncludedItems?.length || 0,
          excludedItemsCount: productExcludedItems?.length || 0,
          hasMeetingInfo: !!productMeetingInfo,
          hasProgram: !!productProgram,
          // Verify critical fields
          productNameMatches: productName === emailPayload.productName,
          cancellationPolicyMatches: productCancellationPolicy === emailPayload.cancellationPolicy,
          // Verify all product data fields are present in payload (same check for all)
          allFieldsPresent: {
            includedItems: 'includedItems' in emailPayload,
            excludedItems: 'excludedItems' in emailPayload,
            meetingInfo: 'meetingInfo' in emailPayload,
            program: 'program' in emailPayload,
            cancellationPolicy: 'cancellationPolicy' in emailPayload, // CRITICAL: Must be present
          },
        });
        
        console.log('[stripe-webhook-odoo] Full email payload:', {
          bookingId: emailPayload.bookingId,
          customerEmail: emailPayload.customerEmail,
          productName: emailPayload.productName,
          orderNumber: emailPayload.orderNumber,
          includedItems: emailPayload.includedItems,
          includedItemsLength: emailPayload.includedItems?.length || 0,
          excludedItems: emailPayload.excludedItems,
          excludedItemsLength: emailPayload.excludedItems?.length || 0,
          hasMeetingInfo: !!emailPayload.meetingInfo,
          showMeetingInfo: emailPayload.showMeetingInfo,
          hasProgram: !!emailPayload.program,
          hasCancellationPolicy: !!emailPayload.cancellationPolicy,
        });
        
        // Call send-transactional-email function
        const emailFunctionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/send-transactional-email`;
        const emailResponse = await fetch(emailFunctionsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify(emailPayload),
        });
        
        if (emailResponse.ok) {
          // Mark as sent
          await supabase
            .from('booking')
            .update({ confirmation_email_sent: true })
            .eq('id', booking.id);
          console.log('[stripe-webhook-odoo] ✅ Confirmation email sent successfully');
        } else {
          const errorData = await emailResponse.json().catch(() => ({}));
          console.error('[stripe-webhook-odoo] ❌ Email sending failed:', errorData);
          // Mark as not sent so fallback functions can retry
          await supabase
            .from('booking')
            .update({ confirmation_email_sent: false })
            .eq('id', booking.id);
        }
      } else if (booking && booking.confirmation_email_sent) {
        console.log('[stripe-webhook-odoo] Email already sent, skipping');
      } else {
        console.log('[stripe-webhook-odoo] Booking not found yet, email will be sent by create-booking function');
      }
    } catch (emailErr) {
      console.error('[stripe-webhook-odoo] Error sending confirmation email (non-blocking):', emailErr);
      // Don't fail the webhook if email fails
    }

    return NextResponse.json({ success: true, orderId, paymentIntentId: paymentIntent.id });
  } catch (err: any) {
    const safeErr = err instanceof Error ? { message: err.message, stack: err.stack } : { error: String(err) };
    console.error('[stripe-webhook-odoo] ========================================');
    console.error('[stripe-webhook-odoo] ❌❌❌ HANDLER ERROR ❌❌❌');
    console.error('[stripe-webhook-odoo] Error details:', safeErr);
    console.error('[stripe-webhook-odoo] Payment Intent ID:', paymentIntent?.id || 'unknown');
    console.error('[stripe-webhook-odoo] Order Number:', metadata?.order_number || 'unknown');
    console.error('[stripe-webhook-odoo] Error type:', err?.constructor?.name || typeof err);
    console.error('[stripe-webhook-odoo] Error message:', err?.message || String(err));
    if (err?.stack) {
      console.error('[stripe-webhook-odoo] Stack trace:', err.stack);
    }
    console.error('[stripe-webhook-odoo] ========================================');
    
    // Return detailed error in development, generic in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json({ 
      error: isDevelopment ? (err?.message || 'Internal error') : 'Internal error',
      paymentIntentId: paymentIntent?.id || null,
      orderNumber: metadata?.order_number || null,
    }, { status: 500 });
  }
}


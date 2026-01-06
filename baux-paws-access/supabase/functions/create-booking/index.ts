/**
 * Supabase Edge Function: Create Booking (Refactored)
 * 
 * This function provides a resilient, transactional booking creation system with:
 * - Idempotency via UUID keys for Stripe operations
 * - Atomic availability decrement and booking creation
 * - Event emission for external system integration (Odoo)
 * - Comprehensive logging at every critical phase
 * - Race condition prevention via database transactions
 * 
 * This function can be called from:
 * - Stripe webhook (checkout.session.completed)
 * - Frontend fallback (ensure-booking scenario)
 * - Direct API calls
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPaymentProvider } from '../_shared/payment/providerFactory.ts';
import type { NormalizedCheckoutSession } from '../_shared/payment/types.ts';
import {
  getActiveOdooConfig,
  validateOdooConfig,
  createOdooPurchaseOrder,
} from '../_shared/odoo/index.ts';
import { mapBookingToOdoo, validateBookingDataForOdoo } from '../_shared/odoo/bookingMapper.ts';
import { rateLimiters } from '../_shared/rateLimiter.ts';

// ============================================
// Types and Interfaces
// ============================================

interface BookingRequest {
  // Backward compatible: older callers send stripeCheckoutSessionId.
  // New callers should use checkoutSessionId (+ optional paymentGateway).
  stripeCheckoutSessionId?: string;
  checkoutSessionId?: string;
  paymentGateway?: 'stripe';
  idempotencyKey?: string; // Optional - will be generated if not provided
}

interface StripeSession {
  id: string;
  payment_status: string;
  payment_intent?: string;
  customer_email?: string;
  customer_details?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  currency?: string;
  metadata?: Record<string, string>;
}

interface BookingMetadata {
  product_id: string;
  product_type: 'experience' | 'class' | 'trip';
  availability_slot_id?: string;
  booking_date: string;
  booking_time?: string;
  number_of_adults: string;
  number_of_dogs: string;
  product_name: string;
  total_amount: string;
}

// ============================================
// Logging Utilities
// ============================================

interface LogContext {
  requestId: string;
  phase: string;
  [key: string]: any;
}

function logInfo(context: LogContext, message: string, data?: Record<string, any>) {
  console.log(JSON.stringify({
    level: 'INFO',
    timestamp: new Date().toISOString(),
    ...context,
    message,
    ...data,
  }));
}

function logError(context: LogContext, message: string, error: any, data?: Record<string, any>) {
  console.error(JSON.stringify({
    level: 'ERROR',
    timestamp: new Date().toISOString(),
    ...context,
    message,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : String(error),
    ...data,
  }));
}

function logWarn(context: LogContext, message: string, data?: Record<string, any>) {
  console.warn(JSON.stringify({
    level: 'WARN',
    timestamp: new Date().toISOString(),
    ...context,
    message,
    ...data,
  }));
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get current time in CET (Central European Time)
 */
function getCurrentTimeInCET(): string {
  const now = new Date();
  const cetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const cetStr = cetFormatter.format(now);
  const utcStr = utcFormatter.format(now);
  
  const parseTime = (str: string) => {
    const [datePart, timePart] = str.split(', ');
    const [month, day, year] = datePart.split('/');
    const [hour, minute, second] = timePart.split(':');
    return { year, month, day, hour, minute, second };
  };
  
  const cet = parseTime(cetStr);
  const utc = parseTime(utcStr);
  
  const cetHours = parseInt(cet.hour);
  const utcHours = parseInt(utc.hour);
  let offsetHours = cetHours - utcHours;
  
  if (parseInt(cet.day) !== parseInt(utc.day)) {
    offsetHours += 24;
  }
  
  const cetAsDate = new Date(`${cet.year}-${cet.month.padStart(2, '0')}-${cet.day.padStart(2, '0')}T${cet.hour.padStart(2, '0')}:${cet.minute.padStart(2, '0')}:${cet.second.padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`);
  const cetTimestamp = cetAsDate.getTime();
  const offsetMs = offsetHours * 60 * 60 * 1000;
  const utcEquivalent = new Date(cetTimestamp - offsetMs);
  
  return utcEquivalent.toISOString();
}

/**
 * Format order number from session ID
 */
function formatOrderNumber(sessionId: string): string {
  return sessionId.slice(-8).toUpperCase();
}

/**
 * Extract customer fiscal code from metadata (no custom fields needed)
 */
function extractCustomerFiscalCode(metadata: Record<string, string>): string | null {
  return metadata.customer_fiscal_code || null;
}

/**
 * Extract customer address from metadata (no custom fields needed)
 */
function extractCustomerAddress(metadata: Record<string, string>): string | null {
  const addressParts = [
    metadata.customer_address_line1,
    metadata.customer_address_city,
    metadata.customer_address_postal_code,
    metadata.customer_address_country || 'IT'
  ].filter(Boolean);
  
  return addressParts.length > 0 ? addressParts.join(', ') : null;
}

/**
 * Extract customer name from metadata (no custom fields needed)
 */
function extractCustomerName(metadata: Record<string, string>): { firstName: string; lastName: string; fullName: string } {
  const firstName = metadata.customer_name || '';
  const lastName = metadata.customer_surname || '';
  const fullName = `${firstName}${lastName ? ' ' + lastName : ''}`.trim() || 'Cliente';
  
  return { 
    firstName: firstName || 'Cliente', 
    lastName: lastName || '', 
    fullName 
  };
}

// ============================================
// Main Handler
// ============================================

// Get allowed origins from environment or use default
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }
  // Default allowed origins for production
  return [
    'https://flixdog.com',
    'https://www.flixdog.com',
    'https://flixdog.vercel.app',
  ];
};

// CORS headers with origin validation
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development';
  
  // In development, allow localhost
  const allowedOrigin = isDevelopment && origin?.startsWith('http://localhost')
    ? origin
    : (origin && allowedOrigins.includes(origin))
    ? origin
    : allowedOrigins[0]; // Default to first allowed origin
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const context: LogContext = { requestId, phase: 'initialization' };
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    logError(context, 'Method not allowed', new Error(`Method ${req.method} not allowed`));
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Only POST is supported.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Rate limiting
  try {
    const rateLimitResult = rateLimiters.booking(req);
    if (!rateLimitResult.allowed) {
      logError(context, 'Rate limit exceeded', new Error('Rate limit exceeded'), { remaining: rateLimitResult.remaining });
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        }),
        { 
          status: 429,
          headers: { 
            ...corsHeaders, 
            ...rateLimitResult.headers,
            'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
  } catch (rateLimitError) {
    // If rate limiter fails, log but don't block request (fail open)
    logWarn(context, 'Rate limiter error', { error: rateLimitError });
  }

  try {
    logInfo(context, 'Booking creation request received', { method: req.method });

    // ============================================
    // Phase 1: Environment Setup
    // ============================================
    context.phase = 'environment_setup';
    logInfo(context, 'Setting up environment variables');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not set');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logInfo(context, 'Environment setup complete');

    // ============================================
    // Phase 2: Parse and Validate Request
    // ============================================
    context.phase = 'request_validation';
    logInfo(context, 'Parsing request body');

    let requestBody: BookingRequest;
    try {
      requestBody = await req.json();
    } catch (error) {
      logError(context, 'Failed to parse request body', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const checkoutSessionId =
      requestBody.checkoutSessionId || requestBody.stripeCheckoutSessionId || '';

    if (!checkoutSessionId) {
      logError(context, 'Missing required field', new Error('checkoutSessionId is required'));
      return new Response(
        JSON.stringify({ error: 'checkoutSessionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate idempotency key if not provided
    const idempotencyKey = requestBody.idempotencyKey || crypto.randomUUID();
    
    // CRITICAL: Ensure idempotency key is never null or undefined
    if (!idempotencyKey || idempotencyKey === 'null' || idempotencyKey === 'undefined') {
      logError(context, 'Invalid idempotency key generated', new Error('Idempotency key is null or undefined'), {
        providedKey: requestBody.idempotencyKey,
        generatedKey: idempotencyKey,
      });
      throw new Error('Failed to generate idempotency key');
    }
    
    logInfo(context, 'Request validated', { 
      checkoutSessionId,
      paymentGateway: requestBody.paymentGateway,
      idempotencyKey,
      providedIdempotencyKey: !!requestBody.idempotencyKey,
      idempotencyKeyLength: idempotencyKey.length,
    });

    // ============================================
    // Phase 3: Check Existing Booking (Idempotency)
    // ============================================
    context.phase = 'idempotency_check';
    logInfo(context, 'Checking for existing booking');

    const { data: existingBooking, error: checkError } = await supabase
      .from('booking')
      .select('id, customer_email, created_at, idempotency_key')
      .or(`idempotency_key.eq.${idempotencyKey},stripe_checkout_session_id.eq.${checkoutSessionId}`)
      .maybeSingle();

    if (checkError) {
      logError(context, 'Error checking existing booking', checkError);
      throw new Error(`Failed to check existing booking: ${checkError.message}`);
    }

    if (existingBooking) {
      logInfo(context, 'Booking already exists (idempotency)', { 
        bookingId: existingBooking.id,
        idempotencyKey: existingBooking.idempotency_key,
      });
      return new Response(
        JSON.stringify({
          success: true,
          bookingId: existingBooking.id,
          alreadyExisted: true,
          message: 'Booking already exists',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ============================================
    // Phase 4: Fetch Checkout Session (gateway-agnostic)
    // ============================================
    context.phase = 'payment_fetch';
    logInfo(context, 'Fetching checkout session', {
      checkoutSessionId,
      paymentGateway: requestBody.paymentGateway,
    });

    const provider = getPaymentProvider({
      gateway: requestBody.paymentGateway ?? null,
      checkoutSessionId,
    });

    const rawSession = await provider.getCheckoutSession({ checkoutSessionId });
    const session: NormalizedCheckoutSession = provider.normalizeCheckoutSession(rawSession);

    logInfo(context, 'Checkout session fetched', {
      gateway: session.gateway,
      paymentStatus: session.paymentStatus,
      hasPaymentIntent: !!session.paymentIntentId,
    });

    // Verify payment is completed
    if (session.paymentStatus !== 'paid') {
      logWarn(context, 'Payment not completed', {
        paymentStatus: session.paymentStatus,
      });
      return new Response(
        JSON.stringify({ error: `Payment not completed. Status: ${session.paymentStatus}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // Phase 5: Extract Booking Data
    // ============================================
    context.phase = 'data_extraction';
    logInfo(context, 'Extracting booking data from session');

    const metadata = session.metadata || {};
    const bookingMetadata: BookingMetadata = {
      product_id: metadata.product_id || '',
      product_type: (metadata.product_type as 'experience' | 'class' | 'trip') || 'experience',
      availability_slot_id: metadata.availability_slot_id,
      booking_date: metadata.booking_date || '',
      booking_time: metadata.booking_time || undefined,
      number_of_adults: metadata.number_of_adults || '1',
      number_of_dogs: metadata.number_of_dogs || '0',
      product_name: metadata.product_name || 'Prodotto',
      total_amount: metadata.total_amount || '0',
    };

    if (!bookingMetadata.product_id || !bookingMetadata.booking_date) {
      logError(context, 'Missing required metadata', new Error('Missing product_id or booking_date'));
      throw new Error('Missing required metadata in Stripe session');
    }

    // Extract customer information
    const customerEmail = session.customer.email || '';
    if (!customerEmail) {
      logError(context, 'Customer email not found', new Error('Customer email is required'));
      throw new Error('Customer email not found in Stripe session');
    }

    const firstName = session.customer.firstName || '';
    const lastName = session.customer.lastName || '';
    const fullName =
      `${firstName}${lastName ? ' ' + lastName : ''}`.trim() ||
      session.customer.name ||
      'Cliente';
    
    // CRITICAL: Ensure firstName is never empty to avoid NOT NULL constraint violation
    // Use first part of fullName if firstName is empty, or fallback to 'Cliente'
    const safeFirstName = firstName.trim() || fullName.split(' ')[0] || 'Cliente';
    
    const customerFiscalCode = session.customer.fiscalCode || null;
    const customerAddress = session.customer.address || null;
    
    // Log extracted names for debugging
    logInfo(context, 'Customer name extracted from custom fields', {
      firstName,
      lastName,
      fullName,
      safeFirstName,
      hasFirstName: !!firstName,
      hasLastName: !!lastName,
      hasFiscalCode: !!customerFiscalCode,
      hasAddress: !!customerAddress,
    });
    
    // CRITICAL: Phone is in metadata (from internal checkout), not in session.customer
    // session.customer.phone is the Stripe customer object phone (which we also set)
    // But metadata.customer_phone is the authoritative source from the checkout form
    const customerPhone = session.metadata.customer_phone || session.customer.phone || null;

    logInfo(context, 'Booking data extracted', {
      productId: bookingMetadata.product_id,
      productType: bookingMetadata.product_type,
      customerEmail,
      customerName: fullName,
      customerFirstName: safeFirstName,
    });

    // ============================================
    // Phase 6: Fetch Product Details
    // ============================================
    context.phase = 'product_fetch';
    logInfo(context, 'Fetching product details', { 
      productId: bookingMetadata.product_id,
      productType: bookingMetadata.product_type,
    });

    const tableName = bookingMetadata.product_type === 'class' 
      ? 'class' 
      : bookingMetadata.product_type === 'experience' 
        ? 'experience' 
        : 'trip';

    const selectFields = bookingMetadata.product_type === 'trip'
      ? 'provider_id, name, description, start_date, end_date, provider_cost_adult_base, provider_cost_dog_base, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy'
      : 'provider_id, name, description, no_adults, provider_cost_adult_base, provider_cost_dog_base, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy, full_day_start_time, full_day_end_time';

    const { data: product, error: productError } = await supabase
      .from(tableName)
      .select(selectFields)
      .eq('id', bookingMetadata.product_id)
      .single();

    if (productError || !product) {
      logError(context, 'Product not found', productError, { productId: bookingMetadata.product_id });
      throw new Error(`Product not found: ${productError?.message || 'Unknown error'}`);
    }

    // Get provider_id with fallbacks
    let providerId = product.provider_id;
    if (!providerId && bookingMetadata.availability_slot_id) {
      logInfo(context, 'Provider ID not found, trying availability slot');
      const { data: slot } = await supabase
        .from('availability_slot')
        .select('product_id, product_type')
        .eq('id', bookingMetadata.availability_slot_id)
        .single();

      if (slot?.product_id) {
        const { data: productFromSlot } = await supabase
          .from(tableName)
          .select('provider_id')
          .eq('id', slot.product_id)
          .single();
        if (productFromSlot?.provider_id) {
          providerId = productFromSlot.provider_id;
        }
      }
    }

    // Final fallback: default provider
    if (!providerId) {
      logInfo(context, 'Provider ID still null, trying default provider');
      const { data: defaultProvider } = await supabase
        .from('profile')
        .select('id')
        .or('company_name.ilike.%lastminute%,company_name.ilike.%last minute%')
        .limit(1)
        .maybeSingle();

      if (defaultProvider?.id) {
        providerId = defaultProvider.id;
      } else {
        const { data: anyProvider } = await supabase
          .from('profile')
          .select('id')
          .eq('active', true)
          .limit(1)
          .maybeSingle();
        if (anyProvider?.id) {
          providerId = anyProvider.id;
        }
      }
    }

    if (!providerId) {
      logError(context, 'No provider found', new Error('Provider ID is required'));
      throw new Error('Provider ID is required but not found');
    }

    logInfo(context, 'Product details fetched', { 
      productName: product.name,
      providerId,
    });

    // ============================================
    // Phase 7: Prepare Booking Data
    // ============================================
    context.phase = 'booking_preparation';
    logInfo(context, 'Preparing booking data');

    const bookingTimeNow = getCurrentTimeInCET();
    const orderNumber = formatOrderNumber(session.checkoutSessionId);
    
    let tripStartDate: string | null = null;
    let tripEndDate: string | null = null;
    if (bookingMetadata.product_type === 'trip' && product) {
      tripStartDate = (product as any).start_date || null;
      tripEndDate = (product as any).end_date || null;
    }

    const numberOfAdults = parseInt(bookingMetadata.number_of_adults || '1');
    const numberOfDogs = parseInt(bookingMetadata.number_of_dogs || '0');
    
    // CRITICAL: Use exact amount from Stripe PaymentIntent instead of calculated value
    // This ensures precision to the cent and matches what customer actually paid
    let totalAmount = parseFloat(bookingMetadata.total_amount || '0');
    
    // Retrieve exact amount from Stripe PaymentIntent if available
    if (session.paymentIntentId) {
      try {
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (stripeSecretKey) {
          const paymentIntentResponse = await fetch(
            `https://api.stripe.com/v1/payment_intents/${session.paymentIntentId}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${stripeSecretKey}`,
              },
            }
          );

          if (paymentIntentResponse.ok) {
            const paymentIntent = await paymentIntentResponse.json();
            // Stripe amount is in cents, convert to euros with precise rounding
            const stripeAmountCents = paymentIntent.amount || 0;
            const stripeAmountEuros = Math.round(stripeAmountCents) / 100;
            
            // Use Stripe amount if available (this is the exact amount customer paid)
            if (stripeAmountEuros > 0) {
              totalAmount = stripeAmountEuros;
              logInfo(context, 'Using exact Stripe amount', {
                paymentIntentId: session.paymentIntentId,
                stripeAmountCents,
                stripeAmountEuros,
                metadataAmount: parseFloat(bookingMetadata.total_amount || '0'),
              });
            }
          }
        }
      } catch (error) {
        logWarn(context, 'Failed to retrieve exact Stripe amount, using metadata value', {
          error: error instanceof Error ? error.message : String(error),
          paymentIntentId: session.paymentIntentId,
        });
        // Continue with metadata value if Stripe retrieval fails
      }
    }
    
    // Round to 2 decimal places to ensure precision
    totalAmount = Math.round(totalAmount * 100) / 100;

    logInfo(context, 'Booking data prepared', {
      orderNumber,
      numberOfAdults,
      numberOfDogs,
      totalAmount,
    });

    // ============================================
    // Phase 7.5: Calculate Financial Values
    // ============================================
    context.phase = 'financial_calculation';
    logInfo(context, 'Calculating financial values');

    // Calculate provider cost total
    const providerCostAdultBase = Number(product.provider_cost_adult_base) || 0;
    const providerCostDogBase = Number(product.provider_cost_dog_base) || 0;
    const providerCostTotal = (providerCostAdultBase * numberOfAdults) + (providerCostDogBase * numberOfDogs);

    // Retrieve Stripe fee from PaymentIntent
    let stripeFee = 0;
    if (session.paymentIntentId) {
      try {
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (stripeSecretKey) {
          // Retrieve PaymentIntent to get charge details
          const paymentIntentResponse = await fetch(
            `https://api.stripe.com/v1/payment_intents/${session.paymentIntentId}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${stripeSecretKey}`,
              },
            }
          );

          if (paymentIntentResponse.ok) {
            const paymentIntent = await paymentIntentResponse.json();
            
            // Get the charge ID from the payment intent
            if (paymentIntent.charges && paymentIntent.charges.data && paymentIntent.charges.data.length > 0) {
              const chargeId = paymentIntent.charges.data[0].id;
              
              // Retrieve the charge to get balance transaction
              const chargeResponse = await fetch(
                `https://api.stripe.com/v1/charges/${chargeId}`,
                {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${stripeSecretKey}`,
                  },
                }
              );

              if (chargeResponse.ok) {
                const charge = await chargeResponse.json();
                const balanceTransactionId = charge.balance_transaction;
                
                // Retrieve balance transaction to get fees
                const balanceTransactionResponse = await fetch(
                  `https://api.stripe.com/v1/balance_transactions/${balanceTransactionId}`,
                  {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${stripeSecretKey}`,
                    },
                  }
                );

                if (balanceTransactionResponse.ok) {
                  const balanceTransaction = await balanceTransactionResponse.json();
                  // Fee is in cents, convert to euros with precise rounding
                  const feeCents = balanceTransaction.fee || 0;
                  stripeFee = Math.round(feeCents) / 100;
                  
                  logInfo(context, 'Stripe fee retrieved', {
                    paymentIntentId: session.paymentIntentId,
                    chargeId,
                    balanceTransactionId,
                    stripeFee,
                  });
                } else {
                  logWarn(context, 'Failed to retrieve balance transaction', {
                    status: balanceTransactionResponse.status,
                    paymentIntentId: session.paymentIntentId,
                  });
                }
              } else {
                logWarn(context, 'Failed to retrieve charge', {
                  status: chargeResponse.status,
                  paymentIntentId: session.paymentIntentId,
                });
              }
            } else {
              logWarn(context, 'No charges found in payment intent', {
                paymentIntentId: session.paymentIntentId,
              });
            }
          } else {
            logWarn(context, 'Failed to retrieve payment intent', {
              status: paymentIntentResponse.status,
              paymentIntentId: session.paymentIntentId,
            });
          }
        } else {
          logWarn(context, 'STRIPE_SECRET_KEY not set, cannot retrieve fee');
        }
      } catch (error) {
        logError(context, 'Error retrieving Stripe fee', error, {
          paymentIntentId: session.paymentIntentId,
        });
        // Continue with stripeFee = 0 if we can't retrieve it
      }
    }

    // Calculate internal margin and net revenue with precise rounding
    // internal_margin = total_amount_paid - provider_cost_total - stripe_fee
    // Round each step to ensure precision to the cent
    const internalMargin = Math.round((totalAmount - providerCostTotal - stripeFee) * 100) / 100;
    const netRevenue = internalMargin; // Same as internal margin for clarity
    
    // CRITICAL VALIDATION: Verify calculation is correct to the cent
    const calculatedTotal = Math.round((providerCostTotal + stripeFee + internalMargin) * 100) / 100;
    const totalDifference = Math.abs(totalAmount - calculatedTotal);
    
    if (totalDifference > 0.01) {
      logError(context, 'Financial calculation mismatch detected', new Error('Total amount does not match sum of components'), {
        totalAmount,
        providerCostTotal,
        stripeFee,
        internalMargin,
        calculatedTotal,
        difference: totalDifference,
      });
      // Still proceed but log the error for investigation
    } else {
      logInfo(context, 'Financial calculation verified', {
        totalAmount,
        providerCostTotal,
        stripeFee,
        internalMargin,
        calculatedTotal,
        difference: totalDifference,
      });
    }

    logInfo(context, 'Financial values calculated', {
      providerCostTotal,
      stripeFee,
      internalMargin,
      netRevenue,
      totalAmount,
    });

    // ============================================
    // Phase 8: Create Booking Transactionally
    // ============================================
    context.phase = 'transactional_booking';
    logInfo(context, 'Creating booking transactionally', { idempotencyKey });

    // CRITICAL: Verify idempotency key before RPC call
    if (!idempotencyKey) {
      logError(context, 'Idempotency key is missing before RPC call', new Error('Idempotency key is null'), {
        idempotencyKey,
      });
      throw new Error('Idempotency key is required');
    }
    
    logInfo(context, 'Calling RPC function', {
      idempotencyKey,
      idempotencyKeyType: typeof idempotencyKey,
      idempotencyKeyLength: idempotencyKey.length,
    });

    const { data: bookingResult, error: bookingError } = await supabase.rpc(
      'create_booking_transactional',
      {
        // Required parameters
        p_idempotency_key: idempotencyKey,
        p_product_type: bookingMetadata.product_type,
        p_product_id: bookingMetadata.product_id,
        p_provider_id: providerId,
        p_booking_date: bookingMetadata.booking_date,
        p_number_of_adults: numberOfAdults,
        p_number_of_dogs: numberOfDogs,
        p_total_amount_paid: totalAmount,
        p_customer_email: customerEmail,
        p_customer_name: safeFirstName, // IMPORTANT: Only first name, not full name. Always has fallback value.
        // Optional parameters
        p_availability_slot_id: bookingMetadata.availability_slot_id || null,
        p_stripe_checkout_session_id: session.checkoutSessionId,
        p_stripe_payment_intent_id: session.paymentIntentId || null,
        p_order_number: orderNumber,
        p_booking_time: bookingTimeNow,
        p_trip_start_date: tripStartDate,
        p_trip_end_date: tripEndDate,
        p_currency: session.currency || 'EUR',
        p_customer_surname: lastName || null, // IMPORTANT: Only last name
        p_customer_phone: customerPhone,
        p_customer_fiscal_code: customerFiscalCode || null,
        p_customer_address: customerAddress || null,
        p_product_name: bookingMetadata.product_name,
        p_product_description: product.description || null,
        p_provider_cost_total: providerCostTotal,
        p_stripe_fee: stripeFee,
        p_internal_margin: internalMargin,
        p_net_revenue: netRevenue,
      }
    );

    if (bookingError) {
      logError(context, 'Booking creation failed', bookingError, {
        idempotencyKey,
        errorCode: bookingError.code,
      });
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    if (!bookingResult || bookingResult.length === 0) {
      logError(context, 'Booking creation returned no result', new Error('No result from transactional function'));
      throw new Error('Booking creation failed: No result returned');
    }

    const result = bookingResult[0];
    if (!result.success) {
      logError(context, 'Booking creation failed', new Error(result.error_message || 'Unknown error'), {
        errorMessage: result.error_message,
      });
      return new Response(
        JSON.stringify({ 
          error: result.error_message || 'Failed to create booking',
          idempotencyKey,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bookingId = result.booking_id;
    logInfo(context, 'Booking created successfully', { bookingId, idempotencyKey });

    // ============================================
    // Phase 8.5: Verify Idempotency Key was saved
    // ============================================
    context.phase = 'verify_idempotency';
    logInfo(context, 'Verifying idempotency key was saved', { bookingId, idempotencyKey });
    
    const { data: verifyBooking, error: verifyError } = await supabase
      .from('booking')
      .select('id, idempotency_key')
      .eq('id', bookingId)
      .single();

    if (verifyError) {
      logError(context, 'Failed to verify booking', verifyError, { bookingId });
    } else if (!verifyBooking?.idempotency_key) {
      logError(context, 'CRITICAL: Idempotency key is NULL after creation!', new Error('Idempotency key not saved'), {
        bookingId,
        expectedIdempotencyKey: idempotencyKey,
        actualIdempotencyKey: verifyBooking?.idempotency_key,
      });
      // Non fallire la richiesta, ma loggare l'errore critico
    } else if (verifyBooking.idempotency_key !== idempotencyKey) {
      logError(context, 'CRITICAL: Idempotency key mismatch!', new Error('Idempotency key does not match'), {
        bookingId,
        expectedIdempotencyKey: idempotencyKey,
        actualIdempotencyKey: verifyBooking.idempotency_key,
      });
    } else {
      logInfo(context, 'Idempotency key verified successfully', {
        bookingId,
        idempotencyKey: verifyBooking.idempotency_key,
      });
    }

    // ============================================
    // Phase 8.6: Create Odoo Purchase Order (Non-blocking)
    // ============================================
    context.phase = 'odoo_po_creation';
    logInfo(context, 'Creating Odoo Purchase Order (non-blocking)', { bookingId });

    try {
      // Get Odoo configuration
      const odooConfig = getActiveOdooConfig();
      
      if (odooConfig && validateOdooConfig(odooConfig)) {
        // Fetch full booking data with provider and product
        const { data: fullBooking, error: fullBookingError } = await supabase
          .from('booking')
          .select(`
            id,
            order_number,
            stripe_checkout_session_id,
            stripe_payment_intent_id,
            customer_email,
            customer_name,
            customer_surname,
            customer_phone,
            customer_fiscal_code,
            customer_address,
            product_type,
            availability_slot_id,
            product_name,
            product_description,
            provider_id,
            booking_date,
            booking_time,
            number_of_adults,
            number_of_dogs,
            total_amount_paid,
            currency,
            provider_cost_total,
            stripe_fee,
            internal_margin,
            net_revenue,
            trip_start_date,
            trip_end_date
          `)
          .eq('id', bookingId)
          .single();

        if (!fullBookingError && fullBooking) {
          // Check if provider_cost_total is available and > 0
          if (fullBooking.provider_cost_total && fullBooking.provider_cost_total > 0) {
            // Get product_id from availability_slot
            let productId: string | null = null;
            if (fullBooking.availability_slot_id) {
              const { data: slot } = await supabase
                .from('availability_slot')
                .select('product_id, product_type')
                .eq('id', fullBooking.availability_slot_id)
                .single();

              if (slot) {
                productId = slot.product_id;
              }
            }

            if (productId) {
              // Fetch provider
              const { data: provider } = await supabase
                .from('profile')
                .select('id, company_name, contact_name, email, phone')
                .eq('id', fullBooking.provider_id)
                .single();

              // Fetch product
              const tableName = fullBooking.product_type === 'experience' ? 'experience' :
                               fullBooking.product_type === 'class' ? 'class' : 'trip';

              const { data: product } = await supabase
                .from(tableName)
                .select('id, name, description')
                .eq('id', productId)
                .single();

              if (provider && product) {
                // Map booking data for Odoo
                const bookingWithProductId = {
                  ...fullBooking,
                  product_id: productId,
                };

                const bookingData = mapBookingToOdoo(bookingWithProductId, provider, product);

                // Validate
                const validationErrors = validateBookingDataForOdoo(bookingData);
                if (validationErrors.length === 0) {
                  // Create PO
                  const poResult = await createOdooPurchaseOrder(odooConfig, bookingData);
                  
                  if (poResult.success) {
                    logInfo(context, 'Odoo Purchase Order created/updated successfully', {
                      bookingId,
                      poId: poResult.purchaseOrderId,
                      skipped: poResult.skipped,
                      reason: poResult.reason,
                    });
                  } else {
                    logWarn(context, 'Odoo Purchase Order creation failed (non-blocking)', {
                      bookingId,
                      error: poResult.error,
                      errorDetails: poResult.errorDetails,
                    });
                  }
                } else {
                  logWarn(context, 'Booking data validation failed for Odoo PO (non-blocking)', {
                    bookingId,
                    validationErrors,
                  });
                }
              } else {
                logWarn(context, 'Provider or product not found for Odoo PO (non-blocking)', {
                  bookingId,
                  providerFound: !!provider,
                  productFound: !!product,
                });
              }
            } else {
              logWarn(context, 'Product ID not found for Odoo PO (non-blocking)', {
                bookingId,
                availabilitySlotId: fullBooking.availability_slot_id,
              });
            }
          } else {
            logInfo(context, 'Skipping Odoo PO creation (provider_cost_total is null or 0)', {
              bookingId,
              providerCostTotal: fullBooking.provider_cost_total,
            });
          }
        } else {
          logWarn(context, 'Failed to fetch full booking data for Odoo PO (non-blocking)', {
            bookingId,
            error: fullBookingError,
          });
        }
      } else {
        logWarn(context, 'Odoo configuration not available (non-blocking)', {
          bookingId,
          configAvailable: !!odooConfig,
          hasUrl: !!Deno.env.get('OD_URL'),
          hasDbName: !!Deno.env.get('OD_DB_NAME'),
          hasLogin: !!Deno.env.get('OD_LOGIN'),
          hasApiKey: !!Deno.env.get('OD_API_KEY'),
        });
      }
    } catch (odooError) {
      // Non-blocking: log error but don't fail the booking creation
      logWarn(context, 'Odoo PO creation error (non-blocking)', {
        bookingId,
        error: odooError instanceof Error ? {
          name: odooError.name,
          message: odooError.message,
          stack: odooError.stack,
        } : String(odooError),
      });
    }

    // ============================================
    // Phase 9: Event Emission (Automatic via Trigger)
    // ============================================
    context.phase = 'event_emission';
    logInfo(context, 'Event emission triggered automatically via database trigger', { bookingId });

    // The event is automatically emitted by the database trigger
    // We can verify it was created
    const { data: event } = await supabase
      .from('booking_events')
      .select('id, status')
      .eq('booking_id', bookingId)
      .eq('event_type', 'created')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (event) {
      logInfo(context, 'Booking event created', { eventId: event.id, eventStatus: event.status });
    } else {
      logWarn(context, 'Booking event not found (may be delayed)', { bookingId });
    }

    // ============================================
    // Phase 10: Send Confirmation Email
    // ============================================
    context.phase = 'email_confirmation';
    logInfo(context, 'Sending confirmation email');

    try {
      // Get product time (full_day_start_time/end_time) - only show if present in product
      // Format time from product, not from booking slot
      let productTime: string | undefined = undefined;
      
      const formatTimeForDisplay = (timeStr: string | null | undefined): string => {
        if (!timeStr) return '';
        // Handle PostgreSQL TIME format (HH:MM:SS) or HH:MM format
        const timeParts = timeStr.split(':');
        if (timeParts.length >= 2) {
          const hours = timeParts[0].padStart(2, '0');
          const minutes = timeParts[1].padStart(2, '0');
          return `${hours}:${minutes}`;
        }
        return timeStr;
      };
      
      if (product && (product as any).full_day_start_time) {
        const productStartTime = (product as any).full_day_start_time;
        const productEndTime = (product as any).full_day_end_time;
        
        const formattedStartTime = formatTimeForDisplay(productStartTime);
        if (productEndTime) {
          const formattedEndTime = formatTimeForDisplay(productEndTime);
          productTime = `${formattedStartTime} - ${formattedEndTime}`;
        } else {
          productTime = formattedStartTime;
        }
        
        logInfo(context, 'Product time loaded from product', { 
          productId: bookingMetadata.product_id,
          full_day_start_time: productStartTime,
          full_day_end_time: productEndTime,
          formattedProductTime: productTime
        });
      } else {
        logInfo(context, 'No product time found (full_day_start_time not set)', {
          productId: bookingMetadata.product_id,
          hasProduct: !!product
        });
      }

      const functionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/send-transactional-email`;
      const productNoAdults = bookingMetadata.product_type !== 'trip' && product
        ? ((product as any).no_adults === true || (product as any).no_adults === 1)
        : false;

      // Extract product data for email
      logInfo(context, 'Extracting product data for email', {
        productIncludedItemsRaw: (product as any)?.included_items,
        productExcludedItemsRaw: (product as any)?.excluded_items,
        includedItemsType: typeof (product as any)?.included_items,
        excludedItemsType: typeof (product as any)?.excluded_items,
        isIncludedArray: Array.isArray((product as any)?.included_items),
        isExcludedArray: Array.isArray((product as any)?.excluded_items),
      });
      
      const productIncludedItems = Array.isArray((product as any)?.included_items) 
        ? (product as any).included_items 
        : undefined;
      const productExcludedItems = Array.isArray((product as any)?.excluded_items) 
        ? (product as any).excluded_items 
        : undefined;
      
      logInfo(context, 'Product data extracted for email', {
        productIncludedItems,
        productExcludedItems,
        includedItemsLength: productIncludedItems?.length || 0,
        excludedItemsLength: productExcludedItems?.length || 0,
      });
      
      // Parse meeting_info
      let productMeetingInfo: { text: string; googleMapsLink: string } | undefined = undefined;
      let productShowMeetingInfo: boolean = false;
      if ((product as any)?.meeting_info && typeof (product as any).meeting_info === 'object') {
        const meetingInfo = (product as any).meeting_info;
        productMeetingInfo = {
          text: meetingInfo.text || '',
          googleMapsLink: meetingInfo.google_maps_link || '',
        };
        productShowMeetingInfo = (product as any).show_meeting_info === true || (product as any).show_meeting_info === 1;
      }
      
      const productCancellationPolicy = (product as any)?.cancellation_policy || undefined;
      
      // Log cancellation policy for debugging
      logInfo(context, 'Product cancellation policy retrieved', {
        productId: bookingMetadata.product_id,
        productName: product.name,
        cancellationPolicy: productCancellationPolicy,
        cancellationPolicyLength: productCancellationPolicy?.length || 0,
        cancellationPolicyType: typeof productCancellationPolicy,
      });
      
      // Load program if exists
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
          .eq('product_id', bookingMetadata.product_id)
          .eq('product_type', bookingMetadata.product_type)
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
        logWarn(context, 'Error loading program (non-blocking)', { error: programErr });
        // Non-blocking: continue without program
      }

      // Log what we're sending for email
      logInfo(context, 'Preparing email payload with product time', {
        productTime,
        productTimeType: typeof productTime,
        willSendTime: !!productTime
      });

      // CRITICAL: Use product data directly from database to ensure accuracy
      // Never use bookingMetadata or session data for product info - it may be outdated
      const emailPayload = {
        type: 'order_confirmation',
        bookingId,
        customerEmail,
        customerName: fullName,
        customerSurname: lastName || undefined,
        customerPhone: customerPhone || undefined,
        productName: product.name, // FROM DATABASE - not from bookingMetadata
        productDescription: product.description || undefined, // FROM DATABASE
        productType: bookingMetadata.product_type,
        bookingDate: bookingMetadata.booking_date,
        bookingTime: productTime || undefined, // Only use product time (full_day_start_time/end_time), never booking slot time
        numberOfAdults,
        numberOfDogs,
        totalAmount,
        currency: session.currency || 'EUR',
        orderNumber,
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
      
      // Log complete email payload for verification
      logInfo(context, 'Email payload prepared - VERIFY ALL DATA MATCHES PRODUCT DATABASE', {
        productId: bookingMetadata.product_id,
        productNameFromDB: product.name,
        productNameInPayload: emailPayload.productName,
        productDescriptionFromDB: product.description,
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
        bookingTimeInPayload: emailPayload.bookingTime,
        bookingTimeType: typeof emailPayload.bookingTime,
        // Verify critical fields match
        productNameMatches: product.name === emailPayload.productName,
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

      const emailResponse = await fetch(functionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify(emailPayload),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        logWarn(context, 'Email sending failed', { error: errorData });
        // Mark as not sent so fallback functions can retry
        await supabase
          .from('booking')
          .update({ confirmation_email_sent: false })
          .eq('id', bookingId);
      } else {
        logInfo(context, 'Confirmation email sent successfully');
        // Mark as sent to prevent duplicates
        await supabase
          .from('booking')
          .update({ confirmation_email_sent: true })
          .eq('id', bookingId);
      }
    } catch (emailError) {
      logWarn(context, 'Email sending error', { error: emailError });
      // Mark as not sent so fallback functions can retry
      await supabase
        .from('booking')
        .update({ confirmation_email_sent: false })
        .eq('id', bookingId);
      // Don't fail the request if email fails
    }

    // ============================================
    // Phase 11: Success Response
    // ============================================
    context.phase = 'completion';
    logInfo(context, 'Booking creation completed successfully', { bookingId });

    return new Response(
      JSON.stringify({
        success: true,
        bookingId,
        idempotencyKey,
        alreadyExisted: false,
        message: 'Booking created successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    logError(context, 'Unexpected error in booking creation', error, {
      phase: context.phase,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


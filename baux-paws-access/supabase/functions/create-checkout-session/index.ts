/**
 * Supabase Edge Function: Create Stripe Checkout Session
 * 
 * Creates a Stripe Checkout Session with dynamic product details
 * and redirects customer to Stripe payment page
 * 
 * CRITICAL: This function handles payment processing. All validations must be thorough.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { rateLimiters } from '../_shared/rateLimiter.ts';
import { secureLogger } from '../_shared/secureLogger.ts';
import { sanitizeAndValidateCustomer } from '../_shared/inputSanitization.ts';

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

interface CustomerData {
  name: string;
  surname?: string; // Optional for B2B
  email: string;
  phone: string;
  fiscalCode?: string | null;
  // B2B fields
  companyName?: string | null; // Ragione Sociale (required for B2B)
  vatNumber?: string | null;
  sdiCode?: string | null;
  pecEmail?: string | null;
  // Address fields
  addressLine1: string;
  addressCity: string;
  addressPostalCode: string;
  addressProvince?: string; // Required for both B2C and B2B
  addressCountry: string; // Default: 'IT'
}

interface CheckoutRequest {
  productId: string;
  productType: 'experience' | 'class' | 'trip';
  availabilitySlotId: string;
  date: string;
  timeSlot?: string | null;
  guests: number;
  dogs: number;
  successUrl: string;
  cancelUrl: string;
  isB2B?: boolean; // B2B flag
  // REQUIRED: Customer data from internal checkout
  customer: CustomerData;
}

// Validation helpers
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidTimeSlot(timeSlot: string | null | undefined): boolean {
  if (!timeSlot) return true; // Time slot is optional
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeSlot);
}

function validateRequest(body: any): { valid: boolean; error?: string } {
  // Check if body exists
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required and must be an object' };
  }

  // Validate productId
  if (!body.productId || typeof body.productId !== 'string' || !isValidUUID(body.productId)) {
    return { valid: false, error: 'productId is required and must be a valid UUID' };
  }

  // Validate productType
  if (!body.productType || !['experience', 'class', 'trip'].includes(body.productType)) {
    return { valid: false, error: 'productType must be one of: experience, class, trip' };
  }

  // Validate availabilitySlotId
  if (!body.availabilitySlotId || typeof body.availabilitySlotId !== 'string' || !isValidUUID(body.availabilitySlotId)) {
    return { valid: false, error: 'availabilitySlotId is required and must be a valid UUID' };
  }

  // Validate date
  if (!body.date || typeof body.date !== 'string' || !isValidDate(body.date)) {
    return { valid: false, error: 'date is required and must be a valid date string (YYYY-MM-DD)' };
  }

  // Validate timeSlot (optional)
  // Note: timeSlot should already be normalized before this validation
  // At this point, timeSlot should be either null or a valid HH:MM string
  // If it's not null and not a valid format, it's an error (shouldn't happen after normalization)
  if (body.timeSlot !== null && body.timeSlot !== undefined && typeof body.timeSlot === 'string') {
    if (!isValidTimeSlot(body.timeSlot)) {
      return { valid: false, error: `timeSlot must be in format HH:MM or null, received: "${body.timeSlot}"` };
    }
  } else if (body.timeSlot !== null && body.timeSlot !== undefined) {
    // If it's not null/undefined but also not a string, it's invalid
    return { valid: false, error: `timeSlot must be a string or null, received type: ${typeof body.timeSlot}` };
  }

  // Validate guests - allow 0 for products with no_adults, otherwise require 1-100
  if (typeof body.guests !== 'number' || !Number.isInteger(body.guests) || body.guests < 0 || body.guests > 100) {
    return { valid: false, error: 'guests must be an integer between 0 and 100' };
  }

  // Validate dogs
  if (typeof body.dogs !== 'number' || !Number.isInteger(body.dogs) || body.dogs < 0 || body.dogs > 100) {
    return { valid: false, error: 'dogs must be an integer between 0 and 100' };
  }

  // Validate successUrl
  if (!body.successUrl || typeof body.successUrl !== 'string' || !isValidUrl(body.successUrl)) {
    return { valid: false, error: 'successUrl is required and must be a valid URL' };
  }

  // Validate cancelUrl
  if (!body.cancelUrl || typeof body.cancelUrl !== 'string' || !isValidUrl(body.cancelUrl)) {
    return { valid: false, error: 'cancelUrl is required and must be a valid URL' };
  }

  // Validate customer data (REQUIRED - always from internal checkout)
  if (!body.customer || typeof body.customer !== 'object') {
    return { valid: false, error: 'customer data is required and must be an object' };
  }

  // Use comprehensive sanitization and validation
  const customerValidation = sanitizeAndValidateCustomer(body.customer);
  if (!customerValidation.valid) {
    return { valid: false, error: customerValidation.error };
  }

  // Replace customer data with sanitized version
  body.customer = customerValidation.data;

  return { valid: true };
}

// Use secure logger instead of direct console calls
const logError = secureLogger.error.bind(secureLogger);
const logInfo = secureLogger.log.bind(secureLogger);
const logWarn = secureLogger.warn.bind(secureLogger);

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  logInfo('Request', { requestId, method: req.method, url: req.url, origin });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    logError('MethodNotAllowed', new Error(`Method ${req.method} not allowed`), { requestId });
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Only POST is supported.' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Rate limiting
  const rateLimitResult = rateLimiters.checkout(req);
  if (!rateLimitResult.allowed) {
    logError('RateLimitExceeded', new Error('Rate limit exceeded'), { requestId, remaining: rateLimitResult.remaining });
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

  try {
    // Validate environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      logError('ConfigError', new Error('STRIPE_SECRET_KEY is not set'), { requestId });
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Stripe key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate Stripe key format (should start with sk_test_ or sk_live_)
    if (!stripeSecretKey.startsWith('sk_test_') && !stripeSecretKey.startsWith('sk_live_')) {
      logError('ConfigError', new Error('Invalid Stripe secret key format'), { requestId });
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Invalid Stripe key format' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      logError('ConfigError', new Error('Supabase environment variables not set'), { requestId });
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Database not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logInfo('SupabaseClient', { requestId, url: supabaseUrl });

    // Parse and validate request body
    let body: CheckoutRequest;
    try {
      body = await req.json();
      
      // Normalize timeSlot BEFORE validation (handle empty strings, whitespace, etc.)
      // Accept any value and normalize it
      if (body.timeSlot === null || body.timeSlot === undefined || body.timeSlot === '') {
        body.timeSlot = null;
      } else {
        const trimmed = String(body.timeSlot).trim();
        // If after trimming it's empty, set to null
        if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
          body.timeSlot = null;
        } else {
          // Try to convert HH:MM:SS to HH:MM format
          const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
          if (timeMatch) {
            const hours = timeMatch[1].padStart(2, '0');
            const minutes = timeMatch[2];
            const normalized = `${hours}:${minutes}`;
            // Validate the normalized format
            if (isValidTimeSlot(normalized)) {
              body.timeSlot = normalized;
            } else {
              console.warn(`[${requestId}] Invalid timeSlot format after normalization, setting to null:`, normalized);
              body.timeSlot = null;
            }
          } else {
            // If it doesn't match time format, validate as-is
            if (isValidTimeSlot(trimmed)) {
              body.timeSlot = trimmed;
            } else {
              console.warn(`[${requestId}] Invalid timeSlot format, normalizing to null:`, trimmed);
              body.timeSlot = null;
            }
          }
        }
      }
      
      // B2B DEBUG: Log isB2B BEFORE any processing
      logInfo('B2B_REQUEST_BODY_CHECK', {
        requestId,
        body_has_isB2B: 'isB2B' in body,
        body_isB2B: body.isB2B,
        body_isB2B_type: typeof body.isB2B,
        body_isB2B_undefined: body.isB2B === undefined,
        body_isB2B_null: body.isB2B === null,
        body_isB2B_false: body.isB2B === false,
        body_isB2B_true: body.isB2B === true,
        all_body_keys: Object.keys(body),
      });
      
      logInfo('RequestBody', { 
        requestId, 
        body: { 
          productId: body.productId,
          productType: body.productType,
          availabilitySlotId: body.availabilitySlotId,
          date: body.date,
          timeSlot: body.timeSlot,
          timeSlotType: typeof body.timeSlot,
          guests: body.guests,
          dogs: body.dogs,
          successUrl: body.successUrl?.substring(0, 50), 
          cancelUrl: body.cancelUrl?.substring(0, 50),
          hasCustomer: !!body.customer,
          customerKeys: body.customer ? Object.keys(body.customer) : [],
          // B2B DEBUG: Log isB2B flag from request
          isB2B_raw: body.isB2B,
          isB2B_type: typeof body.isB2B,
          isB2B_value: body.isB2B,
          isB2B_in_body: 'isB2B' in body,
        } 
      });
      
      // B2B DEBUG: Log complete customer object structure
      if (body.customer) {
        logInfo('RequestBodyCustomerDetails', {
          requestId,
          customer: {
            name: body.customer.name,
            surname: body.customer.surname || null,
            email: body.customer.email,
            phone: body.customer.phone,
            fiscalCode: body.customer.fiscalCode || null,
            // B2B fields
            companyName: (body.customer as any).companyName || null,
            vatNumber: body.customer.vatNumber || null,
            sdiCode: body.customer.sdiCode || null,
            pecEmail: body.customer.pecEmail || null,
            // Address
            addressLine1: body.customer.addressLine1,
            addressCity: body.customer.addressCity,
            addressPostalCode: body.customer.addressPostalCode,
            addressProvince: body.customer.addressProvince || null,
            addressCountry: body.customer.addressCountry || null,
          },
          allCustomerKeys: Object.keys(body.customer),
        });
      }
    } catch (error) {
      logError('ParseError', error, { requestId });
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate request body
    const validation = validateRequest(body);
    if (!validation.valid) {
      logError('ValidationError', new Error(validation.error || 'Unknown validation error'), { 
        requestId, 
        validationError: validation.error,
        bodyKeys: Object.keys(body),
        body: {
          productId: body.productId,
          productType: body.productType,
          availabilitySlotId: body.availabilitySlotId,
          date: body.date,
          timeSlot: body.timeSlot,
          timeSlotType: typeof body.timeSlot,
          guests: body.guests,
          guestsType: typeof body.guests,
          dogs: body.dogs,
          dogsType: typeof body.dogs,
          hasCustomer: !!body.customer,
          customerType: typeof body.customer,
          customerKeys: body.customer ? Object.keys(body.customer) : [],
        }
      });
      return new Response(
        JSON.stringify({ 
          error: validation.error || 'Validation failed',
          requestId,
          details: 'Check server logs for more information'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch product details from database
    const tableName = body.productType === 'class' ? 'class' : body.productType === 'experience' ? 'experience' : 'trip';
    logInfo('FetchProduct', { requestId, tableName, productId: body.productId });

    const { data: product, error: productError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', body.productId)
      .single();

    if (productError) {
      logError('ProductFetchError', productError, { requestId, tableName, productId: body.productId });
      return new Response(
        JSON.stringify({ error: `Product not found: ${productError.message}` }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!product) {
      logError('ProductNotFound', new Error('Product is null'), { requestId, productId: body.productId });
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate product is active
    if (product.active === false) {
      logError('ProductInactive', new Error('Product is not active'), { requestId, productId: body.productId });
      return new Response(
        JSON.stringify({ error: 'Product is not available' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    logInfo('ProductFound', { requestId, productName: product.name, productType: body.productType, noAdults: product.no_adults });

    // Validate guests based on product no_adults setting
    // If no_adults is true, guests can be 0. Otherwise, guests must be >= 1
    const isNoAdults = product.no_adults === true || product.no_adults === 1;
    if (!isNoAdults && body.guests < 1) {
      logError('InvalidGuests', new Error('guests must be at least 1 for products that require adults'), { 
        requestId, 
        guests: body.guests,
        noAdults: product.no_adults
      });
      return new Response(
        JSON.stringify({ error: 'guests must be at least 1 for this product' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch availability slot details
    logInfo('FetchAvailabilitySlot', { requestId, availabilitySlotId: body.availabilitySlotId });

    const { data: slot, error: slotError } = await supabase
      .from('availability_slot')
      .select('*')
      .eq('id', body.availabilitySlotId)
      .single();

    if (slotError) {
      logError('SlotFetchError', slotError, { requestId, availabilitySlotId: body.availabilitySlotId });
      return new Response(
        JSON.stringify({ error: `Availability slot not found: ${slotError.message}` }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!slot) {
      logError('SlotNotFound', new Error('Slot is null'), { requestId, availabilitySlotId: body.availabilitySlotId });
      return new Response(
        JSON.stringify({ error: 'Availability slot not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate slot matches product
    if (slot.product_id !== body.productId || slot.product_type !== body.productType) {
      logError('SlotMismatch', new Error('Slot does not match product'), { 
        requestId, 
        slotProductId: slot.product_id, 
        slotProductType: slot.product_type,
        requestProductId: body.productId,
        requestProductType: body.productType
      });
      return new Response(
        JSON.stringify({ error: 'Availability slot does not match product' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate slot date matches request date
    if (slot.date !== body.date) {
      logError('DateMismatch', new Error('Slot date does not match request date'), { 
        requestId, 
        slotDate: slot.date, 
        requestDate: body.date 
      });
      return new Response(
        JSON.stringify({ error: 'Availability slot date does not match requested date' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate availability
    const availableAdults = slot.max_adults - slot.booked_adults;
    const availableDogs = slot.max_dogs - slot.booked_dogs;

    // Only validate adult capacity if guests > 0 (skip if no_adults is true and guests is 0)
    if (body.guests > 0 && body.guests > availableAdults) {
      logError('InsufficientCapacity', new Error('Not enough adult capacity'), { 
        requestId, 
        requested: body.guests, 
        available: availableAdults 
      });
      return new Response(
        JSON.stringify({ error: `Not enough capacity. Available: ${availableAdults} adults, requested: ${body.guests}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (body.dogs > availableDogs) {
      logError('InsufficientCapacity', new Error('Not enough dog capacity'), { 
        requestId, 
        requested: body.dogs, 
        available: availableDogs 
      });
      return new Response(
        JSON.stringify({ error: `Not enough capacity. Available: ${availableDogs} dogs, requested: ${body.dogs}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    logInfo('SlotValidated', { requestId, availableAdults, availableDogs, requestedAdults: body.guests, requestedDogs: body.dogs });

    // Calculate total price based on pricing model
    const pricingModel = product.pricing_model || 'percentage'; // Default to percentage for backward compatibility
    const providerCostAdultBase = Number(product.provider_cost_adult_base) || 0;
    const providerCostDogBase = Number(product.provider_cost_dog_base) || 0;
    
    // Calculate provider cost total
    const providerCostTotal = (providerCostAdultBase * body.guests) + (providerCostDogBase * body.dogs);
    
    let totalAmount = 0;
    let pricePerAdult = 0;
    let pricePerDog = 0;
    
    if (pricingModel === 'percentage') {
      // Percentage model: price = provider_cost * (1 + margin_percentage/100)
      const marginPercentage = Number(product.margin_percentage) || 0;
      
      if (providerCostTotal <= 0) {
        logError('InvalidProviderCost', new Error('Provider cost must be greater than 0 for percentage model'), { 
          requestId, 
          providerCostAdultBase, 
          providerCostDogBase, 
          guests: body.guests, 
          dogs: body.dogs,
          providerCostTotal
        });
        return new Response(
          JSON.stringify({ error: 'Invalid pricing configuration: provider cost must be greater than 0' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Calculate total with precise rounding to avoid floating point errors
      const totalBeforeRounding = providerCostTotal * (1 + marginPercentage / 100);
      totalAmount = Math.round(totalBeforeRounding * 100) / 100;
      
      // Calculate per-unit prices proportionally with precise rounding
      if (providerCostTotal > 0) {
        const priceRatio = totalAmount / providerCostTotal;
        pricePerAdult = Math.round((providerCostAdultBase * priceRatio) * 100) / 100;
        pricePerDog = Math.round((providerCostDogBase * priceRatio) * 100) / 100;
      }
      
      logInfo('PriceCalculatedPercentage', { 
        requestId, 
        pricingModel: 'percentage',
        providerCostTotal, 
        marginPercentage, 
        totalAmount,
        pricePerAdult,
        pricePerDog
      });
    } else if (pricingModel === 'markup') {
      // Markup model: price = provider_cost + markup_adult * num_adults + markup_dog * num_dogs
      const markupAdult = Number(product.markup_adult) || 0;
      const markupDog = Number(product.markup_dog) || 0;
      
      // Calculate total with precise rounding
      const totalBeforeRounding = providerCostTotal + (markupAdult * body.guests) + (markupDog * body.dogs);
      totalAmount = Math.round(totalBeforeRounding * 100) / 100;
      
      // Calculate per-unit prices with precise rounding
      pricePerAdult = Math.round((providerCostAdultBase + markupAdult) * 100) / 100;
      pricePerDog = Math.round((providerCostDogBase + markupDog) * 100) / 100;
      
      logInfo('PriceCalculatedMarkup', { 
        requestId, 
        pricingModel: 'markup',
        providerCostTotal, 
        markupAdult, 
        markupDog,
        totalAmount,
        pricePerAdult,
        pricePerDog
      });
    } else {
      // Fallback to old pricing model (backward compatibility)
      pricePerAdult = Number(product.price_adult_base) || 0;
      pricePerDog = Number(product.price_dog_base) || 0;
      // Calculate total with precise rounding
      const totalBeforeRounding = (pricePerAdult * body.guests) + (pricePerDog * body.dogs);
      totalAmount = Math.round(totalBeforeRounding * 100) / 100;
      
      logInfo('PriceCalculatedLegacy', { 
        requestId, 
        pricingModel: 'legacy',
        pricePerAdult, 
        pricePerDog,
        totalAmount
      });
    }

    // Validate total amount
    if (totalAmount <= 0) {
      logError('InvalidPrice', new Error('Total amount must be greater than 0'), { 
        requestId, 
        pricingModel,
        pricePerAdult, 
        pricePerDog, 
        guests: body.guests, 
        dogs: body.dogs,
        totalAmount
      });
      return new Response(
        JSON.stringify({ error: 'Invalid pricing: total amount must be greater than 0' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Convert to cents for Stripe (Stripe uses smallest currency unit)
    // Use precise rounding to avoid floating point errors
    const totalAmountCents = Math.round(Math.round(totalAmount * 100));

    if (totalAmountCents < 50) { // Stripe minimum is 0.50 EUR
      logError('AmountTooLow', new Error('Amount below Stripe minimum'), { requestId, totalAmountCents });
      return new Response(
        JSON.stringify({ error: 'Amount too low. Minimum payment is 0.50 EUR' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    logInfo('PriceCalculated', { requestId, totalAmount, totalAmountCents, pricePerAdult, pricePerDog });

    // CRITICAL: Calculate subtotals ensuring they sum exactly to totalAmount
    // This matches the frontend logic to guarantee consistency
    // Calculate unrounded subtotals
    const unroundedSubtotalAdults = pricePerAdult * body.guests;
    const unroundedSubtotalDogs = pricePerDog * body.dogs;
    
    // Round each subtotal individually
    let subtotalAdults = Math.round(unroundedSubtotalAdults * 100) / 100;
    let subtotalDogs = Math.round(unroundedSubtotalDogs * 100) / 100;
    
    // Calculate the sum of rounded subtotals
    const roundedSum = subtotalAdults + subtotalDogs;
    const difference = totalAmount - roundedSum;
    
    // If there's a difference (due to rounding), adjust to make sum exact
    if (Math.abs(difference) > 0.0001) {
      // Distribute the difference to the larger subtotal to minimize visual impact
      if (Math.abs(subtotalAdults) >= Math.abs(subtotalDogs)) {
        subtotalAdults = Math.round((subtotalAdults + difference) * 100) / 100;
      } else {
        subtotalDogs = Math.round((subtotalDogs + difference) * 100) / 100;
      }
    }
    
    // Recalculate pricePerAdult and pricePerDog from adjusted subtotals to ensure Stripe line items sum correctly
    const adjustedPricePerAdult = body.guests > 0 ? subtotalAdults / body.guests : 0;
    const adjustedPricePerDog = body.dogs > 0 ? subtotalDogs / body.dogs : 0;

    // Build line items for Stripe
    const lineItems: Array<{
      price_data: {
        currency: 'eur';
        product_data: {
          name: string;
          description?: string;
          images?: string[];
        };
        unit_amount: number;
      };
      quantity: number;
    }> = [];

    // Add adults line item (using adjusted price to ensure sum matches totalAmount)
    if (body.guests > 0 && adjustedPricePerAdult > 0) {
      const adultsUnitAmountCents = Math.round(adjustedPricePerAdult * 100);
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${product.name} - ${body.guests} ${body.guests === 1 ? 'persona' : 'persone'}`,
            description: `Prenotazione per ${body.guests} ${body.guests === 1 ? 'persona' : 'persone'}`,
            images: product.images && Array.isArray(product.images) && product.images.length > 0 
              ? [String(product.images[0])] 
              : undefined,
          },
          unit_amount: adultsUnitAmountCents,
        },
        quantity: body.guests,
      });
    }

    // Add dogs line item (using adjusted price to ensure sum matches totalAmount)
    if (body.dogs > 0 && adjustedPricePerDog > 0) {
      const dogsUnitAmountCents = Math.round(adjustedPricePerDog * 100);
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${product.name} - ${body.dogs} ${body.dogs === 1 ? 'cane' : 'cani'}`,
            description: `Prenotazione per ${body.dogs} ${body.dogs === 1 ? 'cane' : 'cani'}`,
          },
          unit_amount: dogsUnitAmountCents,
        },
        quantity: body.dogs,
      });
    }
    
    // Verify line items sum matches totalAmount (in cents)
    const lineItemsSumCents = lineItems.reduce((sum, item) => sum + (item.price_data.unit_amount * item.quantity), 0);
    const totalAmountCentsVerified = Math.round(totalAmount * 100);
    
    if (Math.abs(lineItemsSumCents - totalAmountCentsVerified) > 1) {
      // If difference is more than 1 cent, log error and use single line item
      logError('LineItemsSumMismatch', new Error('Line items sum does not match total amount'), {
        requestId,
        lineItemsSumCents,
        totalAmountCentsVerified,
        difference: lineItemsSumCents - totalAmountCentsVerified,
      });
      
      // Fallback: use single line item with exact totalAmount
      lineItems.length = 0;
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: product.name || 'Prenotazione',
            description: product.description || undefined,
            images: product.images && Array.isArray(product.images) && product.images.length > 0 
              ? [String(product.images[0])] 
              : undefined,
          },
          unit_amount: totalAmountCentsVerified,
        },
        quantity: 1,
      });
    }

    // If no line items, create a single item with total
    if (lineItems.length === 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: product.name || 'Prenotazione',
            description: product.description || undefined,
            images: product.images && Array.isArray(product.images) && product.images.length > 0 
              ? [String(product.images[0])] 
              : undefined,
          },
          unit_amount: totalAmountCentsVerified,
        },
        quantity: 1,
      });
    }
    
    logInfo('LineItemsVerified', {
      requestId,
      lineItemsCount: lineItems.length,
      lineItemsSumCents,
      totalAmountCentsVerified,
      match: Math.abs(lineItemsSumCents - totalAmountCentsVerified) <= 1,
    });

    logInfo('LineItemsCreated', { requestId, lineItemsCount: lineItems.length });

    // ============================================
    // INTERNAL CHECKOUT FLOW: Save quotation and create Stripe Customer
    // Customer data is ALWAYS required - all data comes from internal checkout
    // ============================================
    let quotationId: string | null = null;
    let stripeCustomerId: string | null = null;
    
    // Customer data is validated above, so we can safely use it here
    const customer = body.customer;
    
    // Address fields validated for Stripe (defined here for scope)
    let addressLine1 = '';
    let addressCity = '';
    let addressPostalCode = '';
    let addressCountry = 'IT';
    
    // Process customer data (ALWAYS present from internal checkout)
    // CRITICAL: Define isB2B in outer scope so it's available for Payment Intent metadata
    // Handle both boolean and string values for isB2B
    
    // B2B DEBUG: Log raw isB2B value BEFORE processing
    logInfo('B2BFlagDetection_START', {
      requestId,
      body_isB2B: body.isB2B,
      body_isB2B_type: typeof body.isB2B,
      body_isB2B_stringified: String(body.isB2B),
      body_keys: Object.keys(body),
      has_isB2B_in_body: 'isB2B' in body,
    });
    
    let isB2B = false;
    const rawIsB2B: any = body.isB2B;
    
    // B2B DEBUG: Log raw isB2B value and type AFTER extraction
    logInfo('B2BFlagDetection', {
      requestId,
      rawIsB2B,
      rawIsB2B_type: typeof rawIsB2B,
      rawIsB2B_stringified: String(rawIsB2B),
      rawIsB2B_is_undefined: rawIsB2B === undefined,
      rawIsB2B_is_null: rawIsB2B === null,
      rawIsB2B_is_false: rawIsB2B === false,
      rawIsB2B_is_true: rawIsB2B === true,
    });
    
    if (rawIsB2B === true) {
      isB2B = true;
      logInfo('B2BFlagDetected', { requestId, method: 'boolean_true', isB2B: true });
    } else if (typeof rawIsB2B === 'string') {
      const strValue = String(rawIsB2B).toLowerCase();
      isB2B = strValue === 'true' || strValue === '1';
      logInfo('B2BFlagDetected', { requestId, method: 'string_parsing', strValue, isB2B });
    } else if (typeof rawIsB2B === 'number') {
      isB2B = rawIsB2B === 1;
      logInfo('B2BFlagDetected', { requestId, method: 'number_parsing', rawIsB2B, isB2B });
    } else {
      logInfo('B2BFlagDetected', { requestId, method: 'default_false', isB2B: false });
    }
    
    // B2B DEBUG: Final isB2B value
    logInfo('B2BFlagFinal', { requestId, isB2B, rawIsB2B });
    
    {
      const customer = body.customer;
      
      logInfo('InternalCheckoutFlow', { 
        requestId, 
        isB2B,
        rawIsB2B: rawIsB2B,
        customerName: customer.name,
        customerSurname: customer.surname || '',
        customerEmail: customer.email,
        companyName: customer.companyName || null,
        hasFiscalCode: !!customer.fiscalCode,
        hasVatNumber: !!customer.vatNumber,
        hasCompanyName: !!customer.companyName,
      });
      
      // B2B DEBUG: Complete customer object dump
      logInfo('B2BCustomerDataDump', {
        requestId,
        isB2B,
        customer: {
          name: customer.name,
          surname: customer.surname || null,
          email: customer.email,
          phone: customer.phone,
          fiscalCode: customer.fiscalCode || null,
          companyName: customer.companyName || null,
          vatNumber: customer.vatNumber || null,
          sdiCode: customer.sdiCode || null,
          pecEmail: customer.pecEmail || null,
          addressLine1: customer.addressLine1,
          addressCity: customer.addressCity,
          addressPostalCode: customer.addressPostalCode,
          addressProvince: customer.addressProvince || null,
          addressCountry: customer.addressCountry || null,
        },
        customerKeys: Object.keys(customer),
      });
      
      // B2B DEBUG: Check if we have B2B data but isB2B flag is missing
      // FALLBACK: If B2B data is present but isB2B is false, assume it's B2B
      const hasB2BData = !!(customer.companyName || customer.vatNumber || customer.sdiCode || customer.pecEmail);
      if (hasB2BData && !isB2B) {
        logInfo('B2B_DATA_DETECTED_BUT_FLAG_MISSING', {
          requestId,
          isB2B_before: isB2B,
          hasB2BData,
          hasCompanyName: !!customer.companyName,
          hasVatNumber: !!customer.vatNumber,
          hasSdiCode: !!customer.sdiCode,
          hasPecEmail: !!customer.pecEmail,
          companyName: customer.companyName || null,
          vatNumber: customer.vatNumber || null,
          warning: '⚠️ B2B data present but isB2B flag is false/undefined! Auto-detecting as B2B.',
        });
        
        // FALLBACK: Auto-detect B2B if we have B2B data
        isB2B = true;
        logInfo('B2B_AUTO_DETECTED', {
          requestId,
          isB2B_after: isB2B,
          reason: 'B2B data (companyName/vatNumber) present but isB2B flag was missing',
        });
      }

      // Validate and truncate address fields to Stripe limits (to prevent Stripe errors)
      // Stripe limits: line1 max 200, city max 200, postal_code max 20, country 2 chars
      addressLine1 = String(customer.addressLine1).trim().substring(0, 200);
      addressCity = String(customer.addressCity).trim().substring(0, 200);
      addressPostalCode = String(customer.addressPostalCode).trim().substring(0, 20);
      addressCountry = String(customer.addressCountry || 'IT').trim().substring(0, 2).toUpperCase() || 'IT';
      
      logInfo('AddressValidation', { 
        requestId,
        originalLine1Length: String(customer.addressLine1 || '').length,
        truncatedLine1Length: addressLine1.length,
        originalCityLength: String(customer.addressCity || '').length,
        truncatedCityLength: addressCity.length,
        originalPostalCodeLength: String(customer.addressPostalCode || '').length,
        truncatedPostalCodeLength: addressPostalCode.length,
        country: addressCountry
      });

      // Step 1: Save quotation to database (NON-BLOCKING - never fail the flow)
      try {
        logInfo('SavingQuotation', { requestId, customerEmail: customer.email, isB2B });
        
        const quotationData: any = {
          is_b2b: isB2B,
          customer_name: customer.name,
          customer_surname: customer.surname || '',
          customer_email: customer.email,
          customer_phone: customer.phone,
          customer_fiscal_code: customer.fiscalCode || null,
          customer_address_line1: addressLine1,
          customer_address_city: addressCity,
          customer_address_postal_code: addressPostalCode,
          customer_address_province: customer.addressProvince || null,
          customer_address_country: addressCountry,
          product_id: body.productId,
          product_type: body.productType,
          product_name: product.name,
          availability_slot_id: body.availabilitySlotId,
          booking_date: body.date,
          booking_time: body.timeSlot || null,
          guests: body.guests,
          dogs: body.dogs,
          total_amount: totalAmount,
          status: 'quote',
        };

        // Add B2B fields if applicable
        if (isB2B) {
          // CRITICAL: Use companyName (Ragione Sociale) for B2B, NEVER customer.name (which is contact name)
          // If companyName is missing, log warning
          if (!customer.companyName || !customer.companyName.trim()) {
            logInfo('B2BWarningMissingCompanyNameForQuotation', {
              requestId,
              warning: '⚠️⚠️⚠️ B2B quotation but companyName (ragione sociale) is missing!',
              customerName: customer.name,
            });
          }
          quotationData.company_name = customer.companyName?.trim() || null; // Only use companyName, never customer.name
          quotationData.company_vat_number = customer.vatNumber || null;
          quotationData.company_sdi_code = customer.sdiCode || null;
          quotationData.company_pec_email = customer.pecEmail || null;
          
          // B2B DEBUG: Log quotation B2B fields
          logInfo('B2BQuotationFields', {
            requestId,
            company_name: quotationData.company_name,
            company_name_source: customer.companyName ? 'companyName' : 'MISSING (not using customer.name fallback)',
            company_vat_number: quotationData.company_vat_number,
            company_sdi_code: quotationData.company_sdi_code,
            company_pec_email: quotationData.company_pec_email,
          });
        } else {
          logInfo('B2BQuotationFields', { requestId, isB2B: false, message: 'Not B2B, skipping B2B fields' });
        }
        
        const { data: quotation, error: quotationError } = await supabase
          .from('quotation')
          .insert(quotationData)
          .select('id')
          .single();

        if (quotationError) {
          logError('QuotationSaveError', quotationError, { 
            requestId, 
            customerEmail: customer.email,
            errorCode: quotationError.code,
            errorMessage: quotationError.message
          });
          // Continue anyway - quotation save failure should not block checkout
        } else if (quotation && quotation.id) {
          quotationId = quotation.id;
          logInfo('QuotationSaved', { 
            requestId, 
            quotationId,
            customerEmail: customer.email
          });
        } else {
          logError('QuotationSaveError', new Error('Quotation insert returned no ID'), { 
            requestId, 
            customerEmail: customer.email
          });
        }
      } catch (quotationException) {
        logError('QuotationSaveException', quotationException, { 
          requestId, 
          customerEmail: customer.email
        });
        // Continue anyway - quotation save failure should not block checkout
      }

      // Step 2: Create Stripe Customer with all customer data
      try {
        logInfo('CreatingStripeCustomer', { requestId, customerEmail: customer.email, isB2B });
        
        const customerFormData = new URLSearchParams();
        customerFormData.append('email', customer.email);
        // For B2B, use company name (Ragione Sociale); for B2C, use name + surname
        const customerNameForStripe = isB2B 
          ? (customer.companyName || customer.name) // Use companyName for B2B, fallback to name
          : `${customer.name} ${customer.surname || ''}`.trim();
        customerFormData.append('name', customerNameForStripe);
        customerFormData.append('phone', customer.phone);
        // Use validated/truncated address fields
        customerFormData.append('address[line1]', addressLine1);
        customerFormData.append('address[city]', addressCity);
        customerFormData.append('address[postal_code]', addressPostalCode);
        customerFormData.append('address[country]', addressCountry);
        
        // Add metadata to customer for Odoo
        customerFormData.append('metadata[is_b2b]', isB2B ? 'true' : 'false');
        customerFormData.append('metadata[customer_name]', customer.name);
        if (!isB2B && customer.surname) {
          customerFormData.append('metadata[customer_surname]', customer.surname);
        }
        customerFormData.append('metadata[customer_fiscal_code]', customer.fiscalCode || '');
        customerFormData.append('metadata[customer_address_province]', customer.addressProvince || '');
        
        // Add B2B metadata if applicable
        if (isB2B) {
          // CRITICAL: Use companyName (Ragione Sociale) for B2B, NEVER customer.name (which is contact name)
          // If companyName is missing, log warning
          if (!customer.companyName || !customer.companyName.trim()) {
            logInfo('B2BWarningMissingCompanyNameForCustomer', {
              requestId,
              warning: '⚠️⚠️⚠️ B2B customer but companyName (ragione sociale) is missing!',
              customerName: customer.name,
            });
          }
          // Only use companyName, never customer.name as fallback
          const companyNameForMetadata = customer.companyName?.trim() || '';
          if (companyNameForMetadata) {
            customerFormData.append('metadata[company_name]', companyNameForMetadata);
          } else {
            logInfo('B2BCompanyNameNotSetInCustomerMetadata', {
              requestId,
              warning: 'company_name not set in Customer metadata - will be handled by webhook with warning',
            });
          }
          customerFormData.append('metadata[company_vat_number]', customer.vatNumber || '');
          customerFormData.append('metadata[company_sdi_code]', customer.sdiCode || '');
          customerFormData.append('metadata[company_pec_email]', customer.pecEmail || '');
          
          // B2B DEBUG: Log Stripe Customer B2B metadata
          logInfo('B2BStripeCustomerMetadata', {
            requestId,
            'metadata[is_b2b]': isB2B ? 'true' : 'false',
            'metadata[company_name]': companyNameForMetadata || 'NOT_SET',
            company_name_source: customer.companyName ? 'companyName' : 'MISSING (not using customer.name fallback)',
            companyName_from_customer: customer.companyName || null,
            customer_name: customer.name,
            customer_surname: customer.surname || null,
            warning: !customer.companyName ? '⚠️⚠️⚠️ companyName missing - company_name may not be set in metadata' : null,
            'metadata[company_vat_number]': customer.vatNumber || '',
            'metadata[company_sdi_code]': customer.sdiCode || '',
            'metadata[company_pec_email]': customer.pecEmail || '',
          });
        } else {
          logInfo('B2BStripeCustomerMetadata', { requestId, isB2B: false, message: 'Not B2B, skipping B2B metadata' });
        }
        
        if (quotationId) {
          customerFormData.append('metadata[quotation_id]', quotationId);
        }

        const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: customerFormData.toString(),
        });

        if (!customerResponse.ok) {
          const customerErrorData = await customerResponse.text();
          let customerErrorMessage = `Stripe Customer API error: ${customerResponse.status}`;
          
          try {
            const customerErrorJson = JSON.parse(customerErrorData);
            customerErrorMessage = customerErrorJson.error?.message || customerErrorMessage;
            logError('StripeCustomerError', new Error(customerErrorMessage), { 
              requestId, 
              status: customerResponse.status, 
              errorData: customerErrorJson 
            });
          } catch {
            logError('StripeCustomerError', new Error(customerErrorData), { 
              requestId, 
              status: customerResponse.status 
            });
          }
          
          // Continue anyway - customer creation failure should not block checkout
          // Stripe will create customer automatically if needed
        } else {
          const customerData = await customerResponse.json();
          if (customerData && customerData.id) {
            stripeCustomerId = customerData.id;
            logInfo('StripeCustomerCreated', { 
              requestId, 
              stripeCustomerId,
              customerEmail: customer.email
            });
          } else {
            logError('StripeCustomerInvalid', new Error('Stripe customer creation returned no ID'), { 
              requestId, 
              customerEmail: customer.email
            });
          }
        }
      } catch (customerException) {
        logError('StripeCustomerException', customerException, { 
          requestId, 
          customerEmail: customer.email
        });
        // Continue anyway - customer creation failure should not block checkout
      }
    }

    // ============================================
    // CREATE STRIPE CHECKOUT SESSION
    // All customer data comes from internal checkout - Stripe must NOT ask for any data
    // ============================================
    const formData = new URLSearchParams();
    formData.append('mode', 'payment');
    formData.append('success_url', body.successUrl);
    formData.append('cancel_url', body.cancelUrl);
    
    // Customer data is ALWAYS present from internal checkout
    logInfo('CreatingCheckoutSession', { 
      requestId, 
      hasStripeCustomer: !!stripeCustomerId,
      customerEmail: customer.email
    });
    
    // CRITICAL: Stripe doesn't allow both 'customer' and 'customer_email' at the same time
    // If we have a Customer ID, use it. Otherwise, use customer_email.
    if (stripeCustomerId) {
      formData.append('customer', stripeCustomerId);
      logInfo('UsingStripeCustomer', { requestId, stripeCustomerId });
      // Customer object already has email, so we don't need customer_email
    } else {
      // Customer creation failed, but we still have the data
      // Pass customer_email and Stripe will create customer automatically
      formData.append('customer_email', customer.email);
      logInfo('UsingCustomerEmail', { 
        requestId, 
        customerEmail: customer.email,
        message: 'Stripe will create customer automatically with this email'
      });
    }
    
    // CRITICAL: Disable ALL data collection - we have everything from internal checkout
    // Note: When using 'customer' parameter, email collection is automatically disabled
    // We only need to disable phone collection
    formData.append('phone_number_collection[enabled]', 'false');
    
    // CRITICAL: Do NOT set billing_address_collection or shipping_address_collection
    // Stripe will automatically use the Customer's address if available
    // If we set these fields, Stripe will ask for address even if Customer has one
    // By not setting them, Stripe uses default behavior: use Customer address if available
    // Valid values are only 'required' (always ask) - we don't want that
    // 'auto' is NOT a valid value and causes "Invalid object" error
    
    // Note: When using 'customer' object, Stripe automatically doesn't show update fields
    // We don't need to set customer_update - default behavior is correct
    
    // CRITICAL: NO custom fields - all customer data is in metadata
    // Stripe must NOT ask for name, surname, fiscal code, or address
    // All this data is already in:
    // 1. Stripe Customer object (if created successfully) - includes name, email, phone, address
    // 2. Session metadata
    // 3. Payment Intent metadata
    
    logInfo('CheckoutSessionConfig', { 
      requestId, 
      email: customer.email,
      hasCustomerObject: !!stripeCustomerId,
      phoneCollectionDisabled: true,
      billingAddressCollection: 'not set (uses Customer address if available)',
      shippingAddressCollection: 'not set (uses Customer address if available)',
      // customerUpdate: default behavior (no updates when Customer object is used)
      customFieldsDisabled: true,
      message: 'Stripe will NOT ask for any customer data - all pre-filled from Customer object'
    });
    
    // Add line items as array
    lineItems.forEach((item, index) => {
      formData.append(`line_items[${index}][price_data][currency]`, item.price_data.currency);
      formData.append(`line_items[${index}][price_data][product_data][name]`, item.price_data.product_data.name);
      if (item.price_data.product_data.description) {
        formData.append(`line_items[${index}][price_data][product_data][description]`, item.price_data.product_data.description);
      }
      if (item.price_data.product_data.images && item.price_data.product_data.images.length > 0) {
        formData.append(`line_items[${index}][price_data][product_data][images][0]`, item.price_data.product_data.images[0]);
      }
      formData.append(`line_items[${index}][price_data][unit_amount]`, String(item.price_data.unit_amount));
      formData.append(`line_items[${index}][quantity]`, String(item.quantity));
    });

    // Add metadata - include ALL data for Odoo compatibility
    const metadata: Record<string, string> = {
      product_id: body.productId,
      product_type: body.productType,
      availability_slot_id: body.availabilitySlotId,
      booking_date: body.date,
      booking_time: body.timeSlot || '',
      number_of_adults: String(body.guests),
      number_of_dogs: String(body.dogs),
      product_name: product.name || '',
      total_amount: String(totalAmount),
      request_id: requestId,
    };

    // Add ALL customer fields to metadata for Odoo (customer data is ALWAYS present)
    metadata.customer_name = customer.name;
    metadata.customer_surname = customer.surname || '';
    metadata.customer_email = customer.email;
    metadata.customer_phone = customer.phone;
    if (customer.fiscalCode) {
      metadata.customer_fiscal_code = customer.fiscalCode;
    }
    // Use validated/truncated address fields in metadata
    metadata.customer_address_line1 = addressLine1;
    metadata.customer_address_city = addressCity;
    metadata.customer_address_postal_code = addressPostalCode;
    metadata.customer_address_country = addressCountry;
    
    logInfo('AddedCustomerMetadata', { 
      requestId, 
      customerEmail: customer.email,
      hasFiscalCode: !!customer.fiscalCode
    });

    // Add quotation_id if we have it
    if (quotationId) {
      metadata.quotation_id = quotationId;
      logInfo('AddedQuotationId', { requestId, quotationId });
    }
    
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        formData.append(`metadata[${key}]`, String(value));
      }
    });

    // Add payment intent metadata - same data for Odoo webhook
    const paymentIntentMetadata: Record<string, string> = {
      product_id: body.productId,
      product_type: body.productType,
      availability_slot_id: body.availabilitySlotId,
      booking_date: body.date,
      booking_time: body.timeSlot || '',
      number_of_adults: String(body.guests),
      number_of_dogs: String(body.dogs),
      product_name: product.name || '',
      total_amount: String(totalAmount),
    };

    // Add customer data to payment intent metadata (customer data is ALWAYS present)
    // CRITICAL: For B2B, customer.name is the contact name, NOT the company name
    // For B2C, customer.name is the customer name
    paymentIntentMetadata.customer_name = customer.name;
    // CRITICAL: For B2B, also pass customer_surname (contact surname)
    paymentIntentMetadata.customer_surname = customer.surname || '';
    paymentIntentMetadata.customer_email = customer.email;
    paymentIntentMetadata.customer_phone = customer.phone;
    
    // Add fiscal code to payment intent metadata (for both B2C and B2B)
    // B2C: CF is always added if present
    // B2B: CF is added only if different from P.IVA (handled below in B2B section)
    if (customer.fiscalCode && customer.fiscalCode.trim()) {
      // For B2C, always add CF
      // For B2B, we'll check if it's different from P.IVA below
      if (!isB2B) {
        paymentIntentMetadata.customer_fiscal_code = customer.fiscalCode.trim();
        logInfo('PaymentIntentFiscalCode', {
          requestId,
          isB2B: false,
          fiscalCode: customer.fiscalCode.trim(),
          message: 'B2C fiscal code added to Payment Intent metadata',
        });
      }
      // For B2B, CF will be added below only if different from P.IVA
    } else {
      logInfo('PaymentIntentFiscalCode', {
        requestId,
        isB2B,
        hasFiscalCode: false,
        fiscalCode: customer.fiscalCode || null,
        message: 'No fiscal code to add to Payment Intent metadata',
      });
    }
    // Use validated/truncated address fields in payment intent metadata
    paymentIntentMetadata.customer_address_line1 = addressLine1;
    paymentIntentMetadata.customer_address_city = addressCity;
    paymentIntentMetadata.customer_address_postal_code = addressPostalCode;
    paymentIntentMetadata.customer_address_country = addressCountry;
    paymentIntentMetadata.customer_address_province = customer.addressProvince || '';

    // CRITICAL: Add is_b2b flag to payment intent metadata (Odoo webhook reads from Payment Intent, not Customer)
    paymentIntentMetadata.is_b2b = isB2B ? 'true' : 'false';
    
    logInfo('PaymentIntentB2BFlag', { 
      requestId, 
      isB2B,
      rawIsB2B: rawIsB2B,
      is_b2b_metadata: paymentIntentMetadata.is_b2b,
      hasCompanyVat: !!customer.vatNumber,
      hasCompanyName: !!customer.companyName,
      companyName: customer.companyName || null,
      customerName: customer.name
    });
    
    // Add B2B fields to payment intent metadata if applicable
    if (isB2B) {
      // CRITICAL: Use companyName (Ragione Sociale) for B2B, NEVER customer.name (which is contact name)
      // If companyName is missing, log warning but don't use customer.name as fallback
      if (!customer.companyName || !customer.companyName.trim()) {
        logInfo('B2BWarningMissingCompanyName', {
          requestId,
          isB2B,
          hasCompanyName: !!customer.companyName,
          companyName: customer.companyName || null,
          customerName: customer.name,
          warning: '⚠️⚠️⚠️ B2B order but companyName (ragione sociale) is missing!',
        });
      }
      // CRITICAL: Only use companyName, never customer.name as fallback for B2B
      const companyNameForPaymentIntent = customer.companyName?.trim() || null;
      if (companyNameForPaymentIntent) {
        paymentIntentMetadata.company_name = companyNameForPaymentIntent;
      } else {
        // Don't set company_name if missing - let webhook handle it with warning
        logInfo('B2BCompanyNameNotSet', {
          requestId,
          warning: 'company_name not set in Payment Intent metadata - will be handled by webhook with warning',
        });
      }
      if (customer.vatNumber) {
        paymentIntentMetadata.company_vat_number = customer.vatNumber;
      }
      if (customer.sdiCode) {
        paymentIntentMetadata.company_sdi_code = customer.sdiCode;
      }
      if (customer.pecEmail) {
        paymentIntentMetadata.company_pec_email = customer.pecEmail;
      }
      if (customer.fiscalCode && customer.fiscalCode.trim() && customer.fiscalCode.trim() !== customer.vatNumber?.trim()) {
        // CF only if different from P.IVA
        paymentIntentMetadata.customer_fiscal_code = customer.fiscalCode.trim();
        logInfo('PaymentIntentFiscalCode', {
          requestId,
          isB2B: true,
          fiscalCode: customer.fiscalCode.trim(),
          vatNumber: customer.vatNumber || null,
          message: 'B2B fiscal code added to Payment Intent metadata (different from P.IVA)',
        });
      } else if (customer.fiscalCode && customer.fiscalCode.trim() === customer.vatNumber?.trim()) {
        logInfo('PaymentIntentFiscalCode', {
          requestId,
          isB2B: true,
          fiscalCode: customer.fiscalCode.trim(),
          vatNumber: customer.vatNumber || null,
          message: 'B2B fiscal code NOT added (same as P.IVA)',
        });
      }
      
      // B2B DEBUG: Complete Payment Intent B2B metadata dump
      logInfo('PaymentIntentB2BFields', { 
        requestId,
        isB2B,
        company_name: paymentIntentMetadata.company_name,
        company_name_source: customer.companyName ? 'companyName' : 'name (fallback)',
        companyName_from_customer: customer.companyName || null,
        customer_name: customer.name,
        company_vat_number: paymentIntentMetadata.company_vat_number || null,
        company_sdi_code: paymentIntentMetadata.company_sdi_code || null,
        company_pec_email: paymentIntentMetadata.company_pec_email || null,
        customer_fiscal_code: paymentIntentMetadata.customer_fiscal_code || null,
        has_vat: !!paymentIntentMetadata.company_vat_number,
        has_sdi: !!paymentIntentMetadata.company_sdi_code,
        has_pec: !!paymentIntentMetadata.company_pec_email,
        has_cf: !!paymentIntentMetadata.customer_fiscal_code,
        allPaymentIntentMetadataKeys: Object.keys(paymentIntentMetadata),
      });
    } else {
      logInfo('PaymentIntentB2BFields', { 
        requestId,
        isB2B: false,
        message: 'Not B2B, skipping B2B fields in Payment Intent metadata'
      });
    }

    if (quotationId) {
      paymentIntentMetadata.quotation_id = quotationId;
    }
    
    // B2B DEBUG: Log all payment intent metadata before sending
    logInfo('B2BPaymentIntentMetadataBeforeSend', {
      requestId,
      isB2B,
      paymentIntentMetadataKeys: Object.keys(paymentIntentMetadata),
      paymentIntentMetadata: {
        ...paymentIntentMetadata,
        // Log all fields for debugging
      },
      willSend_is_b2b: paymentIntentMetadata.is_b2b,
      willSend_company_name: paymentIntentMetadata.company_name || 'NOT_SET',
      willSend_customer_fiscal_code: paymentIntentMetadata.customer_fiscal_code || 'NOT_SET',
      has_customer_fiscal_code: !!paymentIntentMetadata.customer_fiscal_code,
    });
    
    Object.entries(paymentIntentMetadata).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        formData.append(`payment_intent_data[metadata][${key}]`, String(value));
        // B2B DEBUG: Log each metadata field being added
        if (key.includes('b2b') || key.includes('company') || key.includes('B2B') || key.includes('Company')) {
          logInfo('B2BAddingPaymentIntentMetadata', {
            requestId,
            key,
            value: String(value),
            valueType: typeof value,
          });
        }
      } else {
        // B2B DEBUG: Log skipped fields
        if (key.includes('b2b') || key.includes('company') || key.includes('B2B') || key.includes('Company')) {
          logInfo('B2BSkippingPaymentIntentMetadata', {
            requestId,
            key,
            value,
            reason: value === null ? 'null' : value === undefined ? 'undefined' : 'empty_string',
          });
        }
      }
    });
    
    // B2B DEBUG: Verify is_b2b is in formData
    const formDataString = formData.toString();
    const hasIsB2BInFormData = formDataString.includes('payment_intent_data[metadata][is_b2b]');
    const hasCompanyNameInFormData = formDataString.includes('payment_intent_data[metadata][company_name]');
    
    logInfo('B2BPaymentIntentMetadataAfterFormData', {
      requestId,
      isB2B,
      hasIsB2BInFormData,
      hasCompanyNameInFormData,
      formDataLength: formDataString.length,
      formDataPreview: formDataString.substring(0, 500), // First 500 chars for debugging
    });

    logInfo('MetadataPrepared', { 
      requestId, 
      metadataKeys: Object.keys(metadata),
      paymentIntentMetadataKeys: Object.keys(paymentIntentMetadata),
      hasQuotationId: !!quotationId
    });
    
    // B2B DEBUG: Complete metadata dump before sending to Stripe
    logInfo('B2BCompleteMetadataDump', {
      requestId,
      isB2B,
      sessionMetadata: {
        ...metadata,
        // Don't log sensitive data, just structure
      },
      paymentIntentMetadata: {
        ...paymentIntentMetadata,
        // Don't log sensitive data, just structure
      },
      sessionMetadata_is_b2b: metadata.is_b2b || 'NOT_SET',
      paymentIntentMetadata_is_b2b: paymentIntentMetadata.is_b2b,
      sessionMetadata_company_name: (metadata as any).company_name || 'NOT_SET',
      paymentIntentMetadata_company_name: paymentIntentMetadata.company_name || 'NOT_SET',
    });

    logInfo('StripeRequest', { 
      requestId, 
      totalAmountCents, 
      lineItemsCount: lineItems.length,
      hasStripeCustomer: !!stripeCustomerId,
      hasQuotation: !!quotationId,
      customFieldsCount: 0, // NO custom fields - all data from internal checkout
      emailCollectionDisabled: true,
      phoneCollectionDisabled: true,
    });

    // B2B DEBUG: Final check before sending to Stripe
    const finalFormDataString = formData.toString();
    const finalHasIsB2B = finalFormDataString.includes('payment_intent_data[metadata][is_b2b]');
    const finalHasCompanyName = finalFormDataString.includes('payment_intent_data[metadata][company_name]');
    
    logInfo('B2BFinalCheckBeforeStripe', {
      requestId,
      isB2B,
      finalHasIsB2B,
      finalHasCompanyName,
      formDataLength: finalFormDataString.length,
      // Extract all payment_intent_data[metadata] entries for debugging
      paymentIntentMetadataEntries: finalFormDataString
        .split('&')
        .filter(entry => entry.includes('payment_intent_data[metadata]'))
        .map(entry => {
          const [key, value] = entry.split('=');
          return { key: decodeURIComponent(key), value: decodeURIComponent(value || '').substring(0, 50) };
        }),
    });

    // Call Stripe API with form-encoded (required by Stripe)
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.text();
      let errorMessage = `Stripe API error: ${stripeResponse.status}`;
      
      try {
        const errorJson = JSON.parse(errorData);
        errorMessage = errorJson.error?.message || errorMessage;
        logError('StripeAPIError', new Error(errorMessage), { 
          requestId, 
          status: stripeResponse.status, 
          errorData: errorJson 
        });
      } catch {
        logError('StripeAPIError', new Error(errorData), { requestId, status: stripeResponse.status });
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: stripeResponse.status >= 400 && stripeResponse.status < 500 ? stripeResponse.status : 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const session = await stripeResponse.json();

    if (!session.id || !session.url) {
      logError('StripeResponseInvalid', new Error('Invalid Stripe response'), { requestId, session });
      return new Response(
        JSON.stringify({ error: 'Invalid response from Stripe' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    logInfo('CheckoutSessionCreated', { 
      requestId, 
      sessionId: session.id, 
      url: session.url?.substring(0, 50),
      hasQuotation: !!quotationId
    });
    
    // B2B DEBUG: Verify Payment Intent metadata was set correctly
    // Note: We can't directly check Payment Intent here, but we can log what we sent
    if (session.payment_intent) {
      logInfo('B2BCheckoutSessionPaymentIntent', {
        requestId,
        paymentIntentId: session.payment_intent,
        isB2B,
        note: 'Payment Intent metadata should be set. Check Stripe dashboard or webhook logs to verify.',
      });
    } else {
      logInfo('B2BCheckoutSessionPaymentIntent', {
        requestId,
        paymentIntentId: 'NOT_YET_CREATED',
        isB2B,
        note: 'Payment Intent will be created when customer pays. Metadata should be included.',
      });
    }

    // Update quotation with stripe_checkout_session_id (NON-BLOCKING)
    if (quotationId) {
      try {
        logInfo('UpdatingQuotationWithSessionId', { requestId, quotationId, sessionId: session.id });
        
        const { error: updateError } = await supabase
          .from('quotation')
          .update({ stripe_checkout_session_id: session.id })
          .eq('id', quotationId);

        if (updateError) {
          logError('QuotationUpdateError', updateError, { 
            requestId, 
            quotationId,
            sessionId: session.id,
            errorCode: updateError.code,
            errorMessage: updateError.message
          });
          // Continue anyway - update failure should not block checkout
        } else {
          logInfo('QuotationUpdated', { requestId, quotationId, sessionId: session.id });
        }
      } catch (updateException) {
        logError('QuotationUpdateException', updateException, { 
          requestId, 
          quotationId,
          sessionId: session.id
        });
        // Continue anyway - update failure should not block checkout
      }
    }

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    logError('UnexpectedError', error, { requestId });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        requestId, // Include request ID for debugging
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Booking Data Mapper for Odoo
 * 
 * Helper functions to map booking data from Supabase to Odoo format.
 */

import type { BookingDataForOdoo } from './types.ts';

/**
 * Booking record from Supabase (partial structure)
 */
interface SupabaseBooking {
  id: string;
  order_number?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  customer_email: string;
  customer_name?: string | null;
  customer_surname?: string | null;
  customer_phone?: string | null;
  customer_fiscal_code?: string | null;
  customer_address?: string | null;
  product_type: 'experience' | 'class' | 'trip';
  product_id: string;
  product_name?: string | null;
  product_description?: string | null;
  provider_id: string;
  provider_name?: string | null;
  provider_email?: string | null;
  booking_date: string;
  booking_time?: string | null;
  number_of_adults: number;
  number_of_dogs: number;
  total_amount_paid: number;
  currency: string;
  provider_cost_total?: number | null;
  stripe_fee?: number | null;
  internal_margin?: number | null;
  net_revenue?: number | null;
  trip_start_date?: string | null;
  trip_end_date?: string | null;
}

/**
 * Provider record from Supabase (partial structure)
 */
interface SupabaseProvider {
  id: string;
  company_name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

/**
 * Product record from Supabase (partial structure)
 */
interface SupabaseProduct {
  id: string;
  name: string;
  description?: string | null;
}

/**
 * Map Supabase booking data to Odoo format
 * 
 * @param booking - Booking record from Supabase
 * @param provider - Provider record from Supabase (optional, will use booking.provider_name if not provided)
 * @param product - Product record from Supabase (optional, will use booking.product_name if not provided)
 * @returns BookingDataForOdoo formatted for Odoo
 */
export function mapBookingToOdoo(
  booking: SupabaseBooking,
  provider?: SupabaseProvider | null,
  product?: SupabaseProduct | null
): BookingDataForOdoo {
  // Build customer full name
  const firstName = booking.customer_name || null;
  const lastName = booking.customer_surname || null;
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

  // Get provider information
  const providerName = provider?.company_name || booking.provider_name || 'Unknown Provider';
  const providerEmail = provider?.email || booking.provider_email || null;
  const providerContactName = provider?.contact_name || null;
  const providerPhone = provider?.phone || null;

  // Get product information
  const productName = product?.name || booking.product_name || 'Unknown Product';
  const productDescription = product?.description || booking.product_description || null;

  return {
    // Booking identification
    bookingId: booking.id,
    orderNumber: booking.order_number || undefined,
    stripePaymentIntentId: booking.stripe_payment_intent_id || undefined,
    stripeCheckoutSessionId: booking.stripe_checkout_session_id || undefined,

    // Customer information
    customer: {
      email: booking.customer_email,
      firstName: firstName,
      lastName: lastName,
      fullName: fullName,
      phone: booking.customer_phone || null,
      fiscalCode: booking.customer_fiscal_code || null,
      address: booking.customer_address || null,
    },

    // Product/Service information
    product: {
      id: booking.product_id,
      name: productName,
      type: booking.product_type,
      description: productDescription,
    },

    // Provider information
    provider: {
      id: booking.provider_id,
      name: providerName,
      email: providerEmail,
      contactName: providerContactName,
      phone: providerPhone,
    },

    // Booking details
    bookingDate: booking.booking_date,
    bookingTime: booking.booking_time || null,
    numberOfAdults: booking.number_of_adults,
    numberOfDogs: booking.number_of_dogs,

    // Financial data (from booking table)
    totalAmountPaid: booking.total_amount_paid,
    currency: booking.currency,
    providerCostTotal: booking.provider_cost_total ?? null,
    stripeFee: booking.stripe_fee ?? null,
    internalMargin: booking.internal_margin ?? null,
    netRevenue: booking.net_revenue ?? null,

    // Trip-specific fields (if applicable)
    tripStartDate: booking.trip_start_date || null,
    tripEndDate: booking.trip_end_date || null,
  };
}

/**
 * Validate booking data before sending to Odoo
 * 
 * @param bookingData - Booking data to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateBookingDataForOdoo(bookingData: BookingDataForOdoo): string[] {
  const errors: string[] = [];

  // Required fields
  if (!bookingData.bookingId) {
    errors.push('bookingId is required');
  }

  if (!bookingData.customer.email) {
    errors.push('customer.email is required');
  }

  if (!bookingData.product.id) {
    errors.push('product.id is required');
  }

  if (!bookingData.product.name) {
    errors.push('product.name is required');
  }

  if (!bookingData.provider.id) {
    errors.push('provider.id is required');
  }

  if (!bookingData.provider.name) {
    errors.push('provider.name is required');
  }

  if (!bookingData.bookingDate) {
    errors.push('bookingDate is required');
  }

  if (bookingData.numberOfAdults < 1) {
    errors.push('numberOfAdults must be at least 1');
  }

  if (bookingData.numberOfDogs < 0) {
    errors.push('numberOfDogs must be non-negative');
  }

  if (bookingData.totalAmountPaid <= 0) {
    errors.push('totalAmountPaid must be greater than 0');
  }

  if (!bookingData.currency) {
    errors.push('currency is required');
  }

  // Financial data validation (warnings, not errors)
  if (bookingData.providerCostTotal === null) {
    console.warn('[Odoo Mapper] providerCostTotal is null - PO may not be created correctly');
  }

  if (bookingData.stripeFee === null) {
    console.warn('[Odoo Mapper] stripeFee is null - Invoice may not include Stripe fee line');
  }

  if (bookingData.netRevenue === null) {
    console.warn('[Odoo Mapper] netRevenue is null - Financial tracking incomplete');
  }

  return errors;
}


import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as postgres from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

const databaseUrl = Deno.env.get('SUPABASE_DB_URL')!;

const migration1 = `
-- Add product_id column to booking table
ALTER TABLE public.booking 
ADD COLUMN IF NOT EXISTS product_id UUID;

CREATE INDEX IF NOT EXISTS booking_product_id_idx 
ON public.booking (product_id);

COMMENT ON COLUMN public.booking.product_id IS 'UUID of the product (experience, class, or trip) - determines which table to join based on product_type';
`;

const migration2Prep = `
-- Drop all existing versions
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
            FROM pg_proc
            WHERE proname = 'create_booking_transactional'
              AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.create_booking_transactional(%s) CASCADE', r.args);
  END LOOP;
END $$;
`;

const migration2Main = `
-- Recreate with product_id as required parameter
CREATE OR REPLACE FUNCTION public.create_booking_transactional(
  p_idempotency_key UUID,
  p_product_type TEXT,
  p_product_id UUID,
  p_provider_id UUID,
  p_booking_date DATE,
  p_number_of_adults INTEGER,
  p_number_of_dogs INTEGER,
  p_total_amount_paid NUMERIC(10,2),
  p_customer_email TEXT,
  p_customer_name TEXT,
  p_availability_slot_id UUID DEFAULT NULL,
  p_stripe_checkout_session_id TEXT DEFAULT NULL,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_order_number TEXT DEFAULT NULL,
  p_booking_time TIMESTAMPTZ DEFAULT NULL,
  p_trip_start_date DATE DEFAULT NULL,
  p_trip_end_date DATE DEFAULT NULL,
  p_currency TEXT DEFAULT 'EUR',
  p_customer_surname TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_fiscal_code TEXT DEFAULT NULL,
  p_customer_address TEXT DEFAULT NULL,
  p_product_name TEXT DEFAULT NULL,
  p_product_description TEXT DEFAULT NULL,
  p_provider_cost_total NUMERIC(10,2) DEFAULT NULL,
  p_stripe_fee NUMERIC(10,2) DEFAULT NULL,
  p_internal_margin NUMERIC(10,2) DEFAULT NULL,
  p_net_revenue NUMERIC(10,2) DEFAULT NULL
)
RETURNS TABLE (
  booking_id UUID,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
  v_slot RECORD;
  v_available_adults INTEGER;
  v_available_dogs INTEGER;
  v_error_msg TEXT;
  v_product_type_enum public.product_type;
BEGIN
  BEGIN
    v_product_type_enum := p_product_type::public.product_type;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, format('Invalid product_type: %s', p_product_type)::TEXT;
      RETURN;
  END;
  
  IF p_idempotency_key IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Idempotency key is required'::TEXT;
    RETURN;
  END IF;
  
  IF p_product_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Product ID is required'::TEXT;
    RETURN;
  END IF;
  
  SELECT id INTO v_booking_id
  FROM public.booking
  WHERE idempotency_key = p_idempotency_key
  LIMIT 1;
  
  IF v_booking_id IS NOT NULL THEN
    RETURN QUERY SELECT v_booking_id, TRUE, NULL::TEXT;
    RETURN;
  END IF;
  
  IF p_availability_slot_id IS NOT NULL THEN
    SELECT * INTO v_slot
    FROM public.availability_slot
    WHERE id = p_availability_slot_id
    FOR UPDATE;
    
    IF v_slot IS NULL THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Availability slot not found'::TEXT;
      RETURN;
    END IF;
    
    v_available_adults := v_slot.max_adults - v_slot.booked_adults;
    v_available_dogs := v_slot.max_dogs - v_slot.booked_dogs;
    
    IF p_number_of_adults > v_available_adults THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 
        format('Insufficient adult capacity. Available: %s, Requested: %s', 
               v_available_adults, p_number_of_adults)::TEXT;
      RETURN;
    END IF;
    
    IF p_number_of_dogs > v_available_dogs THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 
        format('Insufficient dog capacity. Available: %s, Requested: %s', 
               v_available_dogs, p_number_of_dogs)::TEXT;
      RETURN;
    END IF;
    
    UPDATE public.availability_slot
    SET 
      booked_adults = booked_adults + p_number_of_adults,
      booked_dogs = booked_dogs + p_number_of_dogs,
      updated_at = NOW()
    WHERE id = p_availability_slot_id;
  END IF;
  
  INSERT INTO public.booking (
    idempotency_key, product_type, product_id, provider_id, availability_slot_id,
    stripe_checkout_session_id, stripe_payment_intent_id, order_number, status,
    booking_date, booking_time, trip_start_date, trip_end_date, number_of_adults, number_of_dogs,
    total_amount_paid, currency, customer_email, customer_name, customer_surname, customer_phone,
    customer_fiscal_code, customer_address, product_name, product_description,
    provider_cost_total, stripe_fee, internal_margin, net_revenue
  ) VALUES (
    p_idempotency_key, v_product_type_enum, p_product_id, p_provider_id, p_availability_slot_id,
    p_stripe_checkout_session_id, p_stripe_payment_intent_id, p_order_number, 'confirmed',
    p_booking_date, p_booking_time, p_trip_start_date, p_trip_end_date, p_number_of_adults, p_number_of_dogs,
    p_total_amount_paid, p_currency, p_customer_email, p_customer_name, p_customer_surname, p_customer_phone,
    p_customer_fiscal_code, p_customer_address, p_product_name, p_product_description,
    p_provider_cost_total, p_stripe_fee, p_internal_margin, p_net_revenue
  )
  RETURNING id INTO v_booking_id;
  
  RETURN QUERY SELECT v_booking_id, TRUE, NULL::TEXT;
  
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_booking_id FROM public.booking WHERE idempotency_key = p_idempotency_key LIMIT 1;
    RETURN QUERY SELECT v_booking_id, TRUE, NULL::TEXT;
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
    RETURN QUERY SELECT NULL::UUID, FALSE, v_error_msg;
END;
$$;
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    console.log('Connecting to database...');
    const pool = new postgres.Pool(databaseUrl, 3, true);
    const connection = await pool.connect();

    try {
      console.log('Executing migration 1...');
      await connection.queryObject(migration1);
      console.log('✅ Migration 1 complete');

      console.log('Executing migration 2 prep...');
      await connection.queryObject(migration2Prep);
      console.log('✅ Migration 2 prep complete');

      console.log('Executing migration 2 main...');
      await connection.queryObject(migration2Main);
      console.log('✅ Migration 2 main complete');

      return new Response(JSON.stringify({ 
        success: true,
        message: 'All migrations applied successfully'
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});


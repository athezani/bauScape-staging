-- ============================================
-- Add customer_fiscal_code and customer_address fields to booking table
-- ============================================
-- This migration adds the fiscal code (codice fiscale) and address fields to the booking table
-- to store the customer's tax identification number and address collected during Stripe checkout

-- Add customer_fiscal_code column to booking table
ALTER TABLE IF EXISTS public.booking 
ADD COLUMN IF NOT EXISTS customer_fiscal_code TEXT DEFAULT NULL;

-- Add customer_address column to booking table
ALTER TABLE IF EXISTS public.booking 
ADD COLUMN IF NOT EXISTS customer_address TEXT DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.booking.customer_fiscal_code IS 'Customer fiscal code (codice fiscale) collected during Stripe checkout';
COMMENT ON COLUMN public.booking.customer_address IS 'Customer address (indirizzo) collected during Stripe checkout';

-- Drop the existing function first (if it exists) to avoid signature conflicts
DROP FUNCTION IF EXISTS public.create_booking_transactional CASCADE;

-- Update the create_booking_transactional function to accept and save fiscal code
-- IMPORTANT: All required parameters must come before optional parameters (with DEFAULT)
CREATE FUNCTION public.create_booking_transactional(
  -- Required parameters (no DEFAULT)
  p_idempotency_key UUID,
  p_product_type TEXT,
  p_provider_id UUID,
  p_booking_date DATE,
  p_number_of_adults INTEGER,
  p_number_of_dogs INTEGER,
  p_total_amount_paid NUMERIC(10,2),
  p_customer_email TEXT,
  p_customer_name TEXT,
  -- Optional parameters (all with DEFAULT)
  p_availability_slot_id UUID DEFAULT NULL,
  p_stripe_checkout_session_id TEXT DEFAULT NULL,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_order_number TEXT DEFAULT NULL,
  p_booking_time TIME DEFAULT NULL,
  p_trip_start_date DATE DEFAULT NULL,
  p_trip_end_date DATE DEFAULT NULL,
  p_currency TEXT DEFAULT 'EUR',
  p_customer_surname TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_fiscal_code TEXT DEFAULT NULL,
  p_customer_address TEXT DEFAULT NULL,
  p_product_name TEXT DEFAULT NULL,
  p_product_description TEXT DEFAULT NULL
)
RETURNS TABLE(booking_id UUID, success BOOLEAN, error_message TEXT)
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
  -- Validate product_type enum
  BEGIN
    v_product_type_enum := p_product_type::public.product_type;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, format('Invalid product_type: %s', p_product_type)::TEXT;
      RETURN;
  END;
  
  -- Validate and lock availability slot
  IF p_availability_slot_id IS NOT NULL THEN
    SELECT * INTO v_slot
    FROM public.availability_slot
    WHERE id = p_availability_slot_id
    FOR UPDATE; -- Lock row to prevent race conditions
    
    IF v_slot IS NULL THEN
      RETURN QUERY SELECT NULL::UUID, FALSE, 'Availability slot not found'::TEXT;
      RETURN;
    END IF;
    
    -- Check capacity
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
    
    -- Decrement availability (atomic operation)
    UPDATE public.availability_slot
    SET 
      booked_adults = booked_adults + p_number_of_adults,
      booked_dogs = booked_dogs + p_number_of_dogs,
      updated_at = NOW()
    WHERE id = p_availability_slot_id;
  END IF;
  
  -- Create booking
  INSERT INTO public.booking (
    idempotency_key,
    product_type,
    provider_id,
    availability_slot_id,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    order_number,
    status,
    booking_date,
    booking_time,
    trip_start_date,
    trip_end_date,
    number_of_adults,
    number_of_dogs,
    total_amount_paid,
    currency,
    customer_email,
    customer_name,
    customer_surname,
    customer_phone,
    customer_fiscal_code,
    customer_address,
    product_name,
    product_description
  ) VALUES (
    p_idempotency_key,
    v_product_type_enum,  -- Cast to enum type
    p_provider_id,
    p_availability_slot_id,
    p_stripe_checkout_session_id,
    p_stripe_payment_intent_id,
    p_order_number,
    'confirmed',
    p_booking_date,
    p_booking_time,
    p_trip_start_date,
    p_trip_end_date,
    p_number_of_adults,
    p_number_of_dogs,
    p_total_amount_paid,
    p_currency,
    p_customer_email,
    p_customer_name,
    p_customer_surname,
    p_customer_phone,
    p_customer_fiscal_code,
    p_customer_address,
    p_product_name,
    p_product_description
  )
  RETURNING id INTO v_booking_id;
  
  -- Return success
  RETURN QUERY SELECT v_booking_id, TRUE, NULL::TEXT;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Idempotency key conflict - booking already exists
    SELECT id INTO v_booking_id
    FROM public.booking
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;
    RETURN QUERY SELECT v_booking_id, TRUE, NULL::TEXT;
  WHEN OTHERS THEN
    -- Rollback is automatic in function
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
    RETURN QUERY SELECT NULL::UUID, FALSE, v_error_msg;
END;
$$;

COMMENT ON FUNCTION public.create_booking_transactional IS 
  'Atomically creates a booking and decrements availability. Returns booking_id on success, error on failure. Now includes customer_fiscal_code and customer_address.';


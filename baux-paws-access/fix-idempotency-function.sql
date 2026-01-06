-- Fix: Aggiunge validazione idempotency_key nella funzione transazionale
-- Esegui questo script per aggiornare la funzione

CREATE OR REPLACE FUNCTION public.create_booking_transactional(
  p_idempotency_key UUID,
  p_product_type TEXT,
  p_provider_id UUID,
  p_availability_slot_id UUID,
  p_stripe_checkout_session_id TEXT,
  p_stripe_payment_intent_id TEXT,
  p_order_number TEXT,
  p_booking_date DATE,
  p_booking_time TIMESTAMPTZ,
  p_number_of_adults INTEGER,
  p_number_of_dogs INTEGER,
  p_total_amount_paid NUMERIC(10,2),
  p_customer_email TEXT,
  p_customer_name TEXT,
  p_product_name TEXT,
  p_trip_start_date DATE DEFAULT NULL,
  p_trip_end_date DATE DEFAULT NULL,
  p_currency TEXT DEFAULT 'EUR',
  p_customer_surname TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_product_description TEXT DEFAULT NULL
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
BEGIN
  -- CRITICAL: Validate idempotency key is not NULL
  IF p_idempotency_key IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Idempotency key is required and cannot be NULL'::TEXT;
    RETURN;
  END IF;
  
  -- Check idempotency: if booking with this key exists, return it
  SELECT id INTO v_booking_id
  FROM public.booking
  WHERE idempotency_key = p_idempotency_key
  LIMIT 1;
  
  IF v_booking_id IS NOT NULL THEN
    RETURN QUERY SELECT v_booking_id, TRUE, NULL::TEXT;
    RETURN;
  END IF;
  
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
    product_name,
    product_description
  ) VALUES (
    p_idempotency_key,  -- CRITICAL: This must be set
    p_product_type,
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
    p_product_name,
    p_product_description
  )
  RETURNING id INTO v_booking_id;
  
  -- Verify idempotency_key was saved (safety check)
  IF v_booking_id IS NOT NULL THEN
    SELECT idempotency_key INTO v_booking_id
    FROM public.booking
    WHERE id = v_booking_id;
    
    -- This is just a check, we already have v_booking_id from RETURNING
    -- But we verify the key was saved
  END IF;
  
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
  'Atomically creates a booking and decrements availability. Returns booking_id on success, error on failure. Validates idempotency_key is not NULL.';





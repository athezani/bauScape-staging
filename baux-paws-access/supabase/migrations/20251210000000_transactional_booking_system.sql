-- ============================================
-- Transactional Booking System with Event Emission
-- ============================================
-- This migration creates:
-- 1. Transactional function for atomic booking creation
-- 2. Event table for Odoo integration
-- 3. Trigger to emit events after booking creation
-- 4. Idempotency support via unique constraint
-- ============================================

-- Step 1: Add idempotency_key column to booking table
DO $$
BEGIN
  -- Add column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.booking 
    ADD COLUMN idempotency_key UUID;
    
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'booking_idempotency_key_key'
      AND conrelid = 'public.booking'::regclass
    ) THEN
      ALTER TABLE public.booking 
      ADD CONSTRAINT booking_idempotency_key_key UNIQUE (idempotency_key);
    END IF;
    
    CREATE INDEX IF NOT EXISTS booking_idempotency_key_idx 
    ON public.booking (idempotency_key);
    
    COMMENT ON COLUMN public.booking.idempotency_key IS 'Unique key for idempotent booking creation (prevents duplicate bookings)';
  ELSE
    -- Column exists, but check if unique constraint exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'booking_idempotency_key_key'
      AND conrelid = 'public.booking'::regclass
    ) THEN
      -- Check if there are any duplicate values first
      IF NOT EXISTS (
        SELECT idempotency_key 
        FROM public.booking 
        WHERE idempotency_key IS NOT NULL
        GROUP BY idempotency_key 
        HAVING COUNT(*) > 1
      ) THEN
        ALTER TABLE public.booking 
        ADD CONSTRAINT booking_idempotency_key_key UNIQUE (idempotency_key);
      ELSE
        RAISE NOTICE 'Cannot add unique constraint: duplicate idempotency_key values exist';
      END IF;
    END IF;
  END IF;
END $$;

-- Step 2: Create event table for Odoo integration
CREATE TABLE IF NOT EXISTS public.booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.booking(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'cancelled', 'modified')),
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS booking_events_booking_id_idx 
  ON public.booking_events (booking_id);
CREATE INDEX IF NOT EXISTS booking_events_status_idx 
  ON public.booking_events (status) 
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS booking_events_created_at_idx 
  ON public.booking_events (created_at);

COMMENT ON TABLE public.booking_events IS 'Events emitted for external system integration (e.g., Odoo)';
COMMENT ON COLUMN public.booking_events.event_type IS 'Type of event: created, cancelled, modified';
COMMENT ON COLUMN public.booking_events.event_data IS 'Complete booking data for external system';
COMMENT ON COLUMN public.booking_events.status IS 'Event processing status';
COMMENT ON COLUMN public.booking_events.retry_count IS 'Number of retry attempts for failed events';

-- Step 3: Enable RLS on booking_events
DO $$
BEGIN
  ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN
    -- RLS might already be enabled, ignore error
    NULL;
END $$;

-- Only service role can access events (for processing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'booking_events' 
    AND policyname = 'Service role can manage booking events'
  ) THEN
    CREATE POLICY "Service role can manage booking events"
    ON public.booking_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Step 4: Create transactional function for booking creation
-- This function atomically:
-- 1. Checks availability
-- 2. Decrements availability slot
-- 3. Creates booking
-- 4. Returns booking data
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
    p_idempotency_key,
    p_product_type::public.product_type,  -- Cast to enum type
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
  'Atomically creates a booking and decrements availability. Returns booking_id on success, error on failure.';

-- Step 5: Create function to emit booking event
CREATE OR REPLACE FUNCTION public.emit_booking_event(
  p_booking_id UUID,
  p_event_type TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_event_id UUID;
  v_event_data JSONB;
BEGIN
  -- Fetch complete booking data
  SELECT 
    b.*,
    jsonb_build_object(
      'id', b.id,
      'product_type', b.product_type,
      'provider_id', b.provider_id,
      'availability_slot_id', b.availability_slot_id,
      'stripe_checkout_session_id', b.stripe_checkout_session_id,
      'stripe_payment_intent_id', b.stripe_payment_intent_id,
      'order_number', b.order_number,
      'status', b.status,
      'booking_date', b.booking_date,
      'booking_time', b.booking_time,
      'trip_start_date', b.trip_start_date,
      'trip_end_date', b.trip_end_date,
      'number_of_adults', b.number_of_adults,
      'number_of_dogs', b.number_of_dogs,
      'total_amount_paid', b.total_amount_paid,
      'currency', b.currency,
      'customer_email', b.customer_email,
      'customer_name', b.customer_name,
      'customer_surname', b.customer_surname,
      'customer_phone', b.customer_phone,
      'product_name', b.product_name,
      'product_description', b.product_description,
      'created_at', b.created_at,
      'updated_at', b.updated_at
    ) as booking_data
  INTO v_booking
  FROM public.booking b
  WHERE b.id = p_booking_id;
  
  IF v_booking IS NULL THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;
  
  -- Create event
  INSERT INTO public.booking_events (
    booking_id,
    event_type,
    event_data,
    status
  ) VALUES (
    p_booking_id,
    p_event_type,
    v_booking.booking_data,
    'pending'
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.emit_booking_event IS 
  'Emits an event for external system integration (Odoo). Returns event_id.';

-- Step 6: Create trigger to automatically emit event on booking creation
CREATE OR REPLACE FUNCTION public.auto_emit_booking_created_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Emit event for new confirmed bookings
  IF NEW.status = 'confirmed' THEN
    PERFORM public.emit_booking_event(NEW.id, 'created');
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS booking_created_emit_event ON public.booking;

-- Create trigger
CREATE TRIGGER booking_created_emit_event
AFTER INSERT ON public.booking
FOR EACH ROW
WHEN (NEW.status = 'confirmed')
EXECUTE FUNCTION public.auto_emit_booking_created_event();

COMMENT ON TRIGGER booking_created_emit_event ON public.booking IS 
  'Automatically emits a created event when a confirmed booking is created';

-- Step 7: Disable existing trigger to prevent double-counting
-- The transactional function already handles availability decrement atomically,
-- so we disable the old trigger to prevent double-counting
DO $$
BEGIN
  -- Disable the trigger that auto-updates availability
  -- The transactional function handles this now
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'booking_created_update_availability'
  ) THEN
    ALTER TABLE public.booking 
    DISABLE TRIGGER booking_created_update_availability;
    RAISE NOTICE 'Disabled booking_created_update_availability trigger (handled by transactional function)';
  END IF;
  
  -- Also disable for bookings table (plural) if it exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'bookings_created_update_availability'
  ) THEN
    ALTER TABLE public.bookings 
    DISABLE TRIGGER bookings_created_update_availability;
    RAISE NOTICE 'Disabled bookings_created_update_availability trigger (handled by transactional function)';
  END IF;
END $$;

-- Note: The old trigger function update_availability_on_booking() is kept
-- for backward compatibility but is now disabled. If you need to use the
-- old non-transactional approach, you can re-enable the trigger.

-- Step 8: Add unique constraint on stripe_checkout_session_id for additional idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'booking_stripe_session_unique'
    AND conrelid = 'public.booking'::regclass
  ) THEN
    -- Check if there are any duplicate values first
    IF NOT EXISTS (
      SELECT stripe_checkout_session_id 
      FROM public.booking 
      WHERE stripe_checkout_session_id IS NOT NULL
      GROUP BY stripe_checkout_session_id 
      HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE public.booking 
      ADD CONSTRAINT booking_stripe_session_unique 
      UNIQUE (stripe_checkout_session_id);
    ELSE
      RAISE NOTICE 'Cannot add unique constraint: duplicate stripe_checkout_session_id values exist';
    END IF;
  END IF;
END $$;


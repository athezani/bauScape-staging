-- ============================================
-- Restructure booking table
-- ============================================
-- This migration:
-- 1. Removes obsolete columns: shopify_order_id, total_amount, event_type, event_id, end_date
-- 2. Changes booking_time from TIME to TIMESTAMPTZ to store when the booking was made
-- 3. Ensures trip_start_date and trip_end_date exist and are properly configured
-- ============================================

-- Step 1: Remove obsolete columns
DO $$
BEGIN
  -- Remove shopify_order_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'shopify_order_id'
  ) THEN
    ALTER TABLE public.booking DROP COLUMN shopify_order_id;
    RAISE NOTICE 'Dropped column shopify_order_id';
  END IF;

  -- Remove total_amount if it exists (we use total_amount_paid instead)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE public.booking DROP COLUMN total_amount;
    RAISE NOTICE 'Dropped column total_amount';
  END IF;

  -- Remove event_type if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'event_type'
  ) THEN
    ALTER TABLE public.booking DROP COLUMN event_type;
    RAISE NOTICE 'Dropped column event_type';
  END IF;

  -- Remove event_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'event_id'
  ) THEN
    ALTER TABLE public.booking DROP COLUMN event_id;
    RAISE NOTICE 'Dropped column event_id';
  END IF;

  -- Remove end_date if it exists (we use trip_end_date instead)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'end_date'
  ) THEN
    ALTER TABLE public.booking DROP COLUMN end_date;
    RAISE NOTICE 'Dropped column end_date';
  END IF;
END $$;

-- Step 2: Change booking_time from TIME to TIMESTAMPTZ
-- This will store the exact date and time when the booking was made
DO $$
BEGIN
  -- Check current type of booking_time
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'booking_time'
  ) THEN
    -- Check if it's already TIMESTAMPTZ
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'booking' 
      AND column_name = 'booking_time'
      AND data_type = 'timestamp with time zone'
    ) THEN
      RAISE NOTICE 'booking_time is already TIMESTAMPTZ';
    ELSE
      -- Convert TIME to TIMESTAMPTZ
      -- For existing records, we'll set booking_time to created_at if available
      -- Otherwise, we'll use NOW() as fallback
      ALTER TABLE public.booking 
      ALTER COLUMN booking_time TYPE TIMESTAMPTZ 
      USING CASE 
        WHEN booking_time IS NOT NULL AND created_at IS NOT NULL THEN
          -- Combine booking_date with booking_time (if it was a TIME)
          (booking_date::text || ' ' || booking_time::text)::TIMESTAMPTZ
        WHEN created_at IS NOT NULL THEN
          created_at
        ELSE
          NOW()
      END;
      
      -- Set default to NOW() for new bookings
      ALTER TABLE public.booking 
      ALTER COLUMN booking_time SET DEFAULT NOW();
      
      RAISE NOTICE 'Converted booking_time from TIME to TIMESTAMPTZ';
    END IF;
  ELSE
    -- Column doesn't exist, create it as TIMESTAMPTZ
    ALTER TABLE public.booking 
    ADD COLUMN booking_time TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Created booking_time as TIMESTAMPTZ';
  END IF;
END $$;

-- Step 3: Ensure trip_start_date and trip_end_date exist
DO $$
BEGIN
  -- Add trip_start_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'trip_start_date'
  ) THEN
    ALTER TABLE public.booking 
    ADD COLUMN trip_start_date DATE DEFAULT NULL;
    RAISE NOTICE 'Added trip_start_date column';
  END IF;

  -- Add trip_end_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'trip_end_date'
  ) THEN
    ALTER TABLE public.booking 
    ADD COLUMN trip_end_date DATE DEFAULT NULL;
    RAISE NOTICE 'Added trip_end_date column';
  END IF;
END $$;

-- Step 4: Update indexes
-- Drop old index on booking_date and booking_time if it exists (booking_time is now TIMESTAMPTZ)
DROP INDEX IF EXISTS public.booking_datetime_idx;

-- Create new index on booking_time (now TIMESTAMPTZ)
CREATE INDEX IF NOT EXISTS booking_time_idx ON public.booking (booking_time);

-- Create index on trip dates for trip bookings
CREATE INDEX IF NOT EXISTS booking_trip_dates_idx ON public.booking (trip_start_date, trip_end_date) 
WHERE trip_start_date IS NOT NULL;

-- Step 5: Update comments
COMMENT ON COLUMN public.booking.booking_time IS 'Date and time when the booking was made (TIMESTAMPTZ)';
COMMENT ON COLUMN public.booking.trip_start_date IS 'Start date of the trip product (for trip bookings)';
COMMENT ON COLUMN public.booking.trip_end_date IS 'End date of the trip product (for trip bookings)';

DO $$
BEGIN
  RAISE NOTICE 'Booking table restructured successfully!';
END $$;


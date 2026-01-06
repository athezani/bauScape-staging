-- ============================================
-- Add Financial Tracking Fields to Booking Table
-- ============================================
-- This migration adds:
-- 1. provider_cost_total: Total provider cost for this transaction
-- 2. stripe_fee: Actual Stripe fee for this transaction
-- 3. internal_margin: Internal margin (actual profit) = total_amount_paid - provider_cost_total - stripe_fee
-- 4. net_revenue: Net revenue (same as internal_margin for clarity)
-- ============================================

DO $$
BEGIN
  -- Add provider_cost_total
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'provider_cost_total'
  ) THEN
    ALTER TABLE public.booking 
    ADD COLUMN provider_cost_total NUMERIC(10,2) DEFAULT NULL 
    CHECK (provider_cost_total IS NULL OR provider_cost_total >= 0);
    RAISE NOTICE 'Added provider_cost_total to booking table';
  END IF;

  -- Add stripe_fee
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'stripe_fee'
  ) THEN
    ALTER TABLE public.booking 
    ADD COLUMN stripe_fee NUMERIC(10,2) DEFAULT NULL 
    CHECK (stripe_fee IS NULL OR stripe_fee >= 0);
    RAISE NOTICE 'Added stripe_fee to booking table';
  END IF;

  -- Add internal_margin
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'internal_margin'
  ) THEN
    ALTER TABLE public.booking 
    ADD COLUMN internal_margin NUMERIC(10,2) DEFAULT NULL;
    RAISE NOTICE 'Added internal_margin to booking table';
  END IF;

  -- Add net_revenue
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'net_revenue'
  ) THEN
    ALTER TABLE public.booking 
    ADD COLUMN net_revenue NUMERIC(10,2) DEFAULT NULL;
    RAISE NOTICE 'Added net_revenue to booking table';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.booking.provider_cost_total IS 'Total provider cost for this transaction (cost_adult * num_adults + cost_dog * num_dogs)';
COMMENT ON COLUMN public.booking.stripe_fee IS 'Actual Stripe fee charged for this transaction (retrieved from Stripe API)';
COMMENT ON COLUMN public.booking.internal_margin IS 'Internal margin = total_amount_paid - provider_cost_total - stripe_fee (actual profit)';
COMMENT ON COLUMN public.booking.net_revenue IS 'Net revenue (same as internal_margin for clarity)';

DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added financial tracking fields to booking table';
END $$;


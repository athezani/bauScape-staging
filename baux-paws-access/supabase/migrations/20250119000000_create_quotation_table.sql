-- ============================================
-- CREATE QUOTATION TABLE
-- ============================================
-- This migration creates the quotation table to store customer data
-- collected in the internal checkout before redirecting to Stripe.
-- 
-- Purpose:
-- - Persist customer data even if payment is abandoned
-- - Track quotation status (quote -> booking)
-- - Reconcile Stripe payments with internal quotations
-- ============================================

-- Step 1: Ensure set_updated_at function exists (used by triggers)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Step 2: Create quotation table
CREATE TABLE IF NOT EXISTS public.quotation (
  -- Identificatori
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'quote' CHECK (status IN ('quote', 'booking')),
  booking_id UUID REFERENCES public.booking(id) ON DELETE SET NULL,
  
  -- Dati Cliente (TUTTI i dati raccolti nel checkout interno)
  customer_name TEXT NOT NULL,
  customer_surname TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL, -- Obbligatorio
  customer_fiscal_code TEXT, -- Nullable, validazione non bloccante
  customer_address_line1 TEXT NOT NULL, -- Via/Indirizzo
  customer_address_city TEXT NOT NULL, -- Città
  customer_address_postal_code TEXT NOT NULL, -- CAP
  customer_address_country TEXT NOT NULL DEFAULT 'IT', -- Paese (default IT)
  
  -- Dati Prodotto e Prenotazione
  product_id UUID NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('experience', 'class', 'trip')),
  product_name TEXT NOT NULL,
  availability_slot_id UUID,
  booking_date DATE NOT NULL,
  booking_time TIME, -- Nullable (time slot dell'attività, non quando è stata fatta la prenotazione)
  
  -- Quantità e Prezzo
  guests INTEGER NOT NULL CHECK (guests >= 0),
  dogs INTEGER NOT NULL CHECK (dogs >= 0),
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount > 0),
  
  -- Stripe Reference (popolato dopo creazione session)
  stripe_checkout_session_id TEXT, -- Nullable, popolato dopo redirect
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS quotation_status_idx ON public.quotation(status);
CREATE INDEX IF NOT EXISTS quotation_booking_id_idx ON public.quotation(booking_id);
CREATE INDEX IF NOT EXISTS quotation_customer_email_idx ON public.quotation(customer_email);
CREATE INDEX IF NOT EXISTS quotation_stripe_session_idx ON public.quotation(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS quotation_created_at_idx ON public.quotation(created_at);
CREATE INDEX IF NOT EXISTS quotation_product_idx ON public.quotation(product_type, product_id);
CREATE INDEX IF NOT EXISTS quotation_availability_slot_idx ON public.quotation(availability_slot_id);

-- Step 4: Create trigger for updated_at
DROP TRIGGER IF EXISTS quotation_set_updated_at ON public.quotation;
CREATE TRIGGER quotation_set_updated_at
BEFORE UPDATE ON public.quotation
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Step 5: Add comments for documentation
COMMENT ON TABLE public.quotation IS 'Stores customer data collected in internal checkout before Stripe payment. Tracks quotation status and reconciles with bookings.';
COMMENT ON COLUMN public.quotation.status IS 'Status: quote (created, payment pending) or booking (payment completed)';
COMMENT ON COLUMN public.quotation.booking_id IS 'Reference to booking created after successful payment. NULL until payment is completed.';
COMMENT ON COLUMN public.quotation.customer_fiscal_code IS 'Italian fiscal code. Validation is non-blocking (warning only).';
COMMENT ON COLUMN public.quotation.customer_address_country IS 'Country code (default: IT). Used for Stripe address format.';
COMMENT ON COLUMN public.quotation.stripe_checkout_session_id IS 'Stripe checkout session ID. Populated after session creation, before redirect.';
COMMENT ON COLUMN public.quotation.booking_time IS 'Time slot of the activity (from availability_slot), not when booking was made.';

-- Step 6: Enable RLS (Row Level Security) - quotations are internal, no public access needed
ALTER TABLE public.quotation ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for Edge Functions)
CREATE POLICY quotation_service_role_all
  ON public.quotation
  FOR ALL
  USING (auth.role() = 'service_role');

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Quotation table created successfully!';
END $$;


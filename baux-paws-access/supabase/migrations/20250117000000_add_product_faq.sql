-- ============================================
-- Add Product FAQ System
-- ============================================
-- This migration adds:
-- 1. faq: Table for reusable FAQ questions and answers
-- 2. product_faq: Table for associating FAQs with products (with ordering)
-- These tables support all product types (experience, class, trip)
-- ============================================

-- Step 1: Create faq table
CREATE TABLE IF NOT EXISTS public.faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL CHECK (LENGTH(question) > 0),
  answer TEXT NOT NULL CHECK (LENGTH(answer) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Create product_faq table (join table with ordering)
CREATE TABLE IF NOT EXISTS public.product_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('experience', 'class', 'trip')),
  faq_id UUID NOT NULL REFERENCES public.faq(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique FAQ per product (no duplicates)
  CONSTRAINT product_faq_unique_product_faq UNIQUE (product_id, product_type, faq_id)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_faq_created_at 
  ON public.faq(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_faq_product 
  ON public.product_faq(product_id, product_type);

CREATE INDEX IF NOT EXISTS idx_product_faq_faq 
  ON public.product_faq(faq_id);

CREATE INDEX IF NOT EXISTS idx_product_faq_order 
  ON public.product_faq(product_id, product_type, order_index);

-- Step 4: Add updated_at triggers
CREATE OR REPLACE FUNCTION update_faq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER faq_updated_at
  BEFORE UPDATE ON public.faq
  FOR EACH ROW
  EXECUTE FUNCTION update_faq_updated_at();

CREATE OR REPLACE FUNCTION update_product_faq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_faq_updated_at
  BEFORE UPDATE ON public.product_faq
  FOR EACH ROW
  EXECUTE FUNCTION update_product_faq_updated_at();

-- Step 5: Enable RLS
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_faq ENABLE ROW LEVEL SECURITY;

-- RLS Policies for faq table
-- Policy: Public read access (for ecommerce)
CREATE POLICY faq_public_read
  ON public.faq
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Only admins can insert/update/delete FAQs
CREATE POLICY faq_admin_all
  ON public.faq
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for product_faq table
-- Policy: Public read access for active products (for ecommerce)
CREATE POLICY product_faq_public_read_active
  ON public.product_faq
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.experience
      WHERE experience.id = product_faq.product_id
      AND experience.active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.class
      WHERE class.id = product_faq.product_id
      AND class.active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip
      WHERE trip.id = product_faq.product_id
      AND trip.active = true
    )
    OR
    -- Allow providers to read their own products (even if inactive)
    EXISTS (
      SELECT 1 FROM public.experience
      WHERE experience.id = product_faq.product_id
      AND experience.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.class
      WHERE class.id = product_faq.product_id
      AND class.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip
      WHERE trip.id = product_faq.product_id
      AND trip.provider_id::text = auth.uid()::text
    )
  );

-- Policy: Only admins can manage product FAQ associations
CREATE POLICY product_faq_admin_all
  ON public.product_faq
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Step 6: Add comments for documentation
COMMENT ON TABLE public.faq IS 'Stores reusable FAQ questions and answers that can be associated with multiple products.';
COMMENT ON TABLE public.product_faq IS 'Join table associating FAQs with products. Supports ordering via order_index.';
COMMENT ON COLUMN public.faq.question IS 'The FAQ question text.';
COMMENT ON COLUMN public.faq.answer IS 'The FAQ answer text.';
COMMENT ON COLUMN public.product_faq.order_index IS 'Order index for sorting FAQs within a product. Lower values appear first.';
COMMENT ON COLUMN public.product_faq.product_type IS 'Type of product: experience, class, or trip.';

DO $$
BEGIN
  RAISE NOTICE 'Migration completed: product FAQ system added successfully!';
END $$;


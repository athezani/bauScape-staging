-- ============================================
-- Add Product Program System
-- ============================================
-- This migration adds:
-- 1. trip_program_day: Table for program days (one per day, with optional introduction)
-- 2. trip_program_item: Table for program activities (one per activity, linked to a day)
-- These tables support all product types (experience, class, trip)
-- ============================================

-- Step 1: Create trip_program_day table
CREATE TABLE IF NOT EXISTS public.trip_program_day (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('experience', 'class', 'trip')),
  day_number INTEGER NOT NULL CHECK (day_number > 0),
  introduction TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique day per product
  CONSTRAINT trip_program_day_unique_product_day UNIQUE (product_id, product_type, day_number)
);

-- Step 2: Create trip_program_item table
CREATE TABLE IF NOT EXISTS public.trip_program_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL REFERENCES public.trip_program_day(id) ON DELETE CASCADE,
  activity_text TEXT NOT NULL CHECK (LENGTH(activity_text) > 0),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_program_day_product 
  ON public.trip_program_day(product_id, product_type);

CREATE INDEX IF NOT EXISTS idx_trip_program_day_product_day 
  ON public.trip_program_day(product_id, product_type, day_number);

CREATE INDEX IF NOT EXISTS idx_trip_program_item_day 
  ON public.trip_program_item(day_id);

CREATE INDEX IF NOT EXISTS idx_trip_program_item_order 
  ON public.trip_program_item(day_id, order_index);

-- Step 4: Add updated_at trigger for trip_program_day
CREATE OR REPLACE FUNCTION update_trip_program_day_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trip_program_day_updated_at
  BEFORE UPDATE ON public.trip_program_day
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_program_day_updated_at();

-- Step 5: Add updated_at trigger for trip_program_item
CREATE OR REPLACE FUNCTION update_trip_program_item_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trip_program_item_updated_at
  BEFORE UPDATE ON public.trip_program_item
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_program_item_updated_at();

-- Step 6: Add RLS policies
ALTER TABLE public.trip_program_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_program_item ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access for active products (for ecommerce)
CREATE POLICY trip_program_day_public_read_active
  ON public.trip_program_day
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.experience
      WHERE experience.id = trip_program_day.product_id
      AND experience.active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.class
      WHERE class.id = trip_program_day.product_id
      AND class.active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip
      WHERE trip.id = trip_program_day.product_id
      AND trip.active = true
    )
    OR
    -- Allow providers to read their own products (even if inactive)
    EXISTS (
      SELECT 1 FROM public.experience
      WHERE experience.id = trip_program_day.product_id
      AND experience.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.class
      WHERE class.id = trip_program_day.product_id
      AND class.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip
      WHERE trip.id = trip_program_day.product_id
      AND trip.provider_id::text = auth.uid()::text
    )
  );

-- Policy: Users can insert program days for their own products
CREATE POLICY trip_program_day_insert_own_provider
  ON public.trip_program_day
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.experience
      WHERE experience.id = trip_program_day.product_id
      AND experience.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.class
      WHERE class.id = trip_program_day.product_id
      AND class.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip
      WHERE trip.id = trip_program_day.product_id
      AND trip.provider_id::text = auth.uid()::text
    )
  );

-- Policy: Users can update program days for their own products
CREATE POLICY trip_program_day_update_own_provider
  ON public.trip_program_day
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.experience
      WHERE experience.id = trip_program_day.product_id
      AND experience.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.class
      WHERE class.id = trip_program_day.product_id
      AND class.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip
      WHERE trip.id = trip_program_day.product_id
      AND trip.provider_id::text = auth.uid()::text
    )
  );

-- Policy: Users can delete program days for their own products
CREATE POLICY trip_program_day_delete_own_provider
  ON public.trip_program_day
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.experience
      WHERE experience.id = trip_program_day.product_id
      AND experience.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.class
      WHERE class.id = trip_program_day.product_id
      AND class.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip
      WHERE trip.id = trip_program_day.product_id
      AND trip.provider_id::text = auth.uid()::text
    )
  );

-- Policy: Public read access for program items of active products
CREATE POLICY trip_program_item_public_read_active
  ON public.trip_program_item
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_program_day
      JOIN public.experience ON experience.id = trip_program_day.product_id
      WHERE trip_program_day.id = trip_program_item.day_id
      AND experience.active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip_program_day
      JOIN public.class ON class.id = trip_program_day.product_id
      WHERE trip_program_day.id = trip_program_item.day_id
      AND class.active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip_program_day
      JOIN public.trip ON trip.id = trip_program_day.product_id
      WHERE trip_program_day.id = trip_program_item.day_id
      AND trip.active = true
    )
    OR
    -- Allow providers to read their own products (even if inactive)
    EXISTS (
      SELECT 1 FROM public.trip_program_day
      JOIN public.experience ON experience.id = trip_program_day.product_id
      WHERE trip_program_day.id = trip_program_item.day_id
      AND experience.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip_program_day
      JOIN public.class ON class.id = trip_program_day.product_id
      WHERE trip_program_day.id = trip_program_item.day_id
      AND class.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip_program_day
      JOIN public.trip ON trip.id = trip_program_day.product_id
      WHERE trip_program_day.id = trip_program_item.day_id
      AND trip.provider_id::text = auth.uid()::text
    )
  );

-- Policy: Users can insert program items for their own products
CREATE POLICY trip_program_item_insert_own_provider
  ON public.trip_program_item
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_program_day
      JOIN public.experience ON experience.id = trip_program_day.product_id
      WHERE trip_program_day.id = trip_program_item.day_id
      AND experience.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip_program_day
      JOIN public.class ON class.id = trip_program_day.product_id
      WHERE trip_program_day.id = trip_program_item.day_id
      AND class.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip_program_day
      JOIN public.trip ON trip.id = trip_program_day.product_id
      WHERE trip_program_day.id = trip_program_item.day_id
      AND trip.provider_id::text = auth.uid()::text
    )
  );

-- Policy: Users can update program items for their own products
CREATE POLICY trip_program_item_update_own_provider
  ON public.trip_program_item
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_program_day
      JOIN public.experience ON experience.id = trip_program_day.product_id
      WHERE trip_program_day.id = trip_program_item.day_id
      AND experience.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip_program_day
      JOIN public.class ON class.id = trip_program_day.product_id
      WHERE trip_program_day.id = trip_program_item.day_id
      AND class.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip_program_day
      JOIN public.trip ON trip.id = trip_program_day.product_id
      WHERE trip_program_day.id = trip_program_item.day_id
      AND trip.provider_id::text = auth.uid()::text
    )
  );

-- Policy: Users can delete program items for their own products
CREATE POLICY trip_program_item_delete_own_provider
  ON public.trip_program_item
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_program_day
      JOIN public.experience ON experience.id = trip_program_day.product_id
      WHERE trip_program_day.id = trip_program_item.day_id
      AND experience.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip_program_day
      JOIN public.class ON class.id = trip_program_day.product_id
      WHERE trip_program_day.id = trip_program_item.day_id
      AND class.provider_id::text = auth.uid()::text
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trip_program_day
      JOIN public.trip ON trip.id = trip_program_day.product_id
      WHERE trip_program_day.id = trip_program_item.day_id
      AND trip.provider_id::text = auth.uid()::text
    )
  );


-- Step 8: Add comments for documentation
COMMENT ON TABLE public.trip_program_day IS 'Stores program days for products (experience, class, trip). Each day can have an optional introduction text.';
COMMENT ON TABLE public.trip_program_item IS 'Stores program activities for each day. Activities are displayed as bullet points.';
COMMENT ON COLUMN public.trip_program_day.day_number IS 'Day number (1-based). For trips, corresponds to duration_days. For experiences/classes, always 1.';
COMMENT ON COLUMN public.trip_program_day.introduction IS 'Optional introduction text for the day, displayed before the activity list.';
COMMENT ON COLUMN public.trip_program_item.activity_text IS 'Text description of the activity.';
COMMENT ON COLUMN public.trip_program_item.order_index IS 'Order index for sorting activities within a day.';

DO $$
BEGIN
  RAISE NOTICE 'Migration completed: product program system added successfully!';
END $$;


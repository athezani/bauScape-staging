-- ============================================================
-- PRODUCT IMAGES MIGRATION - COPY AND PASTE THIS INTO SUPABASE SQL EDITOR
-- ============================================================
-- Instructions:
-- 1. Go to: https://supabase.com/dashboard
-- 2. Select project: zyonwzilijgnnnmhxvbo
-- 3. Go to: SQL Editor
-- 4. Click: "New query"
-- 5. Copy ALL the SQL below (from CREATE TABLE to the last COMMENT)
-- 6. Paste into the SQL Editor
-- 7. Click: "Run" (or press Cmd/Ctrl + Enter)
-- 8. Verify success message
-- ============================================================

-- Create product_images table for secondary product images
-- This table stores additional images for products (1-10 images per product)
-- with display order control

CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('class', 'experience', 'trip')),
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure display_order is unique per product
  CONSTRAINT unique_product_image_order UNIQUE (product_id, product_type, display_order)
);

-- Create indexes for performance
CREATE INDEX idx_product_images_product ON public.product_images(product_id, product_type);
CREATE INDEX idx_product_images_display_order ON public.product_images(product_id, product_type, display_order);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_product_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_images_updated_at
  BEFORE UPDATE ON public.product_images
  FOR EACH ROW
  EXECUTE FUNCTION update_product_images_updated_at();

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Providers can view images of their own products
CREATE POLICY "Providers can view their product images"
  ON public.product_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.provider p
      WHERE (
        (product_type = 'class' AND EXISTS (SELECT 1 FROM public.class c WHERE c.id = product_id AND c.provider_id = p.id))
        OR
        (product_type = 'experience' AND EXISTS (SELECT 1 FROM public.experience e WHERE e.id = product_id AND e.provider_id = p.id))
        OR
        (product_type = 'trip' AND EXISTS (SELECT 1 FROM public.trip t WHERE t.id = product_id AND t.provider_id = p.id))
      )
      AND p.id = auth.uid()::text
    )
  );

-- RLS Policy: Providers can insert images for their own products
CREATE POLICY "Providers can insert their product images"
  ON public.product_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.provider p
      WHERE (
        (product_type = 'class' AND EXISTS (SELECT 1 FROM public.class c WHERE c.id = product_id AND c.provider_id = p.id))
        OR
        (product_type = 'experience' AND EXISTS (SELECT 1 FROM public.experience e WHERE e.id = product_id AND e.provider_id = p.id))
        OR
        (product_type = 'trip' AND EXISTS (SELECT 1 FROM public.trip t WHERE t.id = product_id AND t.provider_id = p.id))
      )
      AND p.id = auth.uid()::text
    )
  );

-- RLS Policy: Providers can update images of their own products
CREATE POLICY "Providers can update their product images"
  ON public.product_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.provider p
      WHERE (
        (product_type = 'class' AND EXISTS (SELECT 1 FROM public.class c WHERE c.id = product_id AND c.provider_id = p.id))
        OR
        (product_type = 'experience' AND EXISTS (SELECT 1 FROM public.experience e WHERE e.id = product_id AND e.provider_id = p.id))
        OR
        (product_type = 'trip' AND EXISTS (SELECT 1 FROM public.trip t WHERE t.id = product_id AND t.provider_id = p.id))
      )
      AND p.id = auth.uid()::text
    )
  );

-- RLS Policy: Providers can delete images of their own products
CREATE POLICY "Providers can delete their product images"
  ON public.product_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.provider p
      WHERE (
        (product_type = 'class' AND EXISTS (SELECT 1 FROM public.class c WHERE c.id = product_id AND c.provider_id = p.id))
        OR
        (product_type = 'experience' AND EXISTS (SELECT 1 FROM public.experience e WHERE e.id = product_id AND e.provider_id = p.id))
        OR
        (product_type = 'trip' AND EXISTS (SELECT 1 FROM public.trip t WHERE t.id = product_id AND t.provider_id = p.id))
      )
      AND p.id = auth.uid()::text
    )
  );

-- RLS Policy: Public can view all product images (for ecommerce)
CREATE POLICY "Public can view product images"
  ON public.product_images
  FOR SELECT
  USING (true);

-- Add comment
COMMENT ON TABLE public.product_images IS 'Stores secondary images for products (1-10 images per product) with display order';
COMMENT ON COLUMN public.product_images.display_order IS 'Order in which images should be displayed (0-based, lower numbers first)';
COMMENT ON COLUMN public.product_images.image_url IS 'URL of the image stored in Supabase Storage';

-- ============================================================
-- END OF MIGRATION
-- ============================================================


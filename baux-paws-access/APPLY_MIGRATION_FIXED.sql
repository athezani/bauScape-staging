-- ============================================================
-- PRODUCT IMAGES MIGRATION - FIXED VERSION
-- Copy and paste this into Supabase SQL Editor
-- ============================================================

-- Create product_images table
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('class', 'experience', 'trip')),
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_product_image_order UNIQUE (product_id, product_type, display_order)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id, product_type);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON public.product_images(product_id, product_type, display_order);

-- Create function for updated_at trigger
CREATE OR REPLACE FUNCTION update_product_images_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS update_product_images_updated_at ON public.product_images;
CREATE TRIGGER update_product_images_updated_at
  BEFORE UPDATE ON public.product_images
  FOR EACH ROW
  EXECUTE FUNCTION update_product_images_updated_at();

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Providers can view their product images" ON public.product_images;
DROP POLICY IF EXISTS "Providers can insert their product images" ON public.product_images;
DROP POLICY IF EXISTS "Providers can update their product images" ON public.product_images;
DROP POLICY IF EXISTS "Providers can delete their product images" ON public.product_images;
DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;

-- RLS Policy: Providers can view images of their own products
CREATE POLICY "Providers can view their product images"
  ON public.product_images
  FOR SELECT
  USING (
    (product_type = 'class' AND EXISTS (SELECT 1 FROM public.class c WHERE c.id = product_id AND c.provider_id = auth.uid()))
    OR
    (product_type = 'experience' AND EXISTS (SELECT 1 FROM public.experience e WHERE e.id = product_id AND e.provider_id = auth.uid()))
    OR
    (product_type = 'trip' AND EXISTS (SELECT 1 FROM public.trip t WHERE t.id = product_id AND t.provider_id = auth.uid()))
  );

-- RLS Policy: Providers can insert images for their own products
CREATE POLICY "Providers can insert their product images"
  ON public.product_images
  FOR INSERT
  WITH CHECK (
    (product_type = 'class' AND EXISTS (SELECT 1 FROM public.class c WHERE c.id = product_id AND c.provider_id = auth.uid()))
    OR
    (product_type = 'experience' AND EXISTS (SELECT 1 FROM public.experience e WHERE e.id = product_id AND e.provider_id = auth.uid()))
    OR
    (product_type = 'trip' AND EXISTS (SELECT 1 FROM public.trip t WHERE t.id = product_id AND t.provider_id = auth.uid()))
  );

-- RLS Policy: Providers can update images of their own products
CREATE POLICY "Providers can update their product images"
  ON public.product_images
  FOR UPDATE
  USING (
    (product_type = 'class' AND EXISTS (SELECT 1 FROM public.class c WHERE c.id = product_id AND c.provider_id = auth.uid()))
    OR
    (product_type = 'experience' AND EXISTS (SELECT 1 FROM public.experience e WHERE e.id = product_id AND e.provider_id = auth.uid()))
    OR
    (product_type = 'trip' AND EXISTS (SELECT 1 FROM public.trip t WHERE t.id = product_id AND t.provider_id = auth.uid()))
  );

-- RLS Policy: Providers can delete images of their own products
CREATE POLICY "Providers can delete their product images"
  ON public.product_images
  FOR DELETE
  USING (
    (product_type = 'class' AND EXISTS (SELECT 1 FROM public.class c WHERE c.id = product_id AND c.provider_id = auth.uid()))
    OR
    (product_type = 'experience' AND EXISTS (SELECT 1 FROM public.experience e WHERE e.id = product_id AND e.provider_id = auth.uid()))
    OR
    (product_type = 'trip' AND EXISTS (SELECT 1 FROM public.trip t WHERE t.id = product_id AND t.provider_id = auth.uid()))
  );

-- RLS Policy: Public can view all product images (for ecommerce)
CREATE POLICY "Public can view product images"
  ON public.product_images
  FOR SELECT
  USING (true);

-- Add comments
COMMENT ON TABLE public.product_images IS 'Stores secondary images for products (1-10 images per product) with display order';
COMMENT ON COLUMN public.product_images.display_order IS 'Order in which images should be displayed (0-based, lower numbers first)';
COMMENT ON COLUMN public.product_images.image_url IS 'URL of the image stored in Supabase Storage';


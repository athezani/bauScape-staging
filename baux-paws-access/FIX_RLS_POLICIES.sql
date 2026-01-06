-- ============================================================
-- FIX RLS POLICIES FOR PRODUCT IMAGES TABLE
-- Copy and paste this into Supabase SQL Editor
-- ============================================================

-- Drop existing policies
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


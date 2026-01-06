-- ============================================================
-- FIX RLS AND STORAGE POLICIES - SAFE VERSION
-- This version handles existing objects gracefully
-- Copy and paste this into Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PART 1: FIX RLS POLICIES FOR PRODUCT_IMAGES TABLE
-- ============================================================

-- Drop existing policies (safe - won't error if they don't exist)
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

-- ============================================================
-- PART 2: FIX STORAGE POLICIES FOR PRODUCT-IMAGES BUCKET
-- ============================================================

-- Drop existing storage policies (safe - won't error if they don't exist)
DROP POLICY IF EXISTS "Providers can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;

-- Policy: Providers can upload images to their product folders
-- Path format: experience/{product_id}/{filename} or class/{product_id}/{filename} or trip/{product_id}/{filename}
CREATE POLICY "Providers can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  (
    -- For experience products
    (name LIKE 'experience/%' AND
     EXISTS (
       SELECT 1 FROM public.experience e
       WHERE e.id::text = (string_to_array(name, '/'))[2]
       AND e.provider_id = auth.uid()
     ))
  ) OR
  (
    -- For class products
    (name LIKE 'class/%' AND
     EXISTS (
       SELECT 1 FROM public.class c
       WHERE c.id::text = (string_to_array(name, '/'))[2]
       AND c.provider_id = auth.uid()
     ))
  ) OR
  (
    -- For trip products
    (name LIKE 'trip/%' AND
     EXISTS (
       SELECT 1 FROM public.trip t
       WHERE t.id::text = (string_to_array(name, '/'))[2]
       AND t.provider_id = auth.uid()
     ))
  )
);

-- Policy: Providers can delete images from their product folders
CREATE POLICY "Providers can delete product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-images' AND
  (
    (name LIKE 'experience/%' AND
     EXISTS (
       SELECT 1 FROM public.experience e
       WHERE e.id::text = (string_to_array(name, '/'))[2]
       AND e.provider_id = auth.uid()
     ))
  ) OR
  (
    (name LIKE 'class/%' AND
     EXISTS (
       SELECT 1 FROM public.class c
       WHERE c.id::text = (string_to_array(name, '/'))[2]
       AND c.provider_id = auth.uid()
     ))
  ) OR
  (
    (name LIKE 'trip/%' AND
     EXISTS (
       SELECT 1 FROM public.trip t
       WHERE t.id::text = (string_to_array(name, '/'))[2]
       AND t.provider_id = auth.uid()
     ))
  )
);

-- Policy: Public can view all product images (for ecommerce)
CREATE POLICY "Public can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');


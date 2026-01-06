-- ============================================================
-- APPLY ALL POLICIES COMPLETE (RLS + Storage)
-- Execute this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PART 1: FIX RLS POLICIES FOR PRODUCT_IMAGES TABLE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Providers can view their product images" ON public.product_images;
DROP POLICY IF EXISTS "Providers can insert their product images" ON public.product_images;
DROP POLICY IF EXISTS "Providers can update their product images" ON public.product_images;
DROP POLICY IF EXISTS "Providers can delete their product images" ON public.product_images;
DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;

-- RLS Policy: Providers and Admins can view images
CREATE POLICY "Providers can view their product images"
  ON public.product_images
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    (product_type = 'class' AND EXISTS (SELECT 1 FROM public.class c WHERE c.id = product_id AND c.provider_id = auth.uid()))
    OR
    (product_type = 'experience' AND EXISTS (SELECT 1 FROM public.experience e WHERE e.id = product_id AND e.provider_id = auth.uid()))
    OR
    (product_type = 'trip' AND EXISTS (SELECT 1 FROM public.trip t WHERE t.id = product_id AND t.provider_id = auth.uid()))
  );

-- RLS Policy: Providers and Admins can insert images
CREATE POLICY "Providers can insert their product images"
  ON public.product_images
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    (product_type = 'class' AND EXISTS (SELECT 1 FROM public.class c WHERE c.id = product_id AND c.provider_id = auth.uid()))
    OR
    (product_type = 'experience' AND EXISTS (SELECT 1 FROM public.experience e WHERE e.id = product_id AND e.provider_id = auth.uid()))
    OR
    (product_type = 'trip' AND EXISTS (SELECT 1 FROM public.trip t WHERE t.id = product_id AND t.provider_id = auth.uid()))
  );

-- RLS Policy: Providers and Admins can update images
CREATE POLICY "Providers can update their product images"
  ON public.product_images
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    (product_type = 'class' AND EXISTS (SELECT 1 FROM public.class c WHERE c.id = product_id AND c.provider_id = auth.uid()))
    OR
    (product_type = 'experience' AND EXISTS (SELECT 1 FROM public.experience e WHERE e.id = product_id AND e.provider_id = auth.uid()))
    OR
    (product_type = 'trip' AND EXISTS (SELECT 1 FROM public.trip t WHERE t.id = product_id AND t.provider_id = auth.uid()))
  );

-- RLS Policy: Providers and Admins can delete images
CREATE POLICY "Providers can delete their product images"
  ON public.product_images
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
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
-- PART 2: STORAGE POLICIES
-- ============================================================
-- Note: Storage policies on storage.objects may require special permissions
-- If these fail, create them manually via Dashboard

-- Drop existing storage policies
DROP POLICY IF EXISTS "Providers and Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Providers and Admins can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;

-- Storage Policy: INSERT - Providers and Admins can upload
CREATE POLICY "Providers and Admins can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'experience/%' AND
     EXISTS (
       SELECT 1 FROM public.experience e
       WHERE e.id::text = (string_to_array(name, '/'))[2]
       AND e.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'class/%' AND
     EXISTS (
       SELECT 1 FROM public.class c
       WHERE c.id::text = (string_to_array(name, '/'))[2]
       AND c.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'trip/%' AND
     EXISTS (
       SELECT 1 FROM public.trip t
       WHERE t.id::text = (string_to_array(name, '/'))[2]
       AND t.provider_id = auth.uid()
     ))
  )
);

-- Storage Policy: DELETE - Providers and Admins can delete
CREATE POLICY "Providers and Admins can delete product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-images' AND
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'experience/%' AND
     EXISTS (
       SELECT 1 FROM public.experience e
       WHERE e.id::text = (string_to_array(name, '/'))[2]
       AND e.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'class/%' AND
     EXISTS (
       SELECT 1 FROM public.class c
       WHERE c.id::text = (string_to_array(name, '/'))[2]
       AND c.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'trip/%' AND
     EXISTS (
       SELECT 1 FROM public.trip t
       WHERE t.id::text = (string_to_array(name, '/'))[2]
       AND t.provider_id = auth.uid()
     ))
  )
);

-- Storage Policy: SELECT - Public can view
CREATE POLICY "Public can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');


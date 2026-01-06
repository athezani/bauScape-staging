-- ============================================================
-- FIX STORAGE POLICIES FOR PRODUCT IMAGES BUCKET
-- Copy and paste this into Supabase SQL Editor
-- ============================================================

-- Drop existing policies if they exist
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


-- ============================================================
-- FIX STORAGE RLS AND POLICIES - COMPLETE FIX
-- This ensures RLS is enabled and policies are correct
-- Copy and paste this into Supabase SQL Editor
-- ============================================================

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing storage policies (safe - won't error if they don't exist)
DROP POLICY IF EXISTS "Providers can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;

-- Policy: Providers can upload images to their product folders
-- Path format: experience/{product_id}/{filename} or class/{product_id}/{filename} or trip/{product_id}/{filename}
-- Note: string_to_array returns 1-indexed array, so [2] is the product_id
CREATE POLICY "Providers can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  (
    -- For experience products: path is "experience/{product_id}/{filename}"
    (name LIKE 'experience/%' AND
     EXISTS (
       SELECT 1 FROM public.experience e
       WHERE e.id::text = (string_to_array(name, '/'))[2]
       AND e.provider_id = auth.uid()
     ))
  ) OR
  (
    -- For class products: path is "class/{product_id}/{filename}"
    (name LIKE 'class/%' AND
     EXISTS (
       SELECT 1 FROM public.class c
       WHERE c.id::text = (string_to_array(name, '/'))[2]
       AND c.provider_id = auth.uid()
     ))
  ) OR
  (
    -- For trip products: path is "trip/{product_id}/{filename}"
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

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%product images%'
ORDER BY policyname;


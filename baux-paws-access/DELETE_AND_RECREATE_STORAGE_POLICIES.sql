-- ============================================================
-- DELETE AND RECREATE STORAGE POLICIES
-- Run this FIRST to delete existing policies
-- Then create new ones via Dashboard
-- ============================================================

-- Delete existing storage policies
DROP POLICY IF EXISTS "Providers can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;

-- Verify policies were deleted
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%product images%';

-- If the query above returns no rows, the policies have been deleted successfully
-- Now you can create new policies via Dashboard


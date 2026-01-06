-- ============================================
-- FIX RLS POLICIES FOR STAGING
-- ============================================
-- Questo script aggiusta le RLS policies per:
-- 1. trip_program_day e trip_program_item (lettura pubblica)
-- 2. product_images (lettura pubblica)
-- ============================================

-- ============================================
-- 1. TRIP_PROGRAM_DAY
-- ============================================

ALTER TABLE IF EXISTS public.trip_program_day ENABLE ROW LEVEL SECURITY;

-- Pulisci vecchie policy
DROP POLICY IF EXISTS trip_program_day_public_read_active ON public.trip_program_day;
DROP POLICY IF EXISTS trip_program_day_insert_own_provider ON public.trip_program_day;
DROP POLICY IF EXISTS trip_program_day_update_own_provider ON public.trip_program_day;
DROP POLICY IF EXISTS trip_program_day_delete_own_provider ON public.trip_program_day;

-- Lettura pubblica (per sito customer)
CREATE POLICY trip_program_day_public_read_active
ON public.trip_program_day
FOR SELECT
TO anon, authenticated
USING (true);

-- Provider/admin possono inserire programmi per i propri prodotti
CREATE POLICY trip_program_day_insert_own_provider
ON public.trip_program_day
FOR INSERT
TO authenticated
WITH CHECK (
  -- Per experience
  (product_type = 'experience' AND EXISTS (
    SELECT 1 FROM public.experience
    WHERE experience.id = trip_program_day.product_id
    AND experience.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per class
  (product_type = 'class' AND EXISTS (
    SELECT 1 FROM public.class
    WHERE class.id = trip_program_day.product_id
    AND class.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per trip
  (product_type = 'trip' AND EXISTS (
    SELECT 1 FROM public.trip
    WHERE trip.id = trip_program_day.product_id
    AND trip.provider_id::text = auth.uid()::text
  ))
  OR
  -- Admin può sempre
  has_role(auth.uid(), 'admin'::app_role)
);

-- Provider/admin possono aggiornare programmi per i propri prodotti
CREATE POLICY trip_program_day_update_own_provider
ON public.trip_program_day
FOR UPDATE
TO authenticated
USING (
  -- Per experience
  (product_type = 'experience' AND EXISTS (
    SELECT 1 FROM public.experience
    WHERE experience.id = trip_program_day.product_id
    AND experience.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per class
  (product_type = 'class' AND EXISTS (
    SELECT 1 FROM public.class
    WHERE class.id = trip_program_day.product_id
    AND class.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per trip
  (product_type = 'trip' AND EXISTS (
    SELECT 1 FROM public.trip
    WHERE trip.id = trip_program_day.product_id
    AND trip.provider_id::text = auth.uid()::text
  ))
  OR
  -- Admin può sempre
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  -- Per experience
  (product_type = 'experience' AND EXISTS (
    SELECT 1 FROM public.experience
    WHERE experience.id = trip_program_day.product_id
    AND experience.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per class
  (product_type = 'class' AND EXISTS (
    SELECT 1 FROM public.class
    WHERE class.id = trip_program_day.product_id
    AND class.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per trip
  (product_type = 'trip' AND EXISTS (
    SELECT 1 FROM public.trip
    WHERE trip.id = trip_program_day.product_id
    AND trip.provider_id::text = auth.uid()::text
  ))
  OR
  -- Admin può sempre
  has_role(auth.uid(), 'admin'::app_role)
);

-- Provider/admin possono eliminare programmi per i propri prodotti
CREATE POLICY trip_program_day_delete_own_provider
ON public.trip_program_day
FOR DELETE
TO authenticated
USING (
  -- Per experience
  (product_type = 'experience' AND EXISTS (
    SELECT 1 FROM public.experience
    WHERE experience.id = trip_program_day.product_id
    AND experience.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per class
  (product_type = 'class' AND EXISTS (
    SELECT 1 FROM public.class
    WHERE class.id = trip_program_day.product_id
    AND class.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per trip
  (product_type = 'trip' AND EXISTS (
    SELECT 1 FROM public.trip
    WHERE trip.id = trip_program_day.product_id
    AND trip.provider_id::text = auth.uid()::text
  ))
  OR
  -- Admin può sempre
  has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================
-- 2. TRIP_PROGRAM_ITEM
-- ============================================

ALTER TABLE IF EXISTS public.trip_program_item ENABLE ROW LEVEL SECURITY;

-- Pulisci vecchie policy
DROP POLICY IF EXISTS trip_program_item_public_read_active ON public.trip_program_item;
DROP POLICY IF EXISTS trip_program_item_insert_own_provider ON public.trip_program_item;
DROP POLICY IF EXISTS trip_program_item_update_own_provider ON public.trip_program_item;
DROP POLICY IF EXISTS trip_program_item_delete_own_provider ON public.trip_program_item;

-- Lettura pubblica (per sito customer)
CREATE POLICY trip_program_item_public_read_active
ON public.trip_program_item
FOR SELECT
TO anon, authenticated
USING (true);

-- Provider/admin possono inserire item per i propri prodotti
CREATE POLICY trip_program_item_insert_own_provider
ON public.trip_program_item
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trip_program_day
    WHERE trip_program_day.id = trip_program_item.day_id
    AND (
      -- Per experience
      (trip_program_day.product_type = 'experience' AND EXISTS (
        SELECT 1 FROM public.experience
        WHERE experience.id = trip_program_day.product_id
        AND experience.provider_id::text = auth.uid()::text
      ))
      OR
      -- Per class
      (trip_program_day.product_type = 'class' AND EXISTS (
        SELECT 1 FROM public.class
        WHERE class.id = trip_program_day.product_id
        AND class.provider_id::text = auth.uid()::text
      ))
      OR
      -- Per trip
      (trip_program_day.product_type = 'trip' AND EXISTS (
        SELECT 1 FROM public.trip
        WHERE trip.id = trip_program_day.product_id
        AND trip.provider_id::text = auth.uid()::text
      ))
      OR
      -- Admin può sempre
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Provider/admin possono aggiornare item per i propri prodotti
CREATE POLICY trip_program_item_update_own_provider
ON public.trip_program_item
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_program_day
    WHERE trip_program_day.id = trip_program_item.day_id
    AND (
      -- Per experience
      (trip_program_day.product_type = 'experience' AND EXISTS (
        SELECT 1 FROM public.experience
        WHERE experience.id = trip_program_day.product_id
        AND experience.provider_id::text = auth.uid()::text
      ))
      OR
      -- Per class
      (trip_program_day.product_type = 'class' AND EXISTS (
        SELECT 1 FROM public.class
        WHERE class.id = trip_program_day.product_id
        AND class.provider_id::text = auth.uid()::text
      ))
      OR
      -- Per trip
      (trip_program_day.product_type = 'trip' AND EXISTS (
        SELECT 1 FROM public.trip
        WHERE trip.id = trip_program_day.product_id
        AND trip.provider_id::text = auth.uid()::text
      ))
      OR
      -- Admin può sempre
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trip_program_day
    WHERE trip_program_day.id = trip_program_item.day_id
    AND (
      -- Per experience
      (trip_program_day.product_type = 'experience' AND EXISTS (
        SELECT 1 FROM public.experience
        WHERE experience.id = trip_program_day.product_id
        AND experience.provider_id::text = auth.uid()::text
      ))
      OR
      -- Per class
      (trip_program_day.product_type = 'class' AND EXISTS (
        SELECT 1 FROM public.class
        WHERE class.id = trip_program_day.product_id
        AND class.provider_id::text = auth.uid()::text
      ))
      OR
      -- Per trip
      (trip_program_day.product_type = 'trip' AND EXISTS (
        SELECT 1 FROM public.trip
        WHERE trip.id = trip_program_day.product_id
        AND trip.provider_id::text = auth.uid()::text
      ))
      OR
      -- Admin può sempre
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Provider/admin possono eliminare item per i propri prodotti
CREATE POLICY trip_program_item_delete_own_provider
ON public.trip_program_item
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_program_day
    WHERE trip_program_day.id = trip_program_item.day_id
    AND (
      -- Per experience
      (trip_program_day.product_type = 'experience' AND EXISTS (
        SELECT 1 FROM public.experience
        WHERE experience.id = trip_program_day.product_id
        AND experience.provider_id::text = auth.uid()::text
      ))
      OR
      -- Per class
      (trip_program_day.product_type = 'class' AND EXISTS (
        SELECT 1 FROM public.class
        WHERE class.id = trip_program_day.product_id
        AND class.provider_id::text = auth.uid()::text
      ))
      OR
      -- Per trip
      (trip_program_day.product_type = 'trip' AND EXISTS (
        SELECT 1 FROM public.trip
        WHERE trip.id = trip_program_day.product_id
        AND trip.provider_id::text = auth.uid()::text
      ))
      OR
      -- Admin può sempre
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- ============================================
-- 3. PRODUCT_IMAGES
-- ============================================

ALTER TABLE IF EXISTS public.product_images ENABLE ROW LEVEL SECURITY;

-- Pulisci vecchie policy
DROP POLICY IF EXISTS "Providers can view their product images" ON public.product_images;
DROP POLICY IF EXISTS "Providers can insert their product images" ON public.product_images;
DROP POLICY IF EXISTS "Providers can update their product images" ON public.product_images;
DROP POLICY IF EXISTS "Providers can delete their product images" ON public.product_images;
DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;

-- Lettura pubblica (sito customer)
CREATE POLICY "Public can view product images"
ON public.product_images
FOR SELECT
TO anon, authenticated
USING (true);

-- Provider/admin possono gestire le immagini dei propri prodotti
CREATE POLICY "Providers can view their product images"
ON public.product_images
FOR SELECT
TO authenticated
USING (
  -- Per experience
  (product_type = 'experience' AND EXISTS (
    SELECT 1 FROM public.experience
    WHERE experience.id = product_images.product_id
    AND experience.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per class
  (product_type = 'class' AND EXISTS (
    SELECT 1 FROM public.class
    WHERE class.id = product_images.product_id
    AND class.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per trip
  (product_type = 'trip' AND EXISTS (
    SELECT 1 FROM public.trip
    WHERE trip.id = product_images.product_id
    AND trip.provider_id::text = auth.uid()::text
  ))
  OR
  -- Admin può sempre
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Providers can insert their product images"
ON public.product_images
FOR INSERT
TO authenticated
WITH CHECK (
  -- Per experience
  (product_type = 'experience' AND EXISTS (
    SELECT 1 FROM public.experience
    WHERE experience.id = product_images.product_id
    AND experience.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per class
  (product_type = 'class' AND EXISTS (
    SELECT 1 FROM public.class
    WHERE class.id = product_images.product_id
    AND class.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per trip
  (product_type = 'trip' AND EXISTS (
    SELECT 1 FROM public.trip
    WHERE trip.id = product_images.product_id
    AND trip.provider_id::text = auth.uid()::text
  ))
  OR
  -- Admin può sempre
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Providers can update their product images"
ON public.product_images
FOR UPDATE
TO authenticated
USING (
  -- Per experience
  (product_type = 'experience' AND EXISTS (
    SELECT 1 FROM public.experience
    WHERE experience.id = product_images.product_id
    AND experience.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per class
  (product_type = 'class' AND EXISTS (
    SELECT 1 FROM public.class
    WHERE class.id = product_images.product_id
    AND class.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per trip
  (product_type = 'trip' AND EXISTS (
    SELECT 1 FROM public.trip
    WHERE trip.id = product_images.product_id
    AND trip.provider_id::text = auth.uid()::text
  ))
  OR
  -- Admin può sempre
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  -- Per experience
  (product_type = 'experience' AND EXISTS (
    SELECT 1 FROM public.experience
    WHERE experience.id = product_images.product_id
    AND experience.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per class
  (product_type = 'class' AND EXISTS (
    SELECT 1 FROM public.class
    WHERE class.id = product_images.product_id
    AND class.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per trip
  (product_type = 'trip' AND EXISTS (
    SELECT 1 FROM public.trip
    WHERE trip.id = product_images.product_id
    AND trip.provider_id::text = auth.uid()::text
  ))
  OR
  -- Admin può sempre
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Providers can delete their product images"
ON public.product_images
FOR DELETE
TO authenticated
USING (
  -- Per experience
  (product_type = 'experience' AND EXISTS (
    SELECT 1 FROM public.experience
    WHERE experience.id = product_images.product_id
    AND experience.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per class
  (product_type = 'class' AND EXISTS (
    SELECT 1 FROM public.class
    WHERE class.id = product_images.product_id
    AND class.provider_id::text = auth.uid()::text
  ))
  OR
  -- Per trip
  (product_type = 'trip' AND EXISTS (
    SELECT 1 FROM public.trip
    WHERE trip.id = product_images.product_id
    AND trip.provider_id::text = auth.uid()::text
  ))
  OR
  -- Admin può sempre
  has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================
-- VERIFICA
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies per trip_program_day, trip_program_item e product_images configurate correttamente!';
  RAISE NOTICE '✅ Lettura pubblica abilitata per tutte le tabelle';
  RAISE NOTICE '✅ Provider/admin possono gestire i propri prodotti';
END $$;


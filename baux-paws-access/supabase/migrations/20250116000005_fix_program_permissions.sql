-- ============================================
-- FIX PROGRAM PERMISSIONS - Aggiungi supporto admin
-- ============================================
-- Le policy per trip_program_day e trip_program_item devono permettere
-- anche agli admin di gestire i programmi di tutti i prodotti

-- Rimuovi le policy esistenti per trip_program_day
DROP POLICY IF EXISTS trip_program_day_insert_own_provider ON public.trip_program_day;
DROP POLICY IF EXISTS trip_program_day_update_own_provider ON public.trip_program_day;
DROP POLICY IF EXISTS trip_program_day_delete_own_provider ON public.trip_program_day;

-- Rimuovi le policy esistenti per trip_program_item
DROP POLICY IF EXISTS trip_program_item_insert_own_provider ON public.trip_program_item;
DROP POLICY IF EXISTS trip_program_item_update_own_provider ON public.trip_program_item;
DROP POLICY IF EXISTS trip_program_item_delete_own_provider ON public.trip_program_item;

-- ============================================
-- POLICY PER trip_program_day
-- ============================================

-- Policy: Users can insert program days for their own products OR admins can insert for any product
CREATE POLICY trip_program_day_insert_own_provider
  ON public.trip_program_day
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR
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

-- Policy: Users can update program days for their own products OR admins can update for any product
CREATE POLICY trip_program_day_update_own_provider
  ON public.trip_program_day
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR
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

-- Policy: Users can delete program days for their own products OR admins can delete for any product
CREATE POLICY trip_program_day_delete_own_provider
  ON public.trip_program_day
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR
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

-- ============================================
-- POLICY PER trip_program_item
-- ============================================

-- Policy: Users can insert program items for their own products OR admins can insert for any product
CREATE POLICY trip_program_item_insert_own_provider
  ON public.trip_program_item
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR
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

-- Policy: Users can update program items for their own products OR admins can update for any product
CREATE POLICY trip_program_item_update_own_provider
  ON public.trip_program_item
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR
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

-- Policy: Users can delete program items for their own products OR admins can delete for any product
CREATE POLICY trip_program_item_delete_own_provider
  ON public.trip_program_item
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR
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

-- ============================================
-- VERIFICA E LOG
-- ============================================

DO $$
DECLARE
  day_policies INTEGER;
  item_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO day_policies 
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'trip_program_day';
  
  SELECT COUNT(*) INTO item_policies 
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'trip_program_item';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PROGRAM POLICY RLS CREATE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'trip_program_day policies: %', day_policies;
  RAISE NOTICE 'trip_program_item policies: %', item_policies;
  RAISE NOTICE '========================================';
END $$;

COMMENT ON POLICY trip_program_day_insert_own_provider ON public.trip_program_day IS 
  'Permette ai provider di inserire giorni programma per i propri prodotti e agli admin per tutti i prodotti';
COMMENT ON POLICY trip_program_day_update_own_provider ON public.trip_program_day IS 
  'Permette ai provider di aggiornare giorni programma per i propri prodotti e agli admin per tutti i prodotti';
COMMENT ON POLICY trip_program_day_delete_own_provider ON public.trip_program_day IS 
  'Permette ai provider di eliminare giorni programma per i propri prodotti e agli admin per tutti i prodotti';
COMMENT ON POLICY trip_program_item_insert_own_provider ON public.trip_program_item IS 
  'Permette ai provider di inserire attività programma per i propri prodotti e agli admin per tutti i prodotti';
COMMENT ON POLICY trip_program_item_update_own_provider ON public.trip_program_item IS 
  'Permette ai provider di aggiornare attività programma per i propri prodotti e agli admin per tutti i prodotti';
COMMENT ON POLICY trip_program_item_delete_own_provider ON public.trip_program_item IS 
  'Permette ai provider di eliminare attività programma per i propri prodotti e agli admin per tutti i prodotti';


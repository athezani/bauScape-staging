-- Script di verifica completa della migrazione
-- Esegui queste query per verificare che tutto sia stato creato correttamente

-- 1. Verifica colonna idempotency_key
SELECT 
  '✅ Colonna idempotency_key' as check_name,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'booking' 
AND column_name = 'idempotency_key';

-- 2. Verifica tabella booking_events
SELECT 
  '✅ Tabella booking_events' as check_name,
  COUNT(*) as table_exists
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'booking_events';

-- 3. Verifica colonne booking_events
SELECT 
  '✅ Colonne booking_events' as check_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'booking_events'
ORDER BY ordinal_position;

-- 4. Verifica funzione transazionale
SELECT 
  '✅ Funzione create_booking_transactional' as check_name,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'create_booking_transactional';

-- 5. Verifica funzione emit_booking_event
SELECT 
  '✅ Funzione emit_booking_event' as check_name,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'emit_booking_event';

-- 6. Verifica trigger evento
SELECT 
  '✅ Trigger booking_created_emit_event' as check_name,
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype
FROM pg_trigger 
WHERE tgname = 'booking_created_emit_event';

-- 7. Verifica constraint univoco stripe_checkout_session_id
SELECT 
  '✅ Constraint booking_stripe_session_unique' as check_name,
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.booking'::regclass
AND conname = 'booking_stripe_session_unique';

-- 8. Verifica constraint univoco idempotency_key
SELECT 
  '✅ Constraint booking_idempotency_key_key' as check_name,
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.booking'::regclass
AND conname = 'booking_idempotency_key_key';

-- 9. Verifica policy RLS su booking_events
SELECT 
  '✅ Policy RLS booking_events' as check_name,
  policyname,
  permissive,
  roles
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'booking_events';

-- 10. Verifica indici
SELECT 
  '✅ Indici booking_events' as check_name,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'booking_events'
ORDER BY indexname;

-- 11. Verifica trigger disabilitato (vecchio)
SELECT 
  '✅ Trigger vecchio disabilitato' as check_name,
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger 
WHERE tgname = 'booking_created_update_availability'
AND tgenabled = 'D'; -- D = disabled





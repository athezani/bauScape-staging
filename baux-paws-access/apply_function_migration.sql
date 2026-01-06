-- Apply function migration manually
-- This script applies the updated create_booking_transactional function

-- Drop all existing versions of the function to avoid signature conflicts
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
            FROM pg_proc
            WHERE proname = 'create_booking_transactional'
              AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.create_booking_transactional(%s) CASCADE', r.args);
  END LOOP;
END $$;

-- Now apply the full migration
\i supabase/migrations/20250115000003_update_booking_transactional_function.sql


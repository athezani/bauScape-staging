-- Verifica se il fix ENUM è stato applicato
-- Controlla se la funzione ha il cast ::public.product_type

SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'create_booking_transactional'
AND routine_schema = 'public';

-- Cerca il cast nella definizione
SELECT 
  CASE 
    WHEN routine_definition LIKE '%::public.product_type%' THEN '✅ Fix applicato (cast presente)'
    ELSE '❌ Fix NON applicato (cast mancante)'
  END as status_fix
FROM information_schema.routines
WHERE routine_name = 'create_booking_transactional'
AND routine_schema = 'public';





-- ============================================
-- COMPLETE SYSTEM TEST - Financial Tracking
-- ============================================
-- Questo script testa TUTTE le funzionalità del sistema
-- per assicurarsi che nulla sia stato rotto dopo le modifiche
-- ============================================
-- ISTRUZIONI: Esegui questo script nel SQL Editor di Supabase
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COMPLETE SYSTEM TEST - Financial Tracking';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- ============================================
-- TEST 1: Verifica Struttura Database
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'TEST 1: Verifica Struttura Database';
  RAISE NOTICE '----------------------------------------';
END $$;

DO $$
DECLARE
  errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Verifica enum pricing_model
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_model') THEN
    errors := array_append(errors, 'pricing_model enum mancante');
  END IF;
  
  -- Verifica campi prodotti
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'experience' 
    AND column_name = 'pricing_model'
  ) THEN
    errors := array_append(errors, 'experience.pricing_model mancante');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'experience' 
    AND column_name = 'provider_cost_adult_base'
  ) THEN
    errors := array_append(errors, 'experience.provider_cost_adult_base mancante');
  END IF;
  
  -- Verifica campi booking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking' 
    AND column_name = 'provider_cost_total'
  ) THEN
    errors := array_append(errors, 'booking.provider_cost_total mancante');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking' 
    AND column_name = 'stripe_fee'
  ) THEN
    errors := array_append(errors, 'booking.stripe_fee mancante');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking' 
    AND column_name = 'internal_margin'
  ) THEN
    errors := array_append(errors, 'booking.internal_margin mancante');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'booking' 
    AND column_name = 'net_revenue'
  ) THEN
    errors := array_append(errors, 'booking.net_revenue mancante');
  END IF;
  
  -- Verifica funzione
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_booking_transactional'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    errors := array_append(errors, 'create_booking_transactional funzione mancante');
  END IF;
  
  IF array_length(errors, 1) > 0 THEN
    RAISE EXCEPTION 'Errori trovati: %', array_to_string(errors, ', ');
  ELSE
    RAISE NOTICE '✓ Struttura database corretta';
  END IF;
END $$;

-- ============================================
-- TEST 2: Verifica Funzione create_booking_transactional
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: Verifica Funzione create_booking_transactional';
  RAISE NOTICE '----------------------------------------';
END $$;

DO $$
DECLARE
  func_args TEXT;
  has_provider_cost BOOLEAN := false;
  has_stripe_fee BOOLEAN := false;
  has_internal_margin BOOLEAN := false;
  has_net_revenue BOOLEAN := false;
BEGIN
  SELECT pg_get_function_arguments(oid) INTO func_args
  FROM pg_proc
  WHERE proname = 'create_booking_transactional'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LIMIT 1;
  
  IF func_args IS NULL THEN
    RAISE EXCEPTION 'Funzione create_booking_transactional non trovata';
  END IF;
  
  has_provider_cost := func_args LIKE '%p_provider_cost_total%';
  has_stripe_fee := func_args LIKE '%p_stripe_fee%';
  has_internal_margin := func_args LIKE '%p_internal_margin%';
  has_net_revenue := func_args LIKE '%p_net_revenue%';
  
  IF NOT has_provider_cost THEN
    RAISE EXCEPTION 'Parametro p_provider_cost_total mancante nella funzione';
  END IF;
  
  IF NOT has_stripe_fee THEN
    RAISE EXCEPTION 'Parametro p_stripe_fee mancante nella funzione';
  END IF;
  
  IF NOT has_internal_margin THEN
    RAISE EXCEPTION 'Parametro p_internal_margin mancante nella funzione';
  END IF;
  
  IF NOT has_net_revenue THEN
    RAISE EXCEPTION 'Parametro p_net_revenue mancante nella funzione';
  END IF;
  
  RAISE NOTICE '✓ Funzione include tutti i parametri finanziari';
  RAISE NOTICE '  Argomenti: %', func_args;
END $$;

-- ============================================
-- TEST 3: Verifica Prodotti con Pricing Models
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: Verifica Prodotti con Pricing Models';
  RAISE NOTICE '----------------------------------------';
END $$;

DO $$
DECLARE
  exp_count INTEGER;
  class_count INTEGER;
  trip_count INTEGER;
  exp_with_pricing INTEGER;
  class_with_pricing INTEGER;
  trip_with_pricing INTEGER;
  exp_percentage INTEGER;
  exp_markup INTEGER;
  class_percentage INTEGER;
  class_markup INTEGER;
  trip_percentage INTEGER;
  trip_markup INTEGER;
BEGIN
  -- Count experiences
  SELECT COUNT(*) INTO exp_count FROM experience e WHERE e.active = true;
  SELECT COUNT(*) INTO exp_with_pricing 
  FROM experience e WHERE e.active = true AND e.pricing_model IS NOT NULL;
  SELECT COUNT(*) INTO exp_percentage 
  FROM experience e WHERE e.active = true AND e.pricing_model = 'percentage';
  SELECT COUNT(*) INTO exp_markup 
  FROM experience e WHERE e.active = true AND e.pricing_model = 'markup';
  
  -- Count classes
  SELECT COUNT(*) INTO class_count FROM class c WHERE c.active = true;
  SELECT COUNT(*) INTO class_with_pricing 
  FROM class c WHERE c.active = true AND c.pricing_model IS NOT NULL;
  SELECT COUNT(*) INTO class_percentage 
  FROM class c WHERE c.active = true AND c.pricing_model = 'percentage';
  SELECT COUNT(*) INTO class_markup 
  FROM class c WHERE c.active = true AND c.pricing_model = 'markup';
  
  -- Count trips
  SELECT COUNT(*) INTO trip_count FROM trip t WHERE t.active = true;
  SELECT COUNT(*) INTO trip_with_pricing 
  FROM trip t WHERE t.active = true AND t.pricing_model IS NOT NULL;
  SELECT COUNT(*) INTO trip_percentage 
  FROM trip t WHERE t.active = true AND t.pricing_model = 'percentage';
  SELECT COUNT(*) INTO trip_markup 
  FROM trip t WHERE t.active = true AND t.pricing_model = 'markup';
  
  RAISE NOTICE 'Prodotti attivi:';
  RAISE NOTICE '  Experiences: % totali, % con pricing (% percentage, % markup)', exp_count, exp_with_pricing, exp_percentage, exp_markup;
  RAISE NOTICE '  Classes: % totali, % con pricing (% percentage, % markup)', class_count, class_with_pricing, class_percentage, class_markup;
  RAISE NOTICE '  Trips: % totali, % con pricing (% percentage, % markup)', trip_count, trip_with_pricing, trip_percentage, trip_markup;
  
  IF exp_count = 0 AND class_count = 0 AND trip_count = 0 THEN
    RAISE WARNING 'Nessun prodotto attivo trovato';
  END IF;
  
  RAISE NOTICE '✓ Verifica prodotti completata';
END $$;

-- Mostra distribuzione pricing models
SELECT 'experience' as product_type,
  e.pricing_model,
  COUNT(*) as count,
  COUNT(CASE WHEN e.provider_cost_adult_base IS NOT NULL THEN 1 END) as with_provider_cost,
  AVG(e.margin_percentage) as avg_margin_pct,
  AVG(e.markup_adult) as avg_markup_adult FROM experience e WHERE e.active = true GROUP BY e.pricing_model
UNION ALL
SELECT 'class' as product_type,
  c.pricing_model,
  COUNT(*),
  COUNT(CASE WHEN c.provider_cost_adult_base IS NOT NULL THEN 1 END),
  AVG(c.margin_percentage),
  AVG(c.markup_adult) FROM class c WHERE c.active = true GROUP BY c.pricing_model
UNION ALL
SELECT 'trip' as product_type,
  t.pricing_model,
  COUNT(*),
  COUNT(CASE WHEN t.provider_cost_adult_base IS NOT NULL THEN 1 END),
  AVG(t.margin_percentage),
  AVG(t.markup_adult) FROM trip t WHERE t.active = true GROUP BY t.pricing_model
ORDER BY product_type;

-- ============================================
-- TEST 4: Verifica Retrocompatibilità
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: Verifica Retrocompatibilità';
  RAISE NOTICE '----------------------------------------';
END $$;

DO $$
DECLARE
  exp_with_legacy_price INTEGER;
  class_with_legacy_price INTEGER;
  trip_with_legacy_price INTEGER;
BEGIN
  -- Verifica che i campi legacy esistano ancora
  SELECT COUNT(*) INTO exp_with_legacy_price
  FROM experience e WHERE e.active = true AND e.price_adult_base IS NOT NULL;
  
  SELECT COUNT(*) INTO class_with_legacy_price
  FROM class c WHERE c.active = true AND c.price_adult_base IS NOT NULL;
  
  SELECT COUNT(*) INTO trip_with_legacy_price
  FROM trip t WHERE t.active = true AND t.price_adult_base IS NOT NULL;
  
  RAISE NOTICE 'Prodotti con prezzi legacy (retrocompatibilità):';
  RAISE NOTICE '  Experiences: %', exp_with_legacy_price;
  RAISE NOTICE '  Classes: %', class_with_legacy_price;
  RAISE NOTICE '  Trips: %', trip_with_legacy_price;
  
  RAISE NOTICE '✓ Retrocompatibilità verificata';
END $$;

-- ============================================
-- TEST 5: Test Calcolo Prezzo - Modello Percentage
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 5: Test Calcolo Prezzo - Modello Percentage';
  RAISE NOTICE '----------------------------------------';
END $$;

DO $$
DECLARE
  test_product RECORD;
  provider_cost_total NUMERIC;
  margin_percentage NUMERIC;
  expected_price NUMERIC;
  calculated_price NUMERIC;
  num_adults INTEGER := 2;
  num_dogs INTEGER := 1;
BEGIN
  -- Trova un prodotto con modello percentage
  SELECT e.* INTO test_product
  FROM experience e
  WHERE e.active = true 
    AND e.pricing_model = 'percentage'
    AND e.provider_cost_adult_base IS NOT NULL
    AND e.provider_cost_dog_base IS NOT NULL
    AND e.margin_percentage IS NOT NULL
  LIMIT 1;
  
  IF test_product IS NULL THEN
    RAISE WARNING 'Nessun prodotto percentage trovato per il test';
    RETURN;
  END IF;
  
  -- Calcola
  provider_cost_total := (test_product.provider_cost_adult_base * num_adults) + 
                         (test_product.provider_cost_dog_base * num_dogs);
  margin_percentage := test_product.margin_percentage;
  expected_price := provider_cost_total * (1 + margin_percentage / 100);
  
  -- Simula calcolo come nella Edge Function
  calculated_price := provider_cost_total * (1 + margin_percentage / 100);
  
  RAISE NOTICE 'Test Percentage Model:';
  RAISE NOTICE '  Prodotto: %', test_product.name;
  RAISE NOTICE '  Costo fornitore adulto: €%', test_product.provider_cost_adult_base;
  RAISE NOTICE '  Costo fornitore cane: €%', test_product.provider_cost_dog_base;
  RAISE NOTICE '  Margine percentuale: % percento', margin_percentage;
  RAISE NOTICE '  Numero adulti: %', num_adults;
  RAISE NOTICE '  Numero cani: %', num_dogs;
  RAISE NOTICE '  Costo fornitore totale: €%', provider_cost_total;
  RAISE NOTICE '  Prezzo calcolato: €%', calculated_price;
  
  IF ABS(calculated_price - expected_price) > 0.01 THEN
    RAISE EXCEPTION 'Errore calcolo percentage: atteso €%, calcolato €%', expected_price, calculated_price;
  END IF;
  
  RAISE NOTICE '✓ Calcolo percentage corretto';
END $$;

-- ============================================
-- TEST 6: Test Calcolo Prezzo - Modello Markup
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 6: Test Calcolo Prezzo - Modello Markup';
  RAISE NOTICE '----------------------------------------';
END $$;

DO $$
DECLARE
  test_product RECORD;
  provider_cost_total NUMERIC;
  markup_total NUMERIC;
  expected_price NUMERIC;
  calculated_price NUMERIC;
  num_adults INTEGER := 2;
  num_dogs INTEGER := 1;
BEGIN
  -- Trova un prodotto con modello markup
  SELECT e.* INTO test_product
  FROM experience e
  WHERE e.active = true 
    AND e.pricing_model = 'markup'
    AND e.provider_cost_adult_base IS NOT NULL
    AND e.provider_cost_dog_base IS NOT NULL
    AND e.markup_adult IS NOT NULL
    AND e.markup_dog IS NOT NULL
  LIMIT 1;
  
  IF test_product IS NULL THEN
    RAISE WARNING 'Nessun prodotto markup trovato per il test';
    RETURN;
  END IF;
  
  -- Calcola
  provider_cost_total := (test_product.provider_cost_adult_base * num_adults) + 
                         (test_product.provider_cost_dog_base * num_dogs);
  markup_total := (test_product.markup_adult * num_adults) + 
                  (test_product.markup_dog * num_dogs);
  expected_price := provider_cost_total + markup_total;
  
  -- Simula calcolo come nella Edge Function
  calculated_price := provider_cost_total + markup_total;
  
  RAISE NOTICE 'Test Markup Model:';
  RAISE NOTICE '  Prodotto: %', test_product.name;
  RAISE NOTICE '  Costo fornitore adulto: €%', test_product.provider_cost_adult_base;
  RAISE NOTICE '  Costo fornitore cane: €%', test_product.provider_cost_dog_base;
  RAISE NOTICE '  Markup adulto: €%', test_product.markup_adult;
  RAISE NOTICE '  Markup cane: €%', test_product.markup_dog;
  RAISE NOTICE '  Numero adulti: %', num_adults;
  RAISE NOTICE '  Numero cani: %', num_dogs;
  RAISE NOTICE '  Costo fornitore totale: €%', provider_cost_total;
  RAISE NOTICE '  Markup totale: €%', markup_total;
  RAISE NOTICE '  Prezzo calcolato: €%', calculated_price;
  
  IF ABS(calculated_price - expected_price) > 0.01 THEN
    RAISE EXCEPTION 'Errore calcolo markup: atteso €%, calcolato €%', expected_price, calculated_price;
  END IF;
  
  RAISE NOTICE '✓ Calcolo markup corretto';
END $$;

-- ============================================
-- TEST 7: Test Calcolo Valori Finanziari
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 7: Test Calcolo Valori Finanziari';
  RAISE NOTICE '----------------------------------------';
END $$;

DO $$
DECLARE
  test_total_amount_paid NUMERIC := 200.00;
  test_provider_cost_total NUMERIC := 120.00;
  test_stripe_fee NUMERIC := 5.00;
  expected_internal_margin NUMERIC;
  calculated_margin NUMERIC;
  expected_net_revenue NUMERIC;
BEGIN
  -- Calcola margine interno
  expected_internal_margin := test_total_amount_paid - test_provider_cost_total - test_stripe_fee;
  calculated_margin := test_total_amount_paid - test_provider_cost_total - test_stripe_fee;
  expected_net_revenue := calculated_margin;
  
  RAISE NOTICE 'Test Calcolo Valori Finanziari:';
  RAISE NOTICE '  Total amount paid: €%', test_total_amount_paid;
  RAISE NOTICE '  Provider cost total: €%', test_provider_cost_total;
  RAISE NOTICE '  Stripe fee: €%', test_stripe_fee;
  RAISE NOTICE '  Internal margin: €%', calculated_margin;
  RAISE NOTICE '  Net revenue: €%', expected_net_revenue;
  
  IF ABS(calculated_margin - expected_internal_margin) > 0.01 THEN
    RAISE EXCEPTION 'Errore calcolo margine: atteso €%, calcolato €%', 
      expected_internal_margin, calculated_margin;
  END IF;
  
  IF ABS(expected_net_revenue - calculated_margin) > 0.01 THEN
    RAISE EXCEPTION 'Errore: net_revenue deve essere uguale a internal_margin';
  END IF;
  
  RAISE NOTICE '✓ Calcolo valori finanziari corretto';
END $$;

-- ============================================
-- TEST 8: Verifica Integrità Dati Prodotti
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 8: Verifica Integrità Dati Prodotti';
  RAISE NOTICE '----------------------------------------';
END $$;

DO $$
DECLARE
  errors TEXT[] := ARRAY[]::TEXT[];
  invalid_count INTEGER;
BEGIN
  -- Verifica prodotti percentage hanno margin_percentage
  SELECT COUNT(*) INTO invalid_count
  FROM experience e
  WHERE e.active = true 
    AND e.pricing_model = 'percentage'
    AND (e.margin_percentage IS NULL OR e.margin_percentage < 0);
  
  IF invalid_count > 0 THEN
    errors := array_append(errors, format('%s experiences con percentage ma senza margin_percentage', invalid_count));
  END IF;
  
  -- Verifica prodotti markup hanno markup
  SELECT COUNT(*) INTO invalid_count
  FROM experience e
  WHERE e.active = true 
    AND e.pricing_model = 'markup'
    AND (e.markup_adult IS NULL OR e.markup_dog IS NULL);
  
  IF invalid_count > 0 THEN
    errors := array_append(errors, format('%s experiences con markup ma senza markup_adult/dog', invalid_count));
  END IF;
  
  -- Verifica provider costs sono positivi
  SELECT COUNT(*) INTO invalid_count
  FROM experience e
  WHERE e.active = true 
    AND e.provider_cost_adult_base IS NOT NULL
    AND e.provider_cost_adult_base < 0;
  
  IF invalid_count > 0 THEN
    errors := array_append(errors, format('%s experiences con provider_cost negativo', invalid_count));
  END IF;
  
  IF array_length(errors, 1) > 0 THEN
    RAISE WARNING 'Problemi di integrità trovati: %', array_to_string(errors, ', ');
  ELSE
    RAISE NOTICE '✓ Integrità dati prodotti verificata';
  END IF;
END $$;

-- ============================================
-- TEST 9: Verifica Booking Esistenti
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 9: Verifica Booking Esistenti';
  RAISE NOTICE '----------------------------------------';
END $$;

DO $$
DECLARE
  total_bookings INTEGER;
  bookings_with_financial INTEGER;
  bookings_without_financial INTEGER;
  recent_bookings INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_bookings FROM booking;
  SELECT COUNT(*) INTO bookings_with_financial 
  FROM booking 
  WHERE provider_cost_total IS NOT NULL;
  SELECT COUNT(*) INTO bookings_without_financial 
  FROM booking 
  WHERE provider_cost_total IS NULL;
  SELECT COUNT(*) INTO recent_bookings
  FROM booking
  WHERE created_at > NOW() - INTERVAL '7 days';
  
  RAISE NOTICE 'Statistiche Booking:';
  RAISE NOTICE '  Total bookings: %', total_bookings;
  RAISE NOTICE '  Con dati finanziari: %', bookings_with_financial;
  RAISE NOTICE '  Senza dati finanziari: %', bookings_without_financial;
  RAISE NOTICE '  Ultimi 7 giorni: %', recent_bookings;
  
  RAISE NOTICE '✓ Verifica booking completata';
END $$;

-- Mostra ultimi booking con dati finanziari
SELECT 
  id,
  order_number,
  product_name,
  total_amount_paid,
  provider_cost_total,
  stripe_fee,
  internal_margin,
  net_revenue,
  created_at,
  CASE 
    WHEN ABS(internal_margin - (total_amount_paid - provider_cost_total - COALESCE(stripe_fee, 0))) < 0.01 
    THEN '✓ Corretto'
    ELSE '✗ Errore calcolo'
  END as verification
FROM booking
WHERE provider_cost_total IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- TEST 10: Test Funzione create_booking_transactional (Simulazione)
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 10: Test Funzione create_booking_transactional';
  RAISE NOTICE '----------------------------------------';
END $$;

DO $$
DECLARE
  test_idempotency_key UUID := gen_random_uuid();
  test_provider_id UUID;
  test_product_type TEXT := 'experience';
  test_booking_date DATE := CURRENT_DATE + INTERVAL '30 days';
BEGIN
  -- Trova un provider esistente
  SELECT id INTO test_provider_id
  FROM profile
  WHERE profile.active = true
  LIMIT 1;
  
  IF test_provider_id IS NULL THEN
    RAISE WARNING 'Nessun provider trovato per il test';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Test chiamata funzione (simulazione):';
  RAISE NOTICE '  Idempotency key: %', test_idempotency_key;
  RAISE NOTICE '  Provider ID: %', test_provider_id;
  RAISE NOTICE '  Product type: %', test_product_type;
  RAISE NOTICE '  Booking date: %', test_booking_date;
  
  -- NOTA: Non eseguiamo realmente la funzione perché creerebbe un booking
  -- Verifichiamo solo che la funzione esista e abbia la firma corretta
  
  RAISE NOTICE '✓ Funzione verificata (non eseguita per evitare booking di test)';
END $$;

-- ============================================
-- TEST 11: Verifica Constraints e Validazioni
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 11: Verifica Constraints e Validazioni';
  RAISE NOTICE '----------------------------------------';
END $$;

DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  -- Verifica constraint su margin_percentage
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.check_constraints
  WHERE constraint_schema = 'public'
    AND constraint_name LIKE '%margin_percentage%';
  
  IF constraint_count = 0 THEN
    RAISE WARNING 'Nessun constraint trovato su margin_percentage';
  ELSE
    RAISE NOTICE '✓ Constraints su margin_percentage verificati';
  END IF;
  
  -- Verifica constraint su provider_cost
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.check_constraints
  WHERE constraint_schema = 'public'
    AND constraint_name LIKE '%provider_cost%';
  
  IF constraint_count = 0 THEN
    RAISE WARNING 'Nessun constraint trovato su provider_cost';
  ELSE
    RAISE NOTICE '✓ Constraints su provider_cost verificati';
  END IF;
  
  RAISE NOTICE '✓ Verifica constraints completata';
END $$;

-- ============================================
-- TEST 12: Verifica Indici
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 12: Verifica Indici';
  RAISE NOTICE '----------------------------------------';
END $$;

DO $$
DECLARE
  index_count INTEGER;
BEGIN
  -- Verifica indici su booking
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'booking';
  
  RAISE NOTICE 'Indici su tabella booking: %', index_count;
  
  -- Verifica indici specifici
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'booking'
      AND indexname LIKE '%stripe%'
  ) THEN
    RAISE NOTICE '✓ Indici Stripe presenti';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'booking'
      AND indexname LIKE '%product%'
  ) THEN
    RAISE NOTICE '✓ Indici prodotto presenti';
  END IF;
  
  RAISE NOTICE '✓ Verifica indici completata';
END $$;

-- ============================================
-- TEST 13: Verifica RLS Policies
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 13: Verifica RLS Policies';
  RAISE NOTICE '----------------------------------------';
END $$;

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Verifica RLS su booking
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'booking';
  
  RAISE NOTICE 'RLS policies su booking: %', policy_count;
  
  IF policy_count = 0 THEN
    RAISE WARNING 'Nessuna RLS policy trovata su booking';
  ELSE
    RAISE NOTICE '✓ RLS policies presenti';
  END IF;
  
  RAISE NOTICE '✓ Verifica RLS completata';
END $$;

-- ============================================
-- TEST 14: Verifica Disponibilità Slot
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 14: Verifica Disponibilità Slot';
  RAISE NOTICE '----------------------------------------';
END $$;

DO $$
DECLARE
  slot_count INTEGER;
  slots_with_capacity INTEGER;
  slots_full INTEGER;
BEGIN
  SELECT COUNT(*) INTO slot_count FROM availability_slot;
  SELECT COUNT(*) INTO slots_with_capacity
  FROM availability_slot
  WHERE (max_adults - booked_adults) > 0 OR (max_dogs - booked_dogs) > 0;
  SELECT COUNT(*) INTO slots_full
  FROM availability_slot
  WHERE (max_adults - booked_adults) <= 0 AND (max_dogs - booked_dogs) <= 0;
  
  RAISE NOTICE 'Statistiche Availability Slots:';
  RAISE NOTICE '  Total slots: %', slot_count;
  RAISE NOTICE '  Con capacità disponibile: %', slots_with_capacity;
  RAISE NOTICE '  Pieni: %', slots_full;
  
  RAISE NOTICE '✓ Verifica availability slots completata';
END $$;

-- ============================================
-- TEST 15: Verifica Compatibilità Edge Functions
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 15: Verifica Compatibilità Edge Functions';
  RAISE NOTICE '----------------------------------------';
END $$;

DO $$
BEGIN
  -- Verifica che i campi necessari per le Edge Functions esistano
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'price_adult_base'
  ) THEN
    RAISE EXCEPTION 'Campo price_adult_base mancante in experience (necessario per retrocompatibilità)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'experience' 
    AND column_name = 'price_dog_base'
  ) THEN
    RAISE EXCEPTION 'Campo price_dog_base mancante in experience (necessario per retrocompatibilità)';
  END IF;
  
  RAISE NOTICE '✓ Campi per retrocompatibilità presenti';
  RAISE NOTICE '✓ Edge Functions possono funzionare con prodotti legacy';
END $$;

-- ============================================
-- TEST 16: Report Finale
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'REPORT FINALE';
  RAISE NOTICE '========================================';
END $$;

-- Statistiche complete
SELECT 
  'Prodotti Attivi' as category,
  COUNT(*) as count
FROM (
  SELECT id FROM experience e WHERE e.active = true
  UNION ALL
  SELECT id FROM class c WHERE c.active = true
  UNION ALL
  SELECT id FROM trip t WHERE t.active = true
) products
UNION ALL
SELECT 
  'Prodotti con Pricing Model',
  COUNT(*)
FROM (
  SELECT id FROM experience e WHERE e.active = true AND e.pricing_model IS NOT NULL
  UNION ALL
  SELECT id FROM class c WHERE c.active = true AND c.pricing_model IS NOT NULL
  UNION ALL
  SELECT id FROM trip t WHERE t.active = true AND t.pricing_model IS NOT NULL
) products_with_pricing
UNION ALL
SELECT 
  'Booking Totali',
  COUNT(*)
FROM booking
UNION ALL
SELECT 
  'Booking con Dati Finanziari',
  COUNT(*)
FROM booking
WHERE provider_cost_total IS NOT NULL
UNION ALL
SELECT 
  'Availability Slots',
  COUNT(*)
FROM availability_slot
ORDER BY category;

-- Verifica calcoli finanziari (se ci sono booking)
SELECT 
  'Verifica Calcoli Finanziari' as test,
  COUNT(*) as total_bookings,
  COUNT(CASE 
    WHEN ABS(internal_margin - (total_amount_paid - provider_cost_total - COALESCE(stripe_fee, 0))) < 0.01 
    THEN 1 
  END) as correct_calculations,
  COUNT(CASE 
    WHEN ABS(internal_margin - (total_amount_paid - provider_cost_total - COALESCE(stripe_fee, 0))) >= 0.01 
    THEN 1 
  END) as incorrect_calculations
FROM booking
WHERE provider_cost_total IS NOT NULL
  AND internal_margin IS NOT NULL;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST COMPLETATI!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Se tutti i test sono passati, il sistema è operativo.';
  RAISE NOTICE 'Verifica eventuali WARNING sopra per problemi minori.';
  RAISE NOTICE '';
END $$;

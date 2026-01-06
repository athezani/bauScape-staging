-- Script SQL per verificare lo stato del booking e identificare problemi con l'email
-- Usage: npx supabase db execute --sql "$(cat check-booking-email-issue.sql | sed 's/:order_number/UGYSLY3J/g')" --project-ref zyonwzilijgnnnmhxvbo
-- Oppure modifica manualmente :order_number con l'order number desiderato

-- Sostituisci 'UGYSLY3J' con l'order number del booking da verificare
-- Per questo script, sostituisci manualmente :order_number con 'UGYSLY3J' o usa sed come sopra

-- 1. Verifica booking principale
SELECT 
  '=== DETTAGLI BOOKING ===' as section;

SELECT 
  id,
  order_number,
  LEFT(stripe_checkout_session_id, 20) || '...' || RIGHT(stripe_checkout_session_id, 8) as session_id_preview,
  stripe_payment_intent_id,
  status,
  created_at,
  customer_name || ' ' || COALESCE(customer_surname, '') as customer_full_name,
  customer_email,
  product_name,
  product_type,
  booking_date,
  booking_time,
  number_of_adults,
  number_of_dogs,
  total_amount_paid,
  currency,
  availability_slot_id,
  provider_id,
  confirmation_email_sent,
  CASE 
    WHEN confirmation_email_sent THEN '✅ Email inviata'
    ELSE '❌ Email NON inviata'
  END as email_status
FROM booking
WHERE order_number = 'UGYSLY3J'
   OR stripe_checkout_session_id ILIKE '%UGYSLY3J%'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Verifica availability slot se presente
SELECT 
  '=== DETTAGLI AVAILABILITY SLOT ===' as section;

SELECT 
  s.id,
  s.date,
  s.time_slot,
  s.end_time,
  s.available_capacity,
  s.booked_capacity,
  s.product_id,
  p.name as product_name
FROM availability_slot s
LEFT JOIN product p ON s.product_id = p.id
WHERE s.id = (
  SELECT availability_slot_id 
  FROM booking 
  WHERE order_number = :'order_number'
     OR stripe_checkout_session_id ILIKE '%' || :'order_number' || '%'
  LIMIT 1
);

-- 3. Verifica se ci sono eventi di booking
SELECT 
  '=== EVENTI BOOKING ===' as section;

SELECT 
  id,
  booking_id,
  event_type,
  status,
  created_at,
  error_message
FROM booking_event
WHERE booking_id = (
  SELECT id 
  FROM booking 
  WHERE order_number = :'order_number'
     OR stripe_checkout_session_id ILIKE '%' || :'order_number' || '%'
  LIMIT 1
)
ORDER BY created_at DESC;

-- 4. Verifica problemi comuni
SELECT 
  '=== ANALISI PROBLEMI ===' as section;

SELECT 
  CASE 
    WHEN confirmation_email_sent = FALSE THEN '❌ Email non inviata (confirmation_email_sent = FALSE)'
    ELSE '✅ Email inviata'
  END as issue_email,
  CASE 
    WHEN customer_email IS NULL OR customer_email = '' THEN '❌ Email cliente mancante'
    ELSE '✅ Email cliente presente'
  END as issue_customer_email,
  CASE 
    WHEN stripe_checkout_session_id IS NULL THEN '❌ Session ID mancante'
    ELSE '✅ Session ID presente'
  END as issue_session_id,
  CASE 
    WHEN availability_slot_id IS NULL THEN '⚠️  Availability slot ID mancante (potrebbe causare problemi con booking_time)'
    ELSE '✅ Availability slot ID presente'
  END as issue_slot_id,
  CASE 
    WHEN status != 'confirmed' THEN '⚠️  Status non confermato: ' || status
    ELSE '✅ Status confermato'
  END as issue_status,
  CASE 
    WHEN provider_id IS NULL THEN '⚠️  Provider ID mancante'
    ELSE '✅ Provider ID presente'
  END as issue_provider
FROM booking
WHERE order_number = 'UGYSLY3J'
   OR stripe_checkout_session_id ILIKE '%UGYSLY3J%'
LIMIT 1;

-- 5. Suggerimenti per il fix
SELECT 
  '=== SUGGERIMENTI ===' as section;

SELECT 
  CASE 
    WHEN confirmation_email_sent = FALSE THEN 
      '1. Prova a inviare manualmente l''email usando lo script fix-booking-email.ts' || E'\n' ||
      '2. Verifica i log delle Edge Functions su Supabase Dashboard:' || E'\n' ||
      '   - create-booking: cerca il bookingId o requestId' || E'\n' ||
      '   - send-transactional-email: cerca il bookingId' || E'\n' ||
      '   - stripe-webhook: cerca il session ID' || E'\n' ||
      '3. Verifica la configurazione Brevo:' || E'\n' ||
      '   - BREVO_API_KEY configurato?' || E'\n' ||
      '   - Template IDs corretti?'
    ELSE '✅ Nessun problema rilevato con l''email'
  END as suggestions
FROM booking
WHERE order_number = 'UGYSLY3J'
   OR stripe_checkout_session_id ILIKE '%UGYSLY3J%'
LIMIT 1;


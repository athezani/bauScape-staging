-- Script per popolare retroattivamente idempotency_key per booking esistenti
-- Questo script genera un UUID univoco per ogni booking che non ha idempotency_key

-- ATTENZIONE: Esegui questo script solo se vuoi popolare retroattivamente
-- i booking esistenti. Non è necessario per il funzionamento del sistema.

-- Verifica quanti booking hanno idempotency_key NULL
SELECT 
  COUNT(*) as booking_senza_idempotency_key,
  COUNT(*) FILTER (WHERE idempotency_key IS NOT NULL) as booking_con_idempotency_key
FROM booking;

-- Popola idempotency_key per booking esistenti che non ce l'hanno
-- Usa stripe_checkout_session_id come base per generare un UUID determinista
-- oppure genera un nuovo UUID casuale
UPDATE booking
SET idempotency_key = gen_random_uuid()
WHERE idempotency_key IS NULL
AND stripe_checkout_session_id IS NOT NULL;

-- Verifica risultato
SELECT 
  COUNT(*) as booking_senza_idempotency_key,
  COUNT(*) FILTER (WHERE idempotency_key IS NOT NULL) as booking_con_idempotency_key
FROM booking;

-- Mostra alcuni esempi
SELECT 
  id,
  idempotency_key,
  stripe_checkout_session_id,
  status,
  created_at
FROM booking
WHERE idempotency_key IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;





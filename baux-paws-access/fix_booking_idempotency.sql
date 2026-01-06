-- Script per popolare idempotency_key per booking esistente
-- Usa questo per il booking con ordine #L2AP2TAZ

-- Trova il booking con ordine #L2AP2TAZ
SELECT 
  id,
  order_number,
  stripe_checkout_session_id,
  idempotency_key,
  created_at
FROM booking
WHERE order_number = 'L2AP2TAZ'
OR stripe_checkout_session_id LIKE '%L2AP2TAZ%'
ORDER BY created_at DESC
LIMIT 1;

-- Popola idempotency_key per questo booking specifico
-- Genera un UUID basato sul session_id per mantenere consistenza
UPDATE booking
SET idempotency_key = gen_random_uuid()
WHERE (order_number = 'L2AP2TAZ' OR stripe_checkout_session_id LIKE '%L2AP2TAZ%')
AND idempotency_key IS NULL;

-- Verifica risultato
SELECT 
  id,
  order_number,
  stripe_checkout_session_id,
  idempotency_key,
  created_at
FROM booking
WHERE order_number = 'L2AP2TAZ'
OR stripe_checkout_session_id LIKE '%L2AP2TAZ%'
ORDER BY created_at DESC
LIMIT 1;





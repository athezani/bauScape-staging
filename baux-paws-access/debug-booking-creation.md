# 🔍 Debug Booking Creation - Idempotency Key NULL

## Problema
I booking creati dopo la migrazione hanno ancora `idempotency_key = NULL`.

## Possibili Cause

### 1. La funzione create-booking non viene chiamata
- Verifica che `stripe-webhook` e `ensure-booking` chiamino effettivamente `create-booking`
- Controlla i logs delle funzioni

### 2. La funzione create-booking fallisce silenziosamente
- Verifica i logs: `npx supabase functions logs create-booking`
- Cerca errori nella chiamata RPC

### 3. La funzione transazionale non riceve l'idempotency_key
- Verifica che il parametro venga passato correttamente
- Controlla la firma della funzione

### 4. Fallback che crea booking direttamente
- Verifica che non ci siano altri punti nel codice che creano booking direttamente

## Test da Eseguire

### Test 1: Verifica Logs
```bash
npx supabase functions logs create-booking --project-ref zyonwzilijgnnnmhxvbo --limit 50
```

Cerca:
- `"phase": "transactional_booking"`
- `"idempotencyKey": "..."` (dovrebbe essere presente)
- Errori nella chiamata RPC

### Test 2: Test Diretto Funzione Transazionale
Esegui `test-booking-direct.sql` nel SQL Editor per testare direttamente la funzione database.

### Test 3: Verifica Booking Recenti
```sql
SELECT 
  id,
  order_number,
  idempotency_key,
  stripe_checkout_session_id,
  created_at,
  CASE 
    WHEN idempotency_key IS NULL THEN '❌ NULL'
    ELSE '✅ OK'
  END as status
FROM booking
ORDER BY created_at DESC
LIMIT 10;
```

### Test 4: Verifica Chiamata HTTP
Testa direttamente la funzione create-booking:
```bash
curl -X POST https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/create-booking \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "stripeCheckoutSessionId": "cs_test_...",
    "idempotencyKey": "test-key-123"
  }'
```

## Fix da Applicare

Se il problema persiste, potrebbe essere necessario:
1. Verificare che la funzione RPC restituisca correttamente i risultati
2. Aggiungere più logging nella funzione create-booking
3. Verificare che l'idempotency_key venga effettivamente salvato nel database





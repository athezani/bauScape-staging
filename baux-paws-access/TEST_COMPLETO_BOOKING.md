# 🧪 Test Completo Booking - Tutte le Tipologie

## ✅ Fix Applicati

1. ✅ Aggiunto controllo esplicito per verificare che `idempotency_key` sia salvato
2. ✅ Migliorato logging per debug
3. ✅ Deployata funzione aggiornata

## 🧪 Test da Eseguire

### Test 1: Test Diretto Funzione Database

Esegui `test-booking-direct.sql` nel SQL Editor di Supabase.

Questo script:
- Crea booking di test per experience, class e trip
- Verifica che tutti abbiano `idempotency_key` popolato
- Mostra un riepilogo dei risultati

**Esegui questo PRIMA di tutto per verificare che la funzione database funzioni correttamente.**

### Test 2: Test via Edge Function

Dopo aver verificato che la funzione database funziona, testa via HTTP:

```bash
# Test con session Stripe reale
curl -X POST https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/create-booking \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "stripeCheckoutSessionId": "cs_test_...",
    "idempotencyKey": "test-key-123"
  }'
```

### Test 3: Verifica Logs

Dopo ogni test, controlla i logs:

```bash
npx supabase functions logs create-booking --project-ref zyonwzilijgnnnmhxvbo --limit 20
```

Cerca:
- `"phase": "verify_idempotency"` - Dovrebbe mostrare se l'idempotency_key è stato verificato
- `"CRITICAL: Idempotency key is NULL"` - Se vedi questo, c'è un problema
- `"Idempotency key verified successfully"` - Questo significa che tutto è OK

### Test 4: Verifica Database

Dopo ogni test, verifica nel database:

```sql
SELECT 
  id,
  product_type,
  order_number,
  idempotency_key,
  CASE 
    WHEN idempotency_key IS NULL THEN '❌ NULL'
    ELSE '✅ OK'
  END as status,
  created_at
FROM booking
ORDER BY created_at DESC
LIMIT 5;
```

## 🔍 Debug

Se l'idempotency_key è ancora NULL:

1. **Verifica i logs** della funzione create-booking
2. **Controlla se la funzione transazionale viene chiamata** correttamente
3. **Verifica che l'idempotency_key venga passato** alla funzione RPC
4. **Controlla se ci sono errori** nella funzione transazionale

## 📋 Checklist

- [ ] Eseguito `test-booking-direct.sql` - Funzione database funziona?
- [ ] Testato via HTTP - Edge function funziona?
- [ ] Verificati logs - Ci sono errori?
- [ ] Verificato database - Idempotency key presente?
- [ ] Testato tutte e 3 le tipologie (experience, class, trip)

## 🎯 Obiettivo

Tutti i booking creati DOPO questi fix devono avere `idempotency_key` popolato.

Se dopo tutti questi test l'idempotency_key è ancora NULL, il problema è nella funzione transazionale stessa e dobbiamo verificare il codice SQL.





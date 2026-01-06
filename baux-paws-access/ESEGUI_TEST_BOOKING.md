# 🧪 Esegui Test Booking Automatici

## ⚠️ IMPORTANTE

Ho creato gli script di test, ma per eseguirli serve la **SUPABASE_SERVICE_ROLE_KEY**.

## 📋 Script Creati

1. **`test-booking-complete.sql`** - Test completo via SQL (consigliato)
2. **`test-booking-auto.js`** - Test automatico via Node.js
3. **`fix-idempotency-function.sql`** - Fix funzione transazionale (aggiunge validazione)

## 🚀 Come Eseguire i Test

### Opzione 1: Via SQL (Consigliato - Più Semplice)

1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new
2. Apri il file: `test-booking-complete.sql`
3. Copia tutto il contenuto
4. Incolla nel SQL Editor
5. Esegui

Lo script:
- ✅ Crea booking di test per experience, class e trip
- ✅ Verifica che abbiano idempotency_key
- ✅ Mostra un riepilogo completo

### Opzione 2: Via Node.js (Richiede Service Key)

```bash
cd baux-paws-access
export SUPABASE_SERVICE_ROLE_KEY="your-service-key"
node test-booking-auto.js
```

## 🔧 Fix Applicati

1. ✅ Aggiunta validazione `idempotency_key IS NOT NULL` nella funzione transazionale
2. ✅ Aggiunto controllo esplicito nella edge function
3. ✅ Migliorato logging per debug

## 📊 Cosa Verificare

Dopo aver eseguito i test, verifica:

```sql
SELECT 
  id,
  product_type,
  order_number,
  idempotency_key,
  CASE 
    WHEN idempotency_key IS NOT NULL THEN '✅ OK'
    ELSE '❌ NULL'
  END as status,
  created_at
FROM booking
WHERE stripe_checkout_session_id LIKE 'cs_test_%'
ORDER BY created_at DESC;
```

Tutti i booking di test dovrebbero avere `idempotency_key` popolato.

## 🆘 Se i Test Falliscono

1. **Verifica che la funzione transazionale sia aggiornata**:
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'create_booking_transactional';
   ```

2. **Esegui il fix della funzione**:
   - Apri `fix-idempotency-function.sql`
   - Esegui nel SQL Editor

3. **Controlla i logs** della funzione create-booking per vedere se ci sono errori





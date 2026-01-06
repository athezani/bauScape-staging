# Financial Tracking System - Implementation Summary

## ✅ Implementation Complete

Tutte le modifiche sono state implementate e sono pronte per il deployment.

## 📋 Modifiche Implementate

### 1. Database Schema

#### Tabelle Prodotto (experience, class, trip)
Aggiunti i seguenti campi:
- `pricing_model` ENUM('percentage', 'markup') - Modello di prezzo
- `margin_percentage` NUMERIC(5,2) - Margine percentuale (per modello percentage)
- `markup_adult` NUMERIC(10,2) - Markup per adulto (per modello markup)
- `markup_dog` NUMERIC(10,2) - Markup per cane (per modello markup)
- `provider_cost_adult_base` NUMERIC(10,2) - Costo fornitore base per adulto
- `provider_cost_dog_base` NUMERIC(10,2) - Costo fornitore base per cane

#### Tabella Booking
Aggiunti i seguenti campi:
- `provider_cost_total` NUMERIC(10,2) - Costo fornitore totale per la transazione
- `stripe_fee` NUMERIC(10,2) - Commissione Stripe effettiva
- `internal_margin` NUMERIC(10,2) - Margine interno (guadagno effettivo)
- `net_revenue` NUMERIC(10,2) - Ricavo netto

### 2. Logica di Calcolo Prezzo

#### Modello Percentage
```
prezzo_cliente = costo_fornitore_totale * (1 + margin_percentage / 100)
dove:
  costo_fornitore_totale = provider_cost_adult_base * num_adults + provider_cost_dog_base * num_dogs
```

#### Modello Markup
```
prezzo_cliente = costo_fornitore_totale + (markup_adult * num_adults) + (markup_dog * num_dogs)
dove:
  costo_fornitore_totale = provider_cost_adult_base * num_adults + provider_cost_dog_base * num_dogs
```

### 3. Calcolo Valori Finanziari

```
provider_cost_total = provider_cost_adult_base * number_of_adults + provider_cost_dog_base * number_of_dogs
stripe_fee = recuperato dall'API Stripe (PaymentIntent → Charge → BalanceTransaction)
internal_margin = total_amount_paid - provider_cost_total - stripe_fee
net_revenue = internal_margin
```

### 4. Recupero Commissione Stripe

Il sistema recupera la commissione Stripe effettiva dall'API:
1. Recupera PaymentIntent usando `payment_intent_id`
2. Estrae il Charge ID dal PaymentIntent
3. Recupera il Charge per ottenere `balance_transaction_id`
4. Recupera BalanceTransaction per ottenere la fee effettiva
5. La fee varia in base al metodo di pagamento utilizzato dal cliente

## 📁 File Modificati/Creati

### Migrazioni Database
- `supabase/migrations/20250115000000_add_pricing_model_to_products.sql`
- `supabase/migrations/20250115000001_add_financial_fields_to_booking.sql`
- `supabase/migrations/20250115000002_populate_products_with_placeholder_values.sql`
- `supabase/migrations/20250115000003_update_booking_transactional_function.sql`

### Edge Functions
- `supabase/functions/create-checkout-session/index.ts` - Calcolo prezzo in base al modello
- `supabase/functions/create-booking/index.ts` - Recupero commissione Stripe e calcolo valori finanziari

### Script di Verifica
- `verify_financial_tracking.sql` - Verifica struttura database
- `test_pricing_calculations.sql` - Test calcoli pricing
- `test_financial_system.sh` - Script di test completo

### Documentazione
- `DEPLOYMENT_CHECKLIST.md` - Checklist per deployment
- `FINANCIAL_TRACKING_IMPLEMENTATION.md` - Questo documento

## 🔄 Retrocompatibilità

Il sistema mantiene piena retrocompatibilità:
- Prodotti senza `pricing_model` usano il vecchio sistema (`price_adult_base`, `price_dog_base`)
- Se `provider_cost_adult_base` è NULL, il sistema funziona comunque
- Se la commissione Stripe non può essere recuperata, viene impostata a 0

## 🚀 Deployment Steps

1. **Applicare le migrazioni** (in ordine):
   ```bash
   # Via Supabase Dashboard SQL Editor o CLI
   # 1. 20250115000000_add_pricing_model_to_products.sql
   # 2. 20250115000001_add_financial_fields_to_booking.sql
   # 3. 20250115000002_populate_products_with_placeholder_values.sql
   # 4. 20250115000003_update_booking_transactional_function.sql
   ```

2. **Verificare le migrazioni**:
   ```bash
   psql $DATABASE_URL -f verify_financial_tracking.sql
   ```

3. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy create-checkout-session
   supabase functions deploy create-booking
   ```

4. **Test**:
   - Creare checkout session con prodotto percentage
   - Creare checkout session con prodotto markup
   - Verificare booking con dati finanziari

## 📊 Monitoraggio

### Query Utili

```sql
-- Verifica prodotti con pricing models
SELECT 
  'experience' as type,
  pricing_model,
  COUNT(*) as count
FROM experience WHERE active = true
GROUP BY pricing_model
UNION ALL
SELECT 'class', pricing_model, COUNT(*) FROM class WHERE active = true GROUP BY pricing_model
UNION ALL
SELECT 'trip', pricing_model, COUNT(*) FROM trip WHERE active = true GROUP BY pricing_model;

-- Verifica bookings con dati finanziari
SELECT 
  COUNT(*) as total,
  COUNT(provider_cost_total) as with_cost,
  COUNT(stripe_fee) as with_fee,
  COUNT(internal_margin) as with_margin,
  AVG(internal_margin) as avg_margin
FROM booking
WHERE created_at > NOW() - INTERVAL '7 days';

-- Bookings senza dati finanziari (da investigare)
SELECT id, order_number, created_at
FROM booking
WHERE created_at > NOW() - INTERVAL '7 days'
  AND (provider_cost_total IS NULL OR stripe_fee IS NULL)
ORDER BY created_at DESC;
```

## ⚠️ Note Importanti

1. **Commissione Stripe**: Se il PaymentIntent non è ancora completato o non è disponibile, la fee sarà 0. Questo è normale per alcuni casi edge.

2. **Costi Fornitore**: I costi fornitore base sono definiti a livello di prodotto. Per supportare costi variabili per slot/data, sarà necessario estendere la tabella `availability_slot`.

3. **Prodotti Esistenti**: Tutti i prodotti esistenti sono stati popolati con valori placeholder. Dovrai aggiornare questi valori con i costi reali.

4. **Testing**: Testa sempre con prodotti di test prima di andare in produzione.

## 🎯 Prossimi Passi

1. Applicare le migrazioni al database
2. Verificare che i prodotti abbiano i valori corretti
3. Testare il flusso completo: checkout → booking → verifica dati finanziari
4. Monitorare i log delle Edge Functions per eventuali errori
5. Aggiornare i costi fornitore con valori reali

## 📞 Supporto

In caso di problemi:
1. Verificare i log delle Edge Functions
2. Eseguire `verify_financial_tracking.sql`
3. Controllare che tutte le migrazioni siano state applicate
4. Verificare che le Edge Functions siano deployate correttamente


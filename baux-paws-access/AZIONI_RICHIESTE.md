# ⚠️ AZIONI RICHIESTE - Cosa devi fare tu

## ✅ Cosa è stato fatto automaticamente

1. ✅ **Funzioni deployate**:
   - `create-booking` → Deployata su Supabase
   - `stripe-webhook` → Deployata e aggiornata

2. ✅ **File aggiornati**:
   - `stripe-webhook/index.ts` → Ora usa `create-booking`
   - `ThankYouPage.tsx` → Ora usa `create-booking`
   - `config.toml` → Configurato per `create-booking`

3. ✅ **File creati**:
   - Migrazione database
   - Edge function refactored
   - Test e documentazione

## 🔴 COSA DEVI FARE TU (PRIORITÀ ALTA)

### 1. APPLICARE MIGRAZIONE DATABASE ⚠️ CRITICO

**Senza questa migrazione, il sistema NON funzionerà!**

#### Metodo Consigliato: Via Supabase Dashboard

1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new
2. Apri il file: `baux-paws-access/supabase/migrations/20251210000000_transactional_booking_system.sql`
3. Copia TUTTO il contenuto del file
4. Incolla nel SQL Editor di Supabase
5. Clicca "Run" per eseguire

#### Verifica che sia andata a buon fine:

Esegui questa query nel SQL Editor:

```sql
-- Dovrebbe restituire 1 riga
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'booking' AND column_name = 'idempotency_key';

-- Dovrebbe restituire 1 riga
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'booking_events';

-- Dovrebbe restituire 1 riga
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'create_booking_transactional';
```

Se tutte e 3 le query restituiscono risultati, la migrazione è applicata correttamente! ✅

### 2. BUILD E DEPLOY FRONTEND (se necessario)

Se hai modificato `ThankYouPage.tsx`, devi fare build e deploy:

```bash
cd ecommerce-homepage
npm run build
# Poi deploy su Vercel o il tuo hosting
```

**Nota**: Se il frontend è già in produzione e usi hot-reload, potrebbe non essere necessario.

### 3. TEST MANUALE (Consigliato)

Dopo aver applicato la migrazione:

1. **Completa un pagamento di test** su Stripe
2. **Verifica che il booking venga creato**:
   ```sql
   SELECT * FROM booking 
   WHERE stripe_checkout_session_id = 'cs_test_...'
   ORDER BY created_at DESC LIMIT 1;
   ```
3. **Verifica che l'evento sia stato creato**:
   ```sql
   SELECT * FROM booking_events 
   WHERE booking_id = '<booking-id-from-step-2>'
   ORDER BY created_at DESC LIMIT 1;
   ```
4. **Controlla i logs**:
   ```bash
   npx supabase functions logs create-booking --project-ref zyonwzilijgnnnmhxvbo
   ```

## 📋 Checklist

- [ ] **CRITICO**: Applicata migrazione database via Supabase Dashboard
- [ ] Verificata migrazione con query SQL
- [ ] Build e deploy frontend (se necessario)
- [ ] Test pagamento completo
- [ ] Verificati logs funzione
- [ ] Verificati eventi in `booking_events`

## 🆘 In caso di problemi

### Errore: "function create_booking_transactional does not exist"

**Soluzione**: La migrazione non è stata applicata. Applicala come descritto sopra.

### Errore: "column idempotency_key does not exist"

**Soluzione**: La migrazione non è stata applicata. Applicala come descritto sopra.

### Booking non viene creato

1. Controlla logs: `npx supabase functions logs create-booking`
2. Verifica che Stripe session sia "paid"
3. Verifica che metadata contenga tutti i campi

## 📚 Documentazione

- **Guida Completa**: `BOOKING_REFACTORING.md`
- **Riepilogo**: `RIEPILOGO_REFACTORING.md`
- **Deploy**: `DEPLOY_COMPLETATO.md`

---

**IMPORTANTE**: La migrazione database è **CRITICA**. Senza di essa, le funzioni deployate non funzioneranno correttamente!





# Booking System Refactoring - Documentazione Completa

## Panoramica

Questo documento descrive la refactoring completa del sistema di booking, implementando resilienza totale, idempotenza, transazionalità e architettura orientata agli eventi per l'integrazione futura con Odoo.

## Modifiche Implementate

### 1. Idempotenza Stripe

**Problema Risolto**: Prevenzione di doppi pagamenti e creazioni duplicate di booking.

**Soluzione**:
- Generazione automatica di **Idempotency Key** (UUID) all'inizio di ogni richiesta
- Passaggio della chiave a tutte le operazioni Stripe
- Constraint univoco su `idempotency_key` nella tabella `booking`
- Constraint univoco su `stripe_checkout_session_id` per doppia protezione
- Verifica esistenza booking prima della creazione

**Implementazione**:
```typescript
// Generazione idempotency key
const idempotencyKey = requestBody.idempotencyKey || crypto.randomUUID();

// Verifica esistenza
const { data: existingBooking } = await supabase
  .from('booking')
  .select('id')
  .or(`idempotency_key.eq.${idempotencyKey},stripe_checkout_session_id.eq.${sessionId}`)
  .maybeSingle();
```

**Database**:
```sql
ALTER TABLE booking ADD COLUMN idempotency_key UUID UNIQUE;
ALTER TABLE booking ADD CONSTRAINT booking_stripe_session_unique 
  UNIQUE (stripe_checkout_session_id);
```

---

### 2. Transazionalità e Prevenzione Race Condition

**Problema Risolto**: Overbooking quando più utenti prenotano l'ultimo slot contemporaneamente.

**Soluzione**:
- Funzione database transazionale `create_booking_transactional()` che:
  - Blocca la riga dello slot con `FOR UPDATE` (row-level locking)
  - Verifica capacità disponibile
  - Decrementa disponibilità atomically
  - Crea booking
  - Tutto in una singola transazione (tutto o niente)

**Implementazione**:
```sql
CREATE OR REPLACE FUNCTION create_booking_transactional(...)
RETURNS TABLE (booking_id UUID, success BOOLEAN, error_message TEXT)
AS $$
BEGIN
  -- Lock row per prevenire race conditions
  SELECT * INTO v_slot
  FROM availability_slot
  WHERE id = p_availability_slot_id
  FOR UPDATE;
  
  -- Verifica capacità
  -- Decrementa disponibilità
  -- Crea booking
  -- Tutto atomico
END;
$$;
```

**Vantaggi**:
- ✅ Nessun overbooking possibile
- ✅ Rollback automatico in caso di errore
- ✅ Operazione atomica garantita dal database

---

### 3. Architettura Orientata agli Eventi (Preparazione Odoo)

**Problema Risolto**: Necessità di integrazione futura con Odoo per:
- Modulo Vendite (Sales): registrazione ordini di vendita
- Modulo Contabilità (Accounting): gestione pagamenti e fatture

**Soluzione**:
- Tabella `booking_events` per eventi asincroni
- Trigger automatico che emette evento dopo creazione booking
- Eventi contengono tutti i dati necessari per Odoo
- Sistema di retry per eventi falliti

**Implementazione**:
```sql
-- Tabella eventi
CREATE TABLE booking_events (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES booking(id),
  event_type TEXT CHECK (event_type IN ('created', 'cancelled', 'modified')),
  event_data JSONB, -- Tutti i dati del booking
  status TEXT CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  retry_count INTEGER DEFAULT 0
);

-- Trigger automatico
CREATE TRIGGER booking_created_emit_event
AFTER INSERT ON booking
FOR EACH ROW
WHEN (NEW.status = 'confirmed')
EXECUTE FUNCTION auto_emit_booking_created_event();
```

**Struttura Evento**:
```json
{
  "id": "booking-uuid",
  "product_type": "experience",
  "provider_id": "provider-uuid",
  "customer_email": "customer@example.com",
  "total_amount_paid": 100.00,
  "currency": "EUR",
  "booking_date": "2024-12-15",
  // ... tutti i campi del booking
}
```

**Prossimi Passi per Odoo**:
1. Creare edge function che processa eventi `pending`
2. Inviare dati a Odoo API (Sales e Accounting)
3. Aggiornare status evento a `sent` o `failed`
4. Implementare retry logic per eventi falliti

---

### 4. Logging e Monitoraggio

**Problema Risolto**: Logging insufficiente per debugging e monitoraggio.

**Soluzione**:
- Logging strutturato JSON in ogni fase critica
- Request ID univoco per tracciare ogni richiesta
- Fasi logiche ben definite:
  1. `initialization`
  2. `environment_setup`
  3. `request_validation`
  4. `idempotency_check`
  5. `stripe_fetch`
  6. `data_extraction`
  7. `product_fetch`
  8. `booking_preparation`
  9. `transactional_booking`
  10. `event_emission`
  11. `email_confirmation`
  12. `completion`

**Implementazione**:
```typescript
interface LogContext {
  requestId: string;
  phase: string;
  [key: string]: any;
}

function logInfo(context: LogContext, message: string, data?: Record<string, any>) {
  console.log(JSON.stringify({
    level: 'INFO',
    timestamp: new Date().toISOString(),
    ...context,
    message,
    ...data,
  }));
}
```

**Esempio Log**:
```json
{
  "level": "INFO",
  "timestamp": "2024-12-10T10:30:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "phase": "transactional_booking",
  "message": "Creating booking transactionally",
  "idempotencyKey": "test-key-123"
}
```

---

## Nuova Edge Function: `create-booking`

### Caratteristiche

1. **Unificata**: Sostituisce logica duplicata tra `stripe-webhook` e `ensure-booking`
2. **Resiliente**: Gestisce tutti gli scenari di errore
3. **Idempotente**: Previene duplicati
4. **Transazionale**: Operazioni atomiche
5. **Event-Driven**: Emette eventi automaticamente
6. **Loggata**: Tracciabilità completa

### Utilizzo

**Da Stripe Webhook**:
```typescript
// Nel webhook handler
const response = await fetch(`${supabaseUrl}/functions/v1/create-booking`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    stripeCheckoutSessionId: session.id,
  }),
});
```

**Da Frontend (Fallback)**:
```typescript
// Dalla thank you page
const response = await fetch(`${supabaseUrl}/functions/v1/create-booking`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    stripeCheckoutSessionId: sessionId,
    idempotencyKey: 'optional-key', // Opzionale
  }),
});
```

### Response

**Successo**:
```json
{
  "success": true,
  "bookingId": "uuid",
  "idempotencyKey": "uuid",
  "alreadyExisted": false,
  "message": "Booking created successfully"
}
```

**Già Esistente (Idempotenza)**:
```json
{
  "success": true,
  "bookingId": "uuid",
  "alreadyExisted": true,
  "message": "Booking already exists"
}
```

**Errore**:
```json
{
  "success": false,
  "error": "Error message",
  "requestId": "uuid"
}
```

---

## Migrazione Database

### File: `20251210000000_transactional_booking_system.sql`

**Modifiche**:
1. Aggiunta colonna `idempotency_key` a `booking`
2. Creazione tabella `booking_events`
3. Creazione funzione `create_booking_transactional()`
4. Creazione funzione `emit_booking_event()`
5. Creazione trigger `booking_created_emit_event`
6. Aggiunta constraint univoco su `stripe_checkout_session_id`

**Applicazione**:
```bash
# Applica migrazione
npx supabase migration up

# Verifica
npx supabase db diff
```

---

## Testing

### Unit Tests

File: `supabase/functions/create-booking/test.ts`

Testa:
- Generazione idempotency keys
- Formattazione order numbers
- Estrazione nomi clienti

### Integration Tests

File: `supabase/functions/create-booking/integration-tests.md`

Scenari testati:
1. **Idempotency**: Prevenzione duplicati
2. **Race Condition**: Prevenzione overbooking
3. **Database Failure**: Verifica rollback
4. **Event Emission**: Verifica creazione eventi

**Esecuzione**:
```bash
# Setup
export SUPABASE_URL="..."
export SUPABASE_SERVICE_ROLE_KEY="..."
export STRIPE_SECRET_KEY="..."

# Deploy
npx supabase functions deploy create-booking

# Test manuale
curl -X POST https://your-project.supabase.co/functions/v1/create-booking \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"stripeCheckoutSessionId": "cs_test_..."}'
```

---

## Estensibilità per Future Funzionalità

### Cancellazioni

Il sistema è già preparato:
- Evento `cancelled` in `booking_events`
- Trigger per aggiornamento status
- Funzione `update_availability_on_booking_cancel()` già esistente

**Implementazione Futura**:
```sql
-- Trigger per evento cancellazione
CREATE TRIGGER booking_cancelled_emit_event
AFTER UPDATE OF status ON booking
FOR EACH ROW
WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
EXECUTE FUNCTION emit_booking_event(NEW.id, 'cancelled');
```

### Modifiche Numero Partecipanti

Preparato per:
- Evento `modified` in `booking_events`
- Aggiornamento disponibilità quando partecipanti cambiano

**Implementazione Futura**:
```sql
-- Trigger per evento modifica
CREATE TRIGGER booking_modified_emit_event
AFTER UPDATE ON booking
FOR EACH ROW
WHEN (
  OLD.number_of_adults != NEW.number_of_adults OR
  OLD.number_of_dogs != NEW.number_of_dogs
)
EXECUTE FUNCTION emit_booking_event(NEW.id, 'modified');
```

---

## Integrazione Odoo (Prossimi Passi)

### 1. Processore Eventi

Creare edge function `process-booking-events`:
```typescript
// Processa eventi pending
const { data: events } = await supabase
  .from('booking_events')
  .select('*')
  .eq('status', 'pending')
  .order('created_at', { ascending: true })
  .limit(10);

for (const event of events) {
  // Invia a Odoo
  await sendToOdoo(event);
  
  // Aggiorna status
  await supabase
    .from('booking_events')
    .update({ status: 'sent', processed_at: new Date() })
    .eq('id', event.id);
}
```

### 2. Mapping Dati per Odoo

**Sales Module**:
- `event_data->>'customer_email'` → Customer
- `event_data->>'product_name'` → Product
- `event_data->>'total_amount_paid'` → Amount
- `event_data->>'booking_date'` → Date

**Accounting Module**:
- `event_data->>'stripe_payment_intent_id'` → Payment Reference
- `event_data->>'total_amount_paid'` → Amount
- `event_data->>'currency'` → Currency

---

## Deployment

### 1. Applica Migrazione Database

```bash
cd baux-paws-access
npx supabase migration up
```

### 2. Deploy Edge Function

```bash
npx supabase functions deploy create-booking
```

### 3. Aggiorna Webhook Stripe

Nel webhook handler, chiama `create-booking` invece di creare booking direttamente:

```typescript
// Vecchio (stripe-webhook)
const { data: booking } = await supabase.from('booking').insert(...);

// Nuovo
const response = await fetch(`${supabaseUrl}/functions/v1/create-booking`, {
  method: 'POST',
  body: JSON.stringify({ stripeCheckoutSessionId: session.id }),
});
```

### 4. Aggiorna Frontend

Nella thank you page, usa `create-booking`:

```typescript
// Vecchio (ensure-booking)
const response = await fetch(`${supabaseUrl}/functions/v1/ensure-booking`, ...);

// Nuovo
const response = await fetch(`${supabaseUrl}/functions/v1/create-booking`, {
  method: 'POST',
  body: JSON.stringify({ stripeCheckoutSessionId: sessionId }),
});
```

---

## Monitoraggio

### Logs

```bash
# Visualizza logs
npx supabase functions logs create-booking

# Filtra per request ID
npx supabase functions logs create-booking | grep "requestId"
```

### Metriche da Monitorare

1. **Tasso di Successo**: `success: true` vs `success: false`
2. **Idempotency Hits**: `alreadyExisted: true`
3. **Errori di Capacità**: Errori "Insufficient capacity"
4. **Eventi Emessi**: Count di `booking_events` con `status = 'pending'`
5. **Tempo di Risposta**: Tempo tra richiesta e risposta

### Query Utili

```sql
-- Booking creati oggi
SELECT COUNT(*) FROM booking 
WHERE DATE(created_at) = CURRENT_DATE;

-- Eventi pending
SELECT COUNT(*) FROM booking_events 
WHERE status = 'pending';

-- Errori recenti (da logs)
-- Verificare logs function per errori

-- Tasso idempotency
SELECT 
  COUNT(*) FILTER (WHERE idempotency_key IS NOT NULL) as with_key,
  COUNT(*) as total
FROM booking;
```

---

## Conclusioni

### Vantaggi Ottenuti

1. ✅ **Resilienza Totale**: Nessun booking perso, anche in caso di errori
2. ✅ **Idempotenza**: Prevenzione duplicati garantita
3. ✅ **Transazionalità**: Overbooking impossibile
4. ✅ **Event-Driven**: Pronto per integrazione Odoo
5. ✅ **Tracciabilità**: Logging completo per debugging
6. ✅ **Estensibilità**: Facile aggiungere cancellazioni e modifiche

### Prossimi Passi

1. Deploy in produzione
2. Monitoraggio per 1 settimana
3. Implementare processore eventi per Odoo
4. Aggiungere funzionalità cancellazione
5. Aggiungere funzionalità modifica partecipanti

---

## Supporto

Per domande o problemi:
1. Verificare logs: `npx supabase functions logs create-booking`
2. Consultare test: `supabase/functions/create-booking/integration-tests.md`
3. Verificare database: Query su `booking` e `booking_events`





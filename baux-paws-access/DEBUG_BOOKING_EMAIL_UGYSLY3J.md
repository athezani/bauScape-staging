# Debug Email Booking #UGYSLY3J

## Problema
La mail di conferma transazionale non è stata inviata per il booking #UGYSLY3J.

## Step 1: Verifica Stato Booking nel Database

### Opzione A: Via Supabase Dashboard
1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il progetto: **zyonwzilijgnnnmhxvbo**
3. Vai su **Table Editor** → **booking**
4. Cerca il booking con `order_number = 'UGYSLY3J'` o `stripe_checkout_session_id` che termina con `UGYSLY3J`
5. Verifica:
   - `confirmation_email_sent`: dovrebbe essere `false` se l'email non è stata inviata
   - `customer_email`: deve essere presente
   - `stripe_checkout_session_id`: deve essere presente
   - `availability_slot_id`: verifica se presente (necessario per booking_time)
   - `status`: dovrebbe essere `confirmed`

### Opzione B: Via SQL Query
Esegui questa query nel SQL Editor di Supabase:

```sql
SELECT 
  id,
  order_number,
  confirmation_email_sent,
  customer_email,
  stripe_checkout_session_id,
  availability_slot_id,
  status,
  created_at,
  product_name,
  booking_date,
  booking_time
FROM booking
WHERE order_number = 'UGYSLY3J'
   OR stripe_checkout_session_id ILIKE '%UGYSLY3J%'
ORDER BY created_at DESC
LIMIT 1;
```

## Step 2: Verifica Log Edge Functions

### A. Log create-booking
1. Vai su **Edge Functions** → **create-booking** → **Logs**
2. Cerca log relativi al booking:
   - Cerca per `bookingId` (ID del booking dal database)
   - Cerca per `requestId` (se disponibile)
   - Cerca per `orderNumber: "UGYSLY3J"`
   - Cerca per `phase: "email_confirmation"`

**Cosa cercare:**
- ✅ `"Sending confirmation email"` - indica che il processo è iniziato
- ✅ `"Confirmation email sent successfully"` - email inviata con successo
- ❌ `"Email sending failed"` - errore durante l'invio
- ❌ `"Email sending error"` - errore nella funzione email
- ⚠️  `"confirmation_email_sent: false"` - flag impostato a false

**Esempio di log positivo:**
```json
{
  "level": "INFO",
  "phase": "email_confirmation",
  "message": "Sending confirmation email",
  "bookingId": "..."
}
```

**Esempio di log negativo:**
```json
{
  "level": "WARN",
  "phase": "email_confirmation",
  "message": "Email sending failed",
  "error": { ... }
}
```

### B. Log send-transactional-email
1. Vai su **Edge Functions** → **send-transactional-email** → **Logs**
2. Cerca log relativi al booking:
   - Cerca per `bookingId` (ID del booking)
   - Cerca per `orderNumber: "UGYSLY3J"`

**Cosa cercare:**
- ✅ `"=== SENDING TRANSACTIONAL EMAIL ==="` - funzione chiamata
- ✅ `"Template selection:"` - template selezionato
- ✅ `"Email sent successfully:"` - email inviata via Brevo
- ❌ Errori Brevo API (401, 403, 404, 500, etc.)
- ❌ `"Failed to send email"` - errore generico

**Esempio di log positivo:**
```json
{
  "message": "=== SENDING TRANSACTIONAL EMAIL ===",
  "bookingId": "...",
  "orderNumber": "UGYSLY3J"
}
```

**Esempio di log negativo:**
```json
{
  "error": "Brevo API error: 401 Unauthorized",
  "message": "Failed to send email"
}
```

### C. Log stripe-webhook
1. Vai su **Edge Functions** → **stripe-webhook** → **Logs**
2. Cerca log relativi alla sessione Stripe:
   - Cerca per `session.id` che termina con `UGYSLY3J`
   - Cerca per `bookingId`

**Cosa cercare:**
- ✅ `"Email not sent by create-booking, sending as fallback..."` - fallback attivato
- ✅ `"Fallback email sent successfully"` - email inviata via fallback
- ❌ `"Fallback email sending failed"` - errore nel fallback
- ⚠️  `"Email already sent by create-booking, skipping"` - email già inviata

## Step 3: Verifica Configurazione Brevo

### A. Verifica BREVO_API_KEY
1. Vai su **Edge Functions** → **Secrets**
2. Verifica che `BREVO_API_KEY` sia presente e configurato
3. Se mancante, aggiungilo:
   ```bash
   npx supabase secrets set BREVO_API_KEY=your_brevo_api_key --project-ref zyonwzilijgnnnmhxvbo
   ```

### B. Verifica Template IDs
1. Verifica che siano configurati:
   - `BREVO_TEMPLATE_ID` (default: 2) - per prodotti normali
   - `BREVO_TEMPLATE_ID_NO_ADULTS` (default: 3) - per prodotti "no_adults"
2. Verifica che i template esistano in Brevo Dashboard e siano pubblicati

### C. Verifica Log Brevo
1. Vai su [Brevo Dashboard](https://app.brevo.com/)
2. Vai su **Transactional** → **Emails** → **Logs**
3. Cerca email inviate all'indirizzo del cliente
4. Verifica:
   - Se l'email è stata inviata
   - Se c'è un errore di consegna
   - Se l'email è in spam

## Step 4: Possibili Cause e Soluzioni

### Causa 1: Errore durante l'invio in create-booking
**Sintomi:**
- Log mostra `"Email sending failed"` o `"Email sending error"`
- `confirmation_email_sent = false`

**Soluzione:**
1. Verifica l'errore specifico nei log
2. Se è un errore Brevo API, verifica la configurazione
3. Prova a inviare manualmente l'email usando lo script di fix

### Causa 2: Errore in send-transactional-email
**Sintomi:**
- Log mostra errori Brevo API (401, 403, 404, 500)
- Email non inviata

**Soluzione:**
1. Verifica `BREVO_API_KEY` configurato correttamente
2. Verifica che i template IDs esistano e siano pubblicati
3. Verifica i log Brevo per errori specifici

### Causa 3: Booking creato ma email non tentata
**Sintomi:**
- Booking esiste nel database
- `confirmation_email_sent = false`
- Nessun log di tentativo di invio email

**Soluzione:**
1. Verifica che il booking sia stato creato tramite `create-booking` e non direttamente
2. Se creato direttamente, invia manualmente l'email
3. Verifica che il webhook Stripe sia stato chiamato correttamente

### Causa 4: Availability slot mancante
**Sintomi:**
- `availability_slot_id = NULL`
- `booking_time = NULL` o mancante nell'email

**Soluzione:**
1. Questo non dovrebbe impedire l'invio dell'email, ma potrebbe causare problemi con il contenuto
2. Verifica che il booking abbia un `availability_slot_id` se necessario

## Step 5: Fix Manuale

Se hai identificato il problema e vuoi inviare manualmente l'email:

### Opzione A: Script TypeScript
```bash
cd baux-paws-access
export SUPABASE_SERVICE_ROLE_KEY=your_service_key
deno run --allow-net --allow-env fix-booking-email.ts UGYSLY3J
```

### Opzione B: Chiamata Diretta API
Usa la funzione `send-transactional-email` direttamente con i dati del booking.

## Step 6: Prevenzione Futura

1. **Monitoraggio**: Configura alert per booking con `confirmation_email_sent = false`
2. **Retry Logic**: Implementa retry automatico per email fallite
3. **Logging**: Assicurati che tutti gli errori siano loggati correttamente
4. **Testing**: Testa regolarmente il flusso di invio email

## Checklist Rapida

- [ ] Booking esiste nel database
- [ ] `confirmation_email_sent = false`
- [ ] `customer_email` presente
- [ ] `stripe_checkout_session_id` presente
- [ ] Log `create-booking` verificati
- [ ] Log `send-transactional-email` verificati
- [ ] Log `stripe-webhook` verificati (se applicabile)
- [ ] `BREVO_API_KEY` configurato
- [ ] Template IDs corretti
- [ ] Log Brevo verificati
- [ ] Problema identificato
- [ ] Fix applicato
- [ ] Email inviata manualmente (se necessario)




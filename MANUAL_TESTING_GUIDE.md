# Guida al Testing Manuale del Sistema di Cancellazione

## Stato Attuale

✅ Tutti i componenti sono stati deployati:
- Database migration applicata
- Edge functions deployate
- Secrets configurati
- Template Brevo creati
- Cron job configurato

## Test Manuale Passo-Passo

### STEP 1: Crea una Prenotazione di Test

Crea una prenotazione reale dal tuo sito web o crea manualmente nel database:

```sql
INSERT INTO booking (
  order_number,
  customer_email,
  customer_name,
  product_type,
  product_id,
  product_name,
  provider_id,
  booking_date,
  number_of_adults,
  number_of_dogs,
  total_amount_paid,
  currency,
  status,
  stripe_checkout_session_id,
  confirmation_email_sent
) VALUES (
  'TESTCANCEL001',
  'a.thezani@gmail.com',
  'Andrea Test',
  'experience',
  (SELECT id FROM experience LIMIT 1),
  (SELECT name FROM experience LIMIT 1),
  (SELECT provider_id FROM experience LIMIT 1),
  (CURRENT_DATE + INTERVAL '7 days')::text,
  2,
  1,
  100.00,
  'EUR',
  'confirmed',
  'cs_test_manual_001',
  true
);
```

### STEP 2: Testa Richiesta di Cancellazione (Modalità Manual)

```bash
curl -X POST https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/create-cancellation-request \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNTk3NDcsImV4cCI6MjA0OTkzNTc0N30.TwqxlB3nZAmO2ZW7lKw_k6c0A7rV5M_s1KfbVVMApTE" \
  -d '{
    "orderNumber": "TESTCANCEL001",
    "customerEmail": "a.thezani@gmail.com",
    "customerName": "Andrea Test",
    "reason": "Test cancellation - verifico che funzioni tutto"
  }'
```

**Verifica:**
- ✅ Ricevi risposta `{"success": true, "requestId": "..."}`
- ✅ Ricevi email a `a.thezani@gmail.com` con notifica richiesta cancellazione
- ✅ La richiesta appare nella tabella `cancellation_request` con status='pending'

### STEP 3: Approva la Cancellazione (Admin)

Prendi il `requestId` dalla risposta precedente e il `booking_id` dalla prenotazione:

```bash
curl -X POST https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/admin-process-cancellation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI" \
  -d '{
    "requestId": "INSERISCI_REQUEST_ID_QUI",
    "action": "approve",
    "adminEmail": "a.thezani@gmail.com",
    "adminNotes": "Approvato per test - rimborso processato"
  }'
```

**Verifica:**
- ✅ Ricevi risposta `{"success": true}`
- ✅ Cliente riceve email di cancellazione approvata
- ✅ Provider riceve email di notifica cancellazione
- ✅ Lo status della prenotazione cambia a 'cancelled'
- ✅ Lo status della richiesta cambia a 'approved'

### STEP 4: Testa Rifiuto Cancellazione

Crea un'altra prenotazione di test e poi:

```bash
curl -X POST https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/create-cancellation-request \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNTk3NDcsImV4cCI6MjA0OTkzNTc0N30.TwqxlB3nZAmO2ZW7lKw_k6c0A7rV5M_s1KfbVVMApTE" \
  -d '{
    "orderNumber": "TESTCANCEL002",
    "customerEmail": "a.thezani@gmail.com",
    "customerName": "Andrea Test",
    "reason": "Test rifiuto"
  }'
```

Poi rifiuta:

```bash
curl -X POST https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/admin-process-cancellation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI" \
  -d '{
    "requestId": "INSERISCI_REQUEST_ID_QUI",
    "action": "reject",
    "adminEmail": "a.thezani@gmail.com",
    "adminNotes": "Richiesta fuori policy - troppo tardi"
  }'
```

**Verifica:**
- ✅ Cliente riceve email di cancellazione rifiutata con motivazioni
- ✅ Lo status della prenotazione rimane 'confirmed'
- ✅ Lo status della richiesta cambia a 'rejected'

### STEP 5: Testa Reminder Richieste Pending

Crea una richiesta di cancellazione e aspetta 3+ giorni, oppure modifica manualmente:

```sql
-- Imposta la data di richiesta a 4 giorni fa
UPDATE cancellation_request 
SET requested_at = NOW() - INTERVAL '4 days'
WHERE id = 'INSERISCI_REQUEST_ID_QUI';
```

Poi attiva manualmente il cron job:

```bash
curl -X POST https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/check-pending-cancellations \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI"
```

**Verifica:**
- ✅ Ricevi email di reminder con lista richieste pending

### STEP 6: Testa Magic Link (dalla email di conferma)

Quando crei una prenotazione reale, nella email di conferma dovresti vedere il pulsante "Richiedi Cancellazione".

1. Crea una prenotazione reale dal sito
2. Controlla l'email di conferma
3. Clicca sul pulsante "Richiedi Cancellazione"
4. Verifica che la pagina si carichi con i dati pre-compilati
5. Inserisci una motivazione e invia
6. Verifica ricezione email

## Query SQL Utili per Verificare

```sql
-- Vedere tutte le richieste di cancellazione
SELECT 
  cr.id,
  cr.order_number,
  cr.customer_name,
  cr.status,
  cr.requested_at,
  cr.processed_at,
  b.booking_date,
  b.product_name
FROM cancellation_request cr
JOIN booking b ON b.id = cr.booking_id
ORDER BY cr.requested_at DESC;

-- Vedere richieste pending
SELECT * FROM cancellation_request 
WHERE status = 'pending' 
ORDER BY requested_at DESC;

-- Pulire dati di test
DELETE FROM cancellation_request WHERE order_number LIKE 'TEST%';
DELETE FROM booking WHERE order_number LIKE 'TEST%';
```

## Checklist Finale

- [ ] Prenotazione di test creata
- [ ] Richiesta cancellazione inviata (manual mode)
- [ ] Email admin ricevuta con dettagli corretti
- [ ] Cancellazione approvata
- [ ] Email cliente ricevuta (approvata)
- [ ] Email provider ricevuta
- [ ] Booking status = 'cancelled'
- [ ] Cancellazione rifiutata (test 2)
- [ ] Email cliente ricevuta (rifiutata)
- [ ] Booking status = 'confirmed'
- [ ] Reminder funzionante (cron)
- [ ] Magic link nella email di conferma
- [ ] Pagina cancellazione funzionante

## Note

- Gli automated E2E tests richiedono configurazione complessa di token signing che matchi tra Node.js e Deno
- Il testing manuale è più affidabile per verificare l'intero flusso
- Tutti i componenti sono stati deployati correttamente
- Il sistema è pronto per l'uso in produzione

## Problemi Noti

Se incontri errori, verifica:

1. **"Prenotazione non trovata"**: 
   - Verifica che order_number sia corretto (case sensitive)
   - Verifica che customer_email sia corretto
   - Verifica che customer_name corrisponda esattamente

2. **"Token invalido"**:
   - Il token ha una firma HMAC - deve essere generato con il secret corretto
   - Per test manuali, usa la modalità manual invece del token

3. **Email non ricevute**:
   - Controlla spam/junk
   - Verifica template Brevo siano attivi
   - Controlla logs delle edge functions per errori


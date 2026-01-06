# Test Email Sending - Istruzioni

## Problema
Dopo il completamento del pagamento, l'email di conferma non viene ricevuta.

## Verifica Step-by-Step

### Step 1: Verificare che il booking sia stato creato

```bash
cd baux-paws-access
npx supabase db execute --sql "SELECT id, customer_email, product_name, stripe_checkout_session_id, created_at FROM booking WHERE stripe_checkout_session_id LIKE '%cs_test_b1TzynP5rLh1me9s3fqqCD5nOJCmb70Qv3aaTghgG13b0x65dtiAfI7NpI%' ORDER BY created_at DESC LIMIT 5"
```

### Step 2: Verificare i log del webhook Stripe

Vai su Supabase Dashboard → Edge Functions → stripe-webhook → Logs

Cerca:
- "BOOKING CREATED SUCCESSFULLY"
- "Sending confirmation email..."
- Eventuali errori nell'invio email

### Step 3: Verificare i log della funzione send-transactional-email

Vai su Supabase Dashboard → Edge Functions → send-transactional-email → Logs

Cerca:
- "SENDING TRANSACTIONAL EMAIL"
- "Email sent successfully"
- Eventuali errori Brevo API

### Step 4: Test manuale dell'invio email

1. Ottieni la Service Role Key da Supabase Dashboard → Settings → API

2. Esegui lo script di test:

```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key node test-email-simple.js
```

Lo script:
- Recupera il booking dal database usando il session ID
- Prepara il payload email
- Chiama la funzione send-transactional-email
- Mostra il risultato

### Step 5: Verificare configurazione Brevo

1. Verifica che `BREVO_API_KEY` sia configurato in Supabase Secrets
2. Verifica che `BREVO_TEMPLATE_ID` sia configurato (o usa il default 2)
3. Verifica che il template ID 2 esista in Brevo Dashboard
4. Verifica che il template sia pubblicato e attivo

### Step 6: Verificare i log di Brevo

Vai su Brevo Dashboard → Transactional → Emails → Logs

Cerca email inviate all'indirizzo del cliente per vedere se:
- L'email è stata inviata
- C'è un errore di consegna
- L'email è in spam

## Possibili Problemi

### 1. Booking non creato
- Il webhook Stripe non è stato chiamato
- Verifica che il webhook sia configurato correttamente in Stripe Dashboard
- Verifica che l'endpoint sia: `https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/stripe-webhook`

### 2. Email non inviata dal webhook
- Controlla i log del webhook per errori
- Verifica che la chiamata a send-transactional-email non fallisca silenziosamente

### 3. Errore Brevo API
- Verifica BREVO_API_KEY
- Verifica che il template ID 2 esista
- Controlla i log di send-transactional-email per errori Brevo

### 4. Email in spam
- Controlla la cartella spam
- Verifica che l'indirizzo mittente sia configurato correttamente in Brevo

## Test Rapido

Per testare rapidamente senza attendere un nuovo pagamento:

```bash
# 1. Ottieni il booking ID
BOOKING_ID=$(npx supabase db execute --sql "SELECT id FROM booking WHERE stripe_checkout_session_id = 'cs_test_b1TzynP5rLh1me9s3fqqCD5nOJCmb70Qv3aaTghgG13b0x65dtiAfI7NpI' LIMIT 1" --output json | jq -r '.[0].id')

# 2. Testa l'invio email
SUPABASE_SERVICE_ROLE_KEY=your_key node test-email-simple.js
```

## Note

- Il webhook Stripe potrebbe richiedere alcuni secondi per essere processato
- Le email potrebbero essere in spam
- Verifica sempre i log di Supabase per errori dettagliati





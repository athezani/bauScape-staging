# Debug Email Issue - Ordine #BHWY3TJS

## Problema
L'email di conferma non viene inviata dopo la creazione del booking.

## Checklist di Verifica

### 1. Verifica Booking Esistente
```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=your_key deno run --allow-net --allow-env test-email-order.ts BHWY3TJS
```

### 2. Verifica Configurazione Brevo

#### A. Verifica BREVO_API_KEY
```bash
npx supabase secrets list --project-ref zyonwzilijgnnnmhxvbo
```
Deve essere presente `BREVO_API_KEY`

#### B. Verifica Template IDs
- `BREVO_TEMPLATE_ID` (default: 2) - per prodotti normali
- `BREVO_TEMPLATE_ID_NO_ADULTS` (default: 3) - per prodotti "no_adults"

### 3. Verifica Log Edge Functions

#### A. Log stripe-webhook
1. Vai su Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
2. Cerca log relativi all'ordine BHWY3TJS
3. Verifica:
   - "BOOKING CREATED SUCCESSFULLY"
   - "Sending confirmation email..."
   - Eventuali errori

#### B. Log ensure-booking
1. Vai su Supabase Dashboard → Edge Functions → `ensure-booking` → Logs
2. Cerca log relativi all'ordine BHWY3TJS
3. Verifica:
   - "Booking already exists" o "BOOKING CREATED SUCCESSFULLY"
   - "Sending confirmation email..."
   - Eventuali errori

#### C. Log send-transactional-email
1. Vai su Supabase Dashboard → Edge Functions → `send-transactional-email` → Logs
2. Cerca log relativi all'ordine BHWY3TJS
3. Verifica:
   - "=== SENDING TRANSACTIONAL EMAIL ==="
   - "Template selection:"
   - "Email sent successfully:" o errori Brevo API

### 4. Verifica Template Brevo

#### A. Template ID 2 (prodotti normali)
1. Vai su Brevo Dashboard → Transactional → Email Templates
2. Verifica che il template ID 2 esista
3. Verifica che sia pubblicato e attivo
4. Verifica che tutti i placeholder siano corretti:
   - `{{ params.CUSTOMER_NAME }}`
   - `{{ params.CUSTOMER_SURNAME }}`
   - `{{ params.PRODUCT_NAME }}`
   - `{{ params.PRODUCT_DESCRIPTION }}`
   - `{{ params.PRODUCT_DESCRIPTION_DISPLAY }}`
   - `{{ params.PRODUCT_TYPE }}`
   - `{{ params.BOOKING_DATE }}`
   - `{{ params.BOOKING_TIME }}`
   - `{{ params.BOOKING_TIME_DISPLAY }}`
   - `{{ params.NUMBER_OF_ADULTS }}`
   - `{{ params.NUMBER_OF_ADULTS_DISPLAY }}`
   - `{{ params.NUMBER_OF_DOGS }}`
   - `{{ params.NUMBER_OF_DOGS_DISPLAY }}`
   - `{{ params.TOTAL_AMOUNT }}`
   - `{{ params.CURRENCY }}`
   - `{{ params.ORDER_NUMBER }}`
   - `{{ params.BOOKING_ID }}`

#### B. Template ID 3 (prodotti no_adults)
1. Vai su Brevo Dashboard → Transactional → Email Templates
2. Verifica che il template ID 3 esista
3. Verifica che sia pubblicato e attivo
4. Verifica che sia identico al template ID 2 ma senza la sezione "Partecipanti"

### 5. Verifica Log Brevo

1. Vai su Brevo Dashboard → Transactional → Emails → Logs
2. Cerca email inviate all'indirizzo del cliente
3. Verifica:
   - Se l'email è stata inviata
   - Se c'è un errore di consegna
   - Se l'email è in spam

### 6. Test Manuale

Esegui lo script di test:
```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=your_key deno run --allow-net --allow-env test-email-order.ts BHWY3TJS
```

Lo script:
1. Cerca il booking con order_number = BHWY3TJS
2. Recupera i dettagli del prodotto
3. Prepara il payload email
4. Chiama send-transactional-email
5. Mostra il risultato

## Possibili Problemi e Soluzioni

### Problema 1: BREVO_API_KEY non configurato
**Sintomo**: Errore "BREVO_API_KEY is not set" nei log
**Soluzione**: 
```bash
npx supabase secrets set BREVO_API_KEY=your_brevo_api_key --project-ref zyonwzilijgnnnmhxvbo
```

### Problema 2: Template ID non esiste
**Sintomo**: Errore "Template not found" nei log Brevo
**Soluzione**: 
1. Crea il template in Brevo Dashboard
2. Verifica che l'ID corrisponda a quello configurato

### Problema 3: Template ID non pubblicato
**Sintomo**: Errore "Template not active" nei log Brevo
**Soluzione**: 
1. Vai su Brevo Dashboard → Transactional → Email Templates
2. Pubblica il template

### Problema 4: Placeholder mancanti nel template
**Sintomo**: Email inviata ma con placeholder vuoti
**Soluzione**: 
1. Verifica che tutti i placeholder nel template siano corretti
2. Verifica che tutti i parametri vengano passati dalla funzione

### Problema 5: Email in spam
**Sintomo**: Email inviata ma non ricevuta
**Soluzione**: 
1. Verifica la cartella spam
2. Verifica la configurazione SPF/DKIM in Brevo

## Comandi Utili

### Verifica secrets
```bash
npx supabase secrets list --project-ref zyonwzilijgnnnmhxvbo
```

### Test invio email
```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=your_key deno run --allow-net --allow-env test-email-order.ts BHWY3TJS
```

### Verifica log Edge Functions
Vai su Supabase Dashboard → Edge Functions → [function-name] → Logs

### Verifica log Brevo
Vai su Brevo Dashboard → Transactional → Emails → Logs





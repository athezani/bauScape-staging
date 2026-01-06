# Test Seamless Checkout - Verifica Flusso Completo

## Obiettivo
Verificare che il checkout interno passi correttamente tutti i dati a Stripe, evitando doppie richieste all'utente e garantendo che Odoo riceva tutti i dati necessari.

## Test 1: Verifica Dati Cliente Passati a Stripe

### Input (Checkout Interno)
- Nome: "Mario"
- Cognome: "Rossi"
- Email: "mario.rossi@example.com"
- Telefono: "+393401234567"
- Codice Fiscale: "RSSMRA80A01H501U"
- Indirizzo: "Via Roma 1"
- Città: "Milano"
- CAP: "20100"
- Paese: "IT"

### Verifica in create-checkout-session
✅ **Customer Stripe creato con:**
- email: "mario.rossi@example.com"
- name: "Mario Rossi"
- phone: "+393401234567"
- address: {line1: "Via Roma 1", city: "Milano", postal_code: "20100", country: "IT"}
- metadata: {customer_name: "Mario", customer_surname: "Rossi", customer_fiscal_code: "RSSMRA80A01H501U"}

✅ **Checkout Session creata con:**
- customer: [stripe_customer_id]
- customer_email: "mario.rossi@example.com"
- customer_email_collection[enabled]: false
- phone_number_collection[enabled]: false
- NO custom fields

✅ **Metadata sessione contiene:**
- customer_name: "Mario"
- customer_surname: "Rossi"
- customer_email: "mario.rossi@example.com"
- customer_phone: "+393401234567"
- customer_fiscal_code: "RSSMRA80A01H501U"
- customer_address_line1: "Via Roma 1"
- customer_address_city: "Milano"
- customer_address_postal_code: "20100"
- customer_address_country: "IT"
- quotation_id: [uuid]

✅ **Payment Intent metadata contiene:**
- Tutti i dati cliente sopra elencati
- Tutti i dati prodotto e prenotazione

## Test 2: Verifica Quotation Salvata

✅ **Quotation salvata in DB con:**
- customer_name: "Mario"
- customer_surname: "Rossi"
- customer_email: "mario.rossi@example.com"
- customer_phone: "+393401234567"
- customer_fiscal_code: "RSSMRA80A01H501U"
- customer_address_line1: "Via Roma 1"
- customer_address_city: "Milano"
- customer_address_postal_code: "20100"
- customer_address_country: "IT"
- status: "quote"
- stripe_checkout_session_id: [popolato dopo creazione sessione]

## Test 3: Verifica Webhook Stripe

✅ **stripe-webhook/index.ts estrae:**
- hasInternalCheckoutData: true (verifica customer_name && customer_surname)
- customerEmail: da metadata.customer_email
- customerFirstName: da metadata.customer_name
- customerLastName: da metadata.customer_surname
- customerPhone: da metadata.customer_phone

✅ **Quotation riconciliata:**
- status: "quote" → "booking"
- booking_id: [popolato dopo creazione booking]

## Test 4: Verifica Webhook Odoo

✅ **stripe-webhook-odoo.ts estrae:**
- hasInternalCheckoutMetadata: true (verifica customer_name && customer_surname)
- checkoutSessionFirstName: da metadata.customer_name
- checkoutSessionLastName: da metadata.customer_surname
- checkoutSessionEmail: da metadata.customer_email
- checkoutSessionFiscalCode: da metadata.customer_fiscal_code
- checkoutSessionAddress: da metadata.customer_address_* (combinato)

✅ **Odoo riceve:**
- Partner con nome, cognome, email, telefono
- Sale Order con tutti i dati cliente
- Custom fields: x_customer_email, x_customer_fiscal_code, x_customer_address

## Test 5: Verifica Esperienza Utente

✅ **Checkout Interno:**
- Utente inserisce tutti i dati una volta
- Form completo e validato

✅ **Redirect a Stripe:**
- Email precompilata (non viene chiesta)
- Telefono già presente (non viene chiesto)
- Nome e cognome già presenti nel Customer object
- Indirizzo già presente nel Customer object
- Utente deve solo inserire dati carta o scegliere metodo pagamento

## Risultati Attesi

### ✅ Successo se:
1. Stripe non chiede email/telefono quando dati già presenti
2. Tutti i dati sono nei metadata della sessione
3. Tutti i dati sono nei metadata del payment intent
4. Quotation viene salvata e riconciliata correttamente
5. Odoo riceve tutti i dati necessari
6. Webhook funzionano correttamente con nuovo flusso

### ❌ Fallimento se:
1. Stripe chiede ancora email/telefono
2. Dati mancanti nei metadata
3. Quotation non salvata o non riconciliata
4. Odoo non riceve dati cliente
5. Webhook non riconoscono nuovo flusso

## Note Tecniche

### Parametri Stripe Checkout Session
- `customer`: ID del Customer Stripe (precompila tutti i dati)
- `customer_email`: Email precompilata (redundante ma sicura)
- `customer_email_collection[enabled]`: false (disabilita raccolta email)
- `phone_number_collection[enabled]`: false (disabilita raccolta telefono)
- NO custom fields quando abbiamo dati cliente

### Metadata Structure
Tutti i dati cliente devono essere in:
1. Session metadata (per webhook Supabase)
2. Payment Intent metadata (per webhook Odoo)
3. Customer metadata (backup)

### Webhook Detection
I webhook verificano `customer_name && customer_surname` nei metadata per determinare se usare:
- **NEW FLOW**: Estrai da metadata (internal checkout)
- **LEGACY FLOW**: Estrai da custom fields o customer_details


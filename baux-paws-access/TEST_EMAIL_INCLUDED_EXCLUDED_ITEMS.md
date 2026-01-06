# Test Email Included/Excluded Items

## Problema
I campi `INCLUDED_ITEMS` ed `EXCLUDED_ITEMS` sono disponibili nel template Brevo ma non vengono mai valorizzati nelle email.

## Soluzione Implementata

### 1. Log Dettagliati Aggiunti

Sono stati aggiunti log dettagliati in tutti i punti critici del flusso:

#### A. Webhook Stripe (`stripe-webhook-odoo/route.ts`)
- Log quando vengono recuperati i dati dal database
- Log quando vengono processati gli items
- Log nel payload email prima dell'invio

#### B. Funzione Send Transactional Email (`send-transactional-email/index.ts`)
- Log quando vengono ricevuti i dati
- Log quando vengono formattati in HTML
- Log del payload completo inviato a Brevo
- Log dei parametri nella risposta per debugging

### 2. Script di Test

Creato `test-email-included-excluded-items.ts` che:
- Trova prodotti con `included_items` o `excluded_items`
- Esegue 20 test di invio email
- Verifica che i dati vengano passati correttamente
- Mostra un riepilogo dettagliato

## Come Eseguire i Test

### Prerequisiti

1. Assicurati che i prodotti di test abbiano i dati compilati:
```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=your_key deno run --allow-net --allow-env update-test-products-for-email.ts
```

2. Ottieni la Service Role Key da Supabase Dashboard:
   - Vai su Settings → API
   - Copia la `service_role` key

### Eseguire i Test

```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=your_key deno run --allow-net --allow-env test-email-included-excluded-items.ts
```

Lo script:
1. Cerca prodotti con `included_items` o `excluded_items`
2. Esegue 20 test di invio email
3. Mostra un riepilogo dettagliato con:
   - Numero di test riusciti/falliti
   - Dati passati (included/excluded items)
   - Esempi di HTML generato
   - Errori eventuali

## Verifica dei Log

### 1. Log del Webhook Stripe

Vai su Vercel Dashboard → Logs e cerca:
```
[stripe-webhook-odoo] Product data retrieved:
[stripe-webhook-odoo] Processed items:
[stripe-webhook-odoo] Sending confirmation email with payload:
```

Verifica che:
- `included_items_raw` non sia `null` o `undefined`
- `is_included_array` sia `true`
- `productIncludedItemsLength` sia > 0

### 2. Log della Funzione Send Transactional Email

Vai su Supabase Dashboard → Logs → Edge Functions → send-transactional-email

Cerca:
```
Included items received:
Included items HTML:
=== INCLUDED_ITEMS PARAMETER ===
=== EXCLUDED_ITEMS PARAMETER ===
=== BREVO PAYLOAD ===
```

Verifica che:
- `Included items received` contenga un array non vuoto
- `Included items HTML` abbia una lunghezza > 0
- `INCLUDED_ITEMS parameter` nel payload Brevo non sia vuoto
- `INCLUDED_ITEMS_DISPLAY` sia `'block'` quando ci sono items

### 3. Verifica in Brevo

1. Vai su Brevo Dashboard → Email → Transazionale → Log
2. Trova l'email inviata
3. Clicca su "View Details"
4. Verifica i parametri passati:
   - `INCLUDED_ITEMS` dovrebbe contenere HTML
   - `INCLUDED_ITEMS_DISPLAY` dovrebbe essere `'block'` o `'none'`
   - `EXCLUDED_ITEMS` dovrebbe contenere HTML
   - `EXCLUDED_ITEMS_DISPLAY` dovrebbe essere `'block'` o `'none'`

## Possibili Problemi e Soluzioni

### Problema 1: I dati non vengono recuperati dal database

**Sintomi:**
- Nei log del webhook: `included_items_raw: null` o `undefined`
- `is_included_array: false`

**Soluzione:**
1. Verifica che i prodotti abbiano i campi compilati nel database
2. Esegui `update-test-products-for-email.ts` per popolare i dati
3. Verifica che la query nel webhook includa `included_items` e `excluded_items`

### Problema 2: I dati vengono recuperati ma non formattati

**Sintomi:**
- Nei log: `Included items received: [...]` (array presente)
- `Included items HTML: ` (vuoto)

**Soluzione:**
1. Verifica che gli items siano array di stringhe valide
2. Verifica che la funzione `formatIncludedItems` funzioni correttamente
3. Controlla i log per vedere se ci sono errori nella formattazione

### Problema 3: I dati vengono formattati ma non inviati a Brevo

**Sintomi:**
- Nei log: `Included items HTML: <table>...` (HTML presente)
- Nel payload Brevo: `INCLUDED_ITEMS: ""` (vuoto)

**Soluzione:**
1. Verifica che i parametri vengano aggiunti all'oggetto `emailParams`
2. Verifica che l'oggetto `emailParams` venga passato correttamente a `sendBrevoEmail`
3. Controlla il log `=== BREVO PAYLOAD ===` per vedere cosa viene effettivamente inviato

### Problema 4: I dati arrivano a Brevo ma non vengono mostrati nell'email

**Sintomi:**
- Nei log Brevo: `INCLUDED_ITEMS: "<table>..."` (presente)
- Nell'email: sezione vuota

**Soluzione:**
1. Verifica che il template Brevo usi `{{ params.INCLUDED_ITEMS }}` (doppie braces)
2. Verifica che la sezione non sia nascosta da `display: none`
3. Verifica che `INCLUDED_ITEMS_DISPLAY` sia `'block'` quando ci sono items
4. Testa il template in Brevo con dati di esempio

## Checklist di Verifica

- [ ] I prodotti hanno `included_items` e `excluded_items` compilati nel database
- [ ] Il webhook recupera correttamente i dati (verifica nei log)
- [ ] La funzione `send-transactional-email` riceve i dati (verifica nei log)
- [ ] I dati vengono formattati in HTML (verifica nei log)
- [ ] I parametri vengono aggiunti a `emailParams` (verifica nel codice)
- [ ] Il payload viene inviato correttamente a Brevo (verifica nei log)
- [ ] Brevo riceve i parametri (verifica nei log Brevo)
- [ ] Il template Brevo usa i parametri correttamente (verifica nel template)
- [ ] L'email mostra i dati (verifica nell'email ricevuta)

## Prossimi Passi

1. Esegui lo script di test: `test-email-included-excluded-items.ts`
2. Verifica i log in tutti i punti critici
3. Identifica dove si perde il dato
4. Correggi il problema identificato
5. Ripeti fino a quando i dati non vengono mostrati nell'email

## Note

- I log sono stati aggiunti in modo dettagliato per facilitare il debug
- Lo script di test invia email a `test@flixdog.com` (non un indirizzo reale)
- Verifica sempre i log prima di procedere con le correzioni
- Se i dati non arrivano a Brevo, il problema è nel backend
- Se i dati arrivano a Brevo ma non vengono mostrati, il problema è nel template


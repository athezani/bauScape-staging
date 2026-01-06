# Test Critici Pre-Deploy - Documentazione Completa

## 🎯 Obiettivo

Questi test verificano che **TUTTI** i flussi critici del sistema funzionino **SEMPRE**. Devono essere eseguiti **PRIMA di ogni deploy** per assicurarsi che questi step non falliscano **MAI**.

## 🚨 Importanza

Questi test sono **IMPINDIBILI** perché:
- Il checkout è una funzionalità core del business
- Gli utenti devono poter completare le prenotazioni senza errori
- L'integrazione con Stripe e Odoo è critica per il funzionamento
- Ogni errore in questi flussi causa perdita di vendite

## 📋 Test Inclusi

### 1. Test Trip Checkout (`test-trip-checkout-always-works.ts`)

Verifica che il checkout con trip funzioni sempre, per nessun prodotto.

**Scenari testati:**
- Trip con start_date futura - slot deve essere trovato
- Trip in corso (start_date passata, end_date futura) - slot deve essere trovato
- Trip terminato - deve fallire correttamente
- Trip non attivo - deve fallire correttamente
- Trip senza slot - deve fallire correttamente
- Trip con slot ma senza capacità - deve fallire correttamente
- Tutti i trip attivi devono avere slot disponibili

**Documentazione completa:** [TRIP_CHECKOUT_TEST.md](./TRIP_CHECKOUT_TEST.md)

### 2. Test Flussi Checkout Critici (`test-critical-checkout-flows.ts`)

Verifica che tutti i flussi del checkout funzionino correttamente.

**Flussi testati:**

#### Test 1: Pagina prodotto si apre correttamente
- Verifica che le pagine prodotto siano accessibili
- Verifica che i prodotti attivi siano presenti nel database
- Verifica che le URL delle pagine prodotto siano formattate correttamente

#### Test 2: Checkout → Stripe (creazione checkout session)
- Verifica che la funzione `create-checkout-session` sia accessibile
- Verifica che la creazione di una checkout session funzioni
- Verifica che l'URL Stripe sia valido e formattato correttamente
- Verifica che i dati del cliente siano passati correttamente

#### Test 3: Stripe → Thank you page
- Verifica che la thank you page sia accessibile
- Verifica che la funzione `create-booking` sia accessibile
- Verifica che il redirect da Stripe funzioni correttamente
- Verifica che il parametro `session_id` sia gestito correttamente

#### Test 4: Stripe → Odoo (webhook e creazione ordine)
- Verifica che il webhook endpoint sia accessibile
- Verifica che la connessione Odoo sia configurata
- Verifica che l'autenticazione Odoo funzioni
- Verifica che il webhook possa processare eventi

#### Test 5: Flusso completo
- Verifica che tutti i componenti siano in place
- Verifica che tutti gli endpoint siano accessibili
- Verifica che l'integrazione end-to-end sia funzionante

### 3. Test Copertura Completa Prodotti (`test-complete-product-coverage.ts`)

Verifica che **TUTTI** i possibili tipi di prodotto, con **TUTTE** le caratteristiche, funzionino correttamente usando mock.

**Copertura completa:**
- ✅ Tutti i tipi: experience, class, trip
- ✅ Tutte le caratteristiche: no_adults (true/false), pricing_model (percentage/markup/legacy)
- ✅ Tutti i possibili input: guests (0-100), dogs (0-100), date, timeSlot
- ✅ Tutti gli stati: slot disponibili, pieni, senza capacità, date passate/future
- ✅ Verifica integrità output: prezzo, metadata, URL, redirect, etc.

**Scenari testati:** 16 scenari che coprono tutte le combinazioni possibili

**Documentazione completa:** [COMPLETE_PRODUCT_COVERAGE_TEST.md](./COMPLETE_PRODUCT_COVERAGE_TEST.md)

## 🚀 Come Eseguire i Test

### Prerequisiti

1. **Variabili d'ambiente richieste:**

   **Opzione A: File .env.test (CONSIGLIATO)**
   ```bash
   # Copia il file di esempio
   cp .env.test.example .env.test
   
   # Modifica .env.test e inserisci le tue credenziali
   # Il file .env.test è già nel .gitignore, quindi non verrà committato
   ```

   **Opzione B: Variabili d'ambiente esportate**
   ```bash
   export SUPABASE_URL="https://zyonwzilijgnnnmhxvbo.supabase.co"
   export SUPABASE_ANON_KEY="your-anon-key"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-key"
   export STRIPE_SECRET_KEY="your-stripe-secret-key"  # Opzionale per alcuni test
   export OD_URL="https://your-odoo-url.com"  # Opzionale per test Odoo
   export OD_DB_NAME="your-db-name"  # Opzionale per test Odoo
   export OD_LOGIN="your-login"  # Opzionale per test Odoo
   export OD_API_KEY="your-api-key"  # Opzionale per test Odoo
   export BASE_URL="https://flixdog.com"  # Opzionale, default: https://flixdog.com
   ```

   **Variabili RICHIESTE:**
   - `SUPABASE_ANON_KEY` (o `VITE_SUPABASE_ANON_KEY` o `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `SUPABASE_SERVICE_ROLE_KEY`

   **Variabili OPZIONALI:**
   - `STRIPE_SECRET_KEY` - Alcuni test potrebbero essere saltati se non configurato
   - `OD_URL`, `OD_DB_NAME`, `OD_LOGIN`, `OD_API_KEY` - I test Odoo saranno saltati se non configurati
   - `BASE_URL` - Default: `https://flixdog.com`

2. **Deno installato:**
   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   ```

### Esecuzione Locale

#### Eseguire tutti i test critici:
```bash
cd ecommerce-homepage

# Se hai configurato .env.test, puoi usare lo script helper:
deno run --allow-all load-env-for-tests.ts test-trip-checkout-always-works.ts
deno run --allow-all load-env-for-tests.ts test-critical-checkout-flows.ts

# Oppure usa npm (richiede variabili d'ambiente esportate):
npm run test:critical
```

#### Eseguire test individuali:
```bash
# Test trip checkout
npm run test:trip-checkout
# Oppure:
deno run --allow-net --allow-env test-trip-checkout-always-works.ts

# Test flussi checkout
npm run test:checkout-flows
# Oppure:
deno run --allow-net --allow-env test-critical-checkout-flows.ts

# Test copertura completa prodotti
npm run test:product-coverage
# Oppure:
deno run --allow-net --allow-env test-complete-product-coverage.ts
```

**IMPORTANTE**: Se le variabili d'ambiente non sono configurate, i test falliranno immediatamente con un messaggio chiaro che indica quali variabili mancano.

### Esecuzione Prima del Deploy

**IMPORTANTE**: I test vengono eseguiti automaticamente:

1. **Nello script di deploy** (`deploy.sh`):
   ```bash
   ./deploy.sh
   ```
   I test vengono eseguiti automaticamente prima del deploy.

2. **Nel workflow GitHub Actions** (`.github/workflows/test.yml`):
   I test vengono eseguiti automaticamente su ogni push e pull request.

3. **Come predeploy hook** (`package.json`):
   ```bash
   npm run build  # Esegue automaticamente i test prima del build
   ```

### Esecuzione Manuale

Se vuoi eseguire i test manualmente prima di un deploy:

```bash
cd ecommerce-homepage

# Esegui tutti i test critici
npm run test:critical

# Se tutti i test passano, procedi con il deploy
npm run build
```

## ✅ Risultati Attesi

Tutti i test devono passare. Se anche un solo test fallisce:
- ❌ **NON procedere con il deploy**
- 🔍 Analizza i log per capire il problema
- 🛠️ Correggi il problema
- ✅ Riesegui i test fino a quando tutti passano

### Esempio di Output Positivo

```
🚀 Esecuzione test critici per checkout trip
======================================================================
Questi test devono SEMPRE passare prima di ogni deploy
======================================================================

✅ Test 1: Trip con start_date futura (245ms)
✅ Test 2: Trip in corso (189ms)
✅ Test 3: Trip terminato (156ms)
✅ Test 4: Trip non attivo (142ms)
✅ Test 5: Trip senza slot (138ms)
✅ Test 6: Trip con slot ma senza capacità (145ms)
✅ Test 7: Tutti i trip attivi hanno slot (523ms)

======================================================================
📊 RISULTATI FINALI
======================================================================
✅ Test passati: 7/7
❌ Test falliti: 0/7
⏱️  Tempo totale: 1538ms

✅ Tutti i test sono passati!
Il checkout con trip funziona correttamente per tutti i prodotti.

🚀 Esecuzione test critici per flussi checkout
======================================================================
Questi test devono SEMPRE passare prima di ogni deploy
======================================================================

✅ Test 1: Pagina prodotto si apre correttamente (342ms)
✅ Test 2: Checkout → Stripe (creazione checkout session) (567ms)
✅ Test 3: Stripe → Thank you page (redirect e creazione booking) (234ms)
✅ Test 4: Stripe → Odoo (webhook e creazione ordine) (456ms)
✅ Test 5: Flusso completo (789ms)

======================================================================
📊 RISULTATI FINALI
======================================================================
✅ Test passati: 5/5
❌ Test falliti: 0/5
⏱️  Tempo totale: 2388ms

✅ Tutti i test critici sono passati!
I flussi checkout funzionano correttamente.
```

### Esempio di Output Negativo

```
======================================================================
📊 RISULTATI FINALI
======================================================================
✅ Test passati: 4/5
❌ Test falliti: 1/5
⏱️  Tempo totale: 2156ms

⚠️  ATTENZIONE: Alcuni test critici sono falliti!
Non procedere con il deploy fino a quando questi test non passano.

📋 Dettagli test falliti:

1. Test 2: Checkout → Stripe (creazione checkout session)
   ❌ ERRORE: Creazione checkout session fallita: 500
   📋 Dettagli: {
     "status": 500,
     "response": {
       "error": "Internal server error"
     },
     "request": { ... }
   }
   ⏱️  Durata: 567ms
```

## 🔧 Troubleshooting

### Test fallisce: "Variabili d'ambiente mancanti"

**Causa**: Le variabili d'ambiente richieste non sono configurate.

**Soluzione**: 
1. Crea un file `.env.test` copiando da `.env.test.example`
2. Inserisci le tue credenziali in `.env.test`
3. Oppure esporta le variabili d'ambiente manualmente:
   ```bash
   export SUPABASE_ANON_KEY="your-key"
   export SUPABASE_SERVICE_ROLE_KEY="your-key"
   ```

### Test fallisce: "Authentication failed (401)"

**Causa**: Le credenziali Supabase non sono corrette o non sono configurate.

**Soluzione**: 
1. Verifica che `SUPABASE_ANON_KEY` sia corretto
2. Verifica che `SUPABASE_SERVICE_ROLE_KEY` sia corretto
3. Verifica che le chiavi non abbiano spazi o caratteri extra

### Test fallisce: "Nessun prodotto attivo trovato"

**Causa**: Non ci sono prodotti attivi nel database.

**Soluzione**: 
1. Verifica che ci siano prodotti attivi nel database
2. Verifica che le credenziali Supabase siano corrette
3. Verifica che le RLS policies permettano la lettura dei prodotti

### Test fallisce: "Creazione checkout session fallita"

**Causa**: La funzione `create-checkout-session` non è accessibile o ha errori.

**Soluzione**:
1. Verifica che la funzione sia deployata su Supabase
2. Verifica i log della funzione su Supabase Dashboard
3. Verifica che le credenziali Supabase siano corrette
4. Verifica che Stripe sia configurato correttamente

### Test fallisce: "Webhook endpoint non accessibile"

**Causa**: Il webhook endpoint non è accessibile o ha errori.

**Soluzione**:
1. Verifica che il webhook endpoint sia deployato
2. Verifica che l'URL del webhook sia corretto
3. Verifica i log del webhook
4. Verifica che le variabili d'ambiente siano configurate

### Test fallisce: "Connessione Odoo fallita"

**Causa**: La connessione a Odoo non funziona.

**Soluzione**:
1. Verifica che le credenziali Odoo siano corrette
2. Verifica che l'URL di Odoo sia accessibile
3. Verifica che l'autenticazione Odoo funzioni
4. Verifica che il database Odoo sia corretto

## 📝 File Modificati

1. `ecommerce-homepage/test-trip-checkout-always-works.ts` - Test trip checkout
2. `ecommerce-homepage/test-critical-checkout-flows.ts` - Test flussi checkout
3. `ecommerce-homepage/test-complete-product-coverage.ts` - Test copertura completa prodotti
4. `ecommerce-homepage/deploy.sh` - Script di deploy con test
5. `ecommerce-homepage/package.json` - Script npm per test
6. `ecommerce-homepage/run-all-critical-tests.sh` - Script per eseguire tutti i test
7. `ecommerce-homepage/.github/workflows/test.yml` - Workflow CI/CD
8. `ecommerce-homepage/CRITICAL_TESTS.md` - Questa documentazione
9. `ecommerce-homepage/COMPLETE_PRODUCT_COVERAGE_TEST.md` - Documentazione test copertura completa

## 📚 Riferimenti

- [Test Trip Checkout](./TRIP_CHECKOUT_TEST.md)
- [Test Copertura Completa Prodotti](./COMPLETE_PRODUCT_COVERAGE_TEST.md)
- [Documentazione Test](./README_TESTING.md)
- [Workflow CI/CD](../.github/workflows/test.yml)


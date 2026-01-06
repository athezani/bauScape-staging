# Test Suite - Internal Checkout System

Questa directory contiene tutti i test per il sistema di checkout interno.

## Struttura Test

### 1. Database Migration Tests
**File:** `quotation-migration.test.sql`

Test SQL per verificare che la migrazione della tabella `quotation` sia stata applicata correttamente.

**Esecuzione:**
```bash
psql -h <host> -U <user> -d <database> -f tests/quotation-migration.test.sql
```

**Cosa verifica:**
- Esistenza tabella `quotation`
- Presenza di tutti i campi obbligatori
- Constraint e foreign key
- Indici per performance
- Trigger `updated_at`
- Test inserimento e aggiornamento

### 2. create-checkout-session Tests
**File:** `create-checkout-session.test.ts`

Test unitari per la Edge Function `create-checkout-session`.

**Esecuzione:**
```bash
deno test --allow-all tests/create-checkout-session.test.ts
```

**Cosa verifica:**
- Flusso legacy (senza dati cliente)
- Flusso nuovo (con dati cliente)
- Validazione e troncamento indirizzo
- Validazione codice fiscale
- Struttura metadata per Odoo
- Gestione errori non bloccanti

### 3. stripe-webhook Tests
**File:** `stripe-webhook-reconciliation.test.ts`

Test per la riconciliazione delle quotation nel webhook Stripe.

**Esecuzione:**
```bash
deno test --allow-all tests/stripe-webhook-reconciliation.test.ts
```

**Cosa verifica:**
- Estrazione `quotation_id` dai metadata
- Riconciliazione quotation dopo creazione booking
- Estrazione dati cliente da metadata (new flow)
- Fallback a custom fields (legacy flow)
- Gestione errori non bloccanti

### 4. Odoo Webhook Tests
**File:** `odoo-webhook-metadata.test.ts`

Test per verificare che il webhook Odoo legga correttamente i dati da metadata.

**Esecuzione:**
```bash
deno test --allow-all tests/odoo-webhook-metadata.test.ts
```

**Cosa verifica:**
- Priorità metadata su custom fields (new flow)
- Fallback a custom fields quando metadata non disponibile (legacy flow)
- Costruzione indirizzo da componenti metadata
- Skip checkout session fetch quando metadata disponibile
- Tutti i campi necessari per Odoo presenti

### 5. E2E Tests
**File:** `e2e-checkout-flow.test.ts`

**20 test end-to-end** con prodotti e input diversi per verificare il flusso completo.

**Esecuzione:**
```bash
deno test --allow-all tests/e2e-checkout-flow.test.ts
```

**Scenari testati:**
1. Experience - 2 adults, 1 dog, codice fiscale valido
2. Experience - 1 adult, 2 dogs, senza codice fiscale
3. Experience - 4 adults, 0 dogs, codice fiscale non valido (warning)
4. Experience - 3 adults, 3 dogs, indirizzo lungo (troncato)
5. Experience - 5 adults, 1 dog, caratteri speciali nel nome
6. Class - 1 adult, 1 dog, no_adults product
7. Class - 2 adults, 2 dogs, email con caratteri speciali
8. Class - 1 adult, 0 dogs, telefono senza prefisso
9. Class - 3 adults, 1 dog, CAP con spazi
10. Class - 2 adults, 4 dogs, nome molto lungo
11. Trip - 2 adults, 1 dog, viaggio standard
12. Trip - 4 adults, 2 dogs, famiglia numerosa
13. Trip - 1 adult, 3 dogs, solo cane
14. Trip - 6 adults, 1 dog, gruppo grande
15. Trip - 2 adults, 0 dogs, senza cani
16. Edge case - Nome con apostrofo e accenti
17. Edge case - Email con sottodomini multipli
18. Edge case - Indirizzo con numeri civici complessi
19. Edge case - Codice fiscale con caratteri speciali (non valido)
20. Edge case - Massimo numero ospiti e cani

## Esecuzione Tutti i Test

Per eseguire tutti i test in sequenza:

```bash
./tests/run-all-tests.sh
```

Oppure manualmente:

```bash
# Test unitari e E2E
deno test --allow-all tests/

# Test database (richiede connessione)
psql -h <host> -U <user> -d <database> -f tests/quotation-migration.test.sql
```

## Requisiti

- **Deno** (per test TypeScript)
- **PostgreSQL client** (per test database)
- **Accesso al database** (per test migrazione)

## Note

- I test E2E sono test di validazione logica, non chiamano realmente le API
- Per test di integrazione reali, è necessario un ambiente di test configurato
- I test database richiedono una connessione al database di test

## Risultati Attesi

Tutti i test dovrebbero passare con successo. In caso di fallimenti:

1. Verificare che la migrazione sia stata applicata
2. Verificare che le Edge Functions siano deployate
3. Controllare i log per dettagli sugli errori


# Istruzioni Setup Test Critici

## 🎯 Obiettivo

Questo documento spiega come configurare l'ambiente per eseguire i test critici che devono **SEMPRE** passare prima di ogni deploy.

## ⚠️ IMPORTANTE

I test critici **NON possono essere saltati**. Se falliscono, il deploy viene bloccato automaticamente.

## 📋 Setup Iniziale

### 1. Verifica che Deno sia installato

```bash
deno --version
```

Se non è installato:
```bash
curl -fsSL https://deno.land/install.sh | sh
```

### 2. Configura le variabili d'ambiente

Hai due opzioni:

#### Opzione A: File .env.test (CONSIGLIATO)

```bash
cd ecommerce-homepage

# Copia il file di esempio
cp .env.test.example .env.test

# Modifica .env.test e inserisci le tue credenziali reali
# Il file .env.test è già nel .gitignore, quindi non verrà committato
```

**Contenuto minimo di .env.test:**
```bash
SUPABASE_URL=https://zyonwzilijgnnnmhxvbo.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here
```

#### Opzione B: Variabili d'ambiente esportate

```bash
export SUPABASE_URL="https://zyonwzilijgnnnmhxvbo.supabase.co"
export SUPABASE_ANON_KEY="your-actual-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-actual-service-role-key"
```

### 3. Verifica la configurazione

Esegui un test per verificare che tutto sia configurato correttamente:

```bash
cd ecommerce-homepage

# Se hai usato .env.test:
deno run --allow-all load-env-for-tests.ts test-trip-checkout-always-works.ts

# Se hai esportato le variabili:
deno run --allow-net --allow-env test-trip-checkout-always-works.ts
```

Se vedi:
```
✅ Variabili d'ambiente configurate correttamente
```

Allora la configurazione è corretta!

## 🔑 Dove trovare le credenziali

### Supabase

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il tuo progetto
3. Vai su **Settings** → **API**
4. Trova:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ SECRETO!)

### Stripe (Opzionale)

1. Vai su [Stripe Dashboard](https://dashboard.stripe.com)
2. Vai su **Developers** → **API keys**
3. Trova **Secret key** → `STRIPE_SECRET_KEY`

### Odoo (Opzionale)

Le credenziali Odoo sono fornite dall'amministratore del sistema.

## 🧪 Eseguire i Test

### Eseguire tutti i test critici

```bash
cd ecommerce-homepage
npm run test:critical
```

### Eseguire test individuali

```bash
# Test trip checkout
npm run test:trip-checkout

# Test flussi checkout
npm run test:checkout-flows
```

### Eseguire manualmente con Deno

```bash
# Con .env.test
deno run --allow-all load-env-for-tests.ts test-trip-checkout-always-works.ts
deno run --allow-all load-env-for-tests.ts test-critical-checkout-flows.ts

# Con variabili esportate
deno run --allow-net --allow-env test-trip-checkout-always-works.ts
deno run --allow-net --allow-env test-critical-checkout-flows.ts
```

## ✅ Risultati Attesi

Se tutto è configurato correttamente, vedrai:

```
✅ Variabili d'ambiente configurate correttamente
   SUPABASE_URL: https://zyonwzilijgnnnmhxvbo.supabase.co
   SUPABASE_ANON_KEY: eyJhbGciO... (X caratteri)
   SUPABASE_SERVICE_ROLE_KEY: eyJhbGciO... (X caratteri)

✅ Test 1: Trip con start_date futura (XXXms)
✅ Test 2: Trip in corso (XXXms)
...
✅ Tutti i test sono passati!
```

## ❌ Risoluzione Problemi

### Errore: "Variabili d'ambiente mancanti"

**Causa**: Le variabili d'ambiente non sono configurate.

**Soluzione**:
1. Verifica di aver creato `.env.test` o esportato le variabili
2. Verifica che i nomi delle variabili siano corretti
3. Verifica che non ci siano spazi o caratteri extra

### Errore: "Authentication failed (401)"

**Causa**: Le credenziali Supabase non sono corrette.

**Soluzione**:
1. Verifica che `SUPABASE_ANON_KEY` sia corretto
2. Verifica che `SUPABASE_SERVICE_ROLE_KEY` sia corretto
3. Verifica che le chiavi non siano scadute o revocate

### Errore: "Permission denied (403)"

**Causa**: Le RLS policies non permettono l'accesso.

**Soluzione**:
1. Verifica che le RLS policies siano configurate correttamente
2. Verifica che `SUPABASE_SERVICE_ROLE_KEY` abbia i permessi necessari

## 📚 Documentazione Completa

- [CRITICAL_TESTS.md](./CRITICAL_TESTS.md) - Documentazione completa dei test
- [TRIP_CHECKOUT_TEST.md](./TRIP_CHECKOUT_TEST.md) - Documentazione test trip checkout

## 🔒 Sicurezza

⚠️ **IMPORTANTE**: 
- Non committare mai file `.env.test` o file con credenziali
- Il file `.env.test` è già nel `.gitignore`
- Le credenziali devono essere mantenute segrete
- Usa sempre `SUPABASE_SERVICE_ROLE_KEY` solo per test, mai in produzione frontend


# Quick Start: Eseguire i Test Critici

## 🚀 Setup Rapido (2 minuti)

### Opzione 1: Script Interattivo (CONSIGLIATO)

```bash
cd ecommerce-homepage
./setup-test-env.sh
```

Lo script ti chiederà le credenziali e creerà automaticamente il file `.env.test`.

### Opzione 2: Manuale

1. **Ottieni la Service Role Key da Supabase:**
   - Vai su https://supabase.com/dashboard
   - Seleziona il progetto: **zyonwzilijgnnnmhxvbo**
   - Vai su **Settings** → **API**
   - Trova **service_role** key e copiala

2. **Crea il file .env.test:**
   ```bash
   cd ecommerce-homepage
   cp .env.test.example .env.test
   # Modifica .env.test e inserisci SUPABASE_SERVICE_ROLE_KEY
   ```

3. **Oppure esporta le variabili:**
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
   ```

## 🧪 Eseguire i Test

```bash
cd ecommerce-homepage
./run-all-critical-tests.sh
```

Oppure:

```bash
npm run test:critical
```

## ✅ Risultato Atteso

Se tutto è configurato correttamente, vedrai:

```
✅ Variabili d'ambiente configurate
✅ Test 1: Trip con start_date futura (XXXms)
✅ Test 2: Trip in corso (XXXms)
...
✅ TUTTI I TEST CRITICI SONO PASSATI!
```

## ❌ Se i Test Falliscono

1. **Verifica le credenziali:**
   - La `SUPABASE_SERVICE_ROLE_KEY` è corretta?
   - La `SUPABASE_ANON_KEY` è corretta?

2. **Verifica la connessione:**
   - Il database Supabase è accessibile?
   - Ci sono prodotti attivi nel database?

3. **Leggi i messaggi di errore:**
   - Ogni test fornisce dettagli chiari su cosa è fallito
   - Segui le istruzioni nei messaggi di errore

## 📚 Documentazione Completa

- [TEST_SETUP_INSTRUCTIONS.md](./TEST_SETUP_INSTRUCTIONS.md) - Setup dettagliato
- [CRITICAL_TESTS.md](./CRITICAL_TESTS.md) - Documentazione completa dei test


# 📋 Istruzioni Complete per Test Autonomi

## 🎯 Obiettivo

Rendere i test completamente autonomi così posso:
- ✅ Creare booking di test per tutte e 3 le tipologie
- ✅ Verificare che abbiano idempotency_key
- ✅ Correggere problemi e ri-testare finché non funziona

## 🛠️ Opzione 1: Installazione Completa (Consigliata)

### Tools da Installare

1. **Homebrew** (package manager)
2. **PostgreSQL** (per psql)
3. **Deno** (per script TypeScript avanzati)

### Comandi da Eseguire

```bash
# 1. Installa Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Installa PostgreSQL (psql)
brew install postgresql@15

# 3. Installa Deno
brew install deno

# 4. Verifica
which psql deno node npm supabase
```

**Tempo totale**: ~15-20 minuti

**Vantaggi**: 
- ✅ Massima flessibilità
- ✅ Posso eseguire qualsiasi tipo di test
- ✅ Script SQL diretti

---

## 🚀 Opzione 2: Test Immediato (Senza Installazione)

### Cosa Serve

Solo **SUPABASE_SERVICE_ROLE_KEY** (già disponibile probabilmente)

### Esecuzione

```bash
# 1. Imposta la service key
export SUPABASE_SERVICE_ROLE_KEY="your-service-key"

# 2. Esegui i test
cd baux-paws-access
./run-tests-now.sh
```

Oppure:

```bash
# Leggi da .env.local se esiste
export $(grep SUPABASE_SERVICE_ROLE_KEY .env.local | xargs)
node test-booking-node.js
```

**Vantaggi**:
- ✅ Funziona subito (Node.js già disponibile)
- ✅ Non richiede installazioni
- ✅ Test completi per tutte le tipologie

---

## 📝 File Creati

1. **`test-booking-node.js`** - Script test con Node.js (funziona subito)
2. **`test-booking-complete.sql`** - Script SQL completo (richiede psql o Supabase Dashboard)
3. **`run-tests-now.sh`** - Script bash per eseguire test immediatamente
4. **`fix-idempotency-function.sql`** - Fix funzione transazionale

## 🎯 Raccomandazione

### Per Test Immediati (Ora)
Usa **Opzione 2** con Node.js:
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-key"
node test-booking-node.js
```

### Per Massima Autonomia (Dopo)
Installa psql e deno con **Opzione 1** per avere più flessibilità.

---

## ✅ Dopo l'Installazione/Configurazione

**Dimmi quando sei pronto** e procederò automaticamente con:

1. ✅ Eseguire test per experience, class, trip
2. ✅ Verificare idempotency_key
3. ✅ Correggere problemi
4. ✅ Ripetere finché tutto funziona

---

## 🔑 Come Ottenere SUPABASE_SERVICE_ROLE_KEY

1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/settings/api
2. Copia **service_role key** (secret)
3. Esporta come variabile:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="your-key-here"
   ```

Oppure crea `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your-key-here
```

---

**Scegli l'opzione che preferisci e dimmi quando sei pronto!** 🚀





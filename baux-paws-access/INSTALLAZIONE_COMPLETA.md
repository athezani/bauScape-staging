# 🛠️ Installazione Completa Tools per Test Autonomi

## 📋 Situazione Attuale

✅ **Già installato:**
- Node.js
- npm
- Supabase CLI

❌ **Manca:**
- Homebrew (package manager)
- psql (PostgreSQL client)
- deno (TypeScript runtime)

## 🚀 Installazione Step-by-Step

### Step 1: Installa Homebrew (se non presente)

Homebrew è il package manager per macOS. Esegui questo comando:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Tempo stimato**: 5-10 minuti

**Verifica:**
```bash
brew --version
```

Dovresti vedere la versione di Homebrew.

---

### Step 2: Installa PostgreSQL (include psql)

```bash
brew install postgresql@15
```

Oppure per l'ultima versione:
```bash
brew install postgresql
```

**Tempo stimato**: 5-10 minuti

**Verifica:**
```bash
psql --version
```

Dovresti vedere qualcosa come: `psql (PostgreSQL) 15.x`

**Nota**: Non serve avviare un server PostgreSQL locale, ci serve solo il client `psql`.

---

### Step 3: Installa Deno

```bash
brew install deno
```

**Tempo stimato**: 2-3 minuti

**Verifica:**
```bash
deno --version
```

Dovresti vedere la versione di Deno.

---

## ✅ Verifica Finale

Dopo l'installazione, esegui:

```bash
which psql deno node npm supabase
```

Dovresti vedere tutti i path:
```
/opt/homebrew/bin/psql
/opt/homebrew/bin/deno
/usr/local/bin/node
/usr/local/bin/npm
/usr/local/bin/supabase
```

## 🧪 Test Rapido

### Test psql
```bash
psql --version
# Dovrebbe mostrare: psql (PostgreSQL) 15.x o simile
```

### Test deno
```bash
deno --version
# Dovrebbe mostrare: deno 1.x.x

deno eval "console.log('✅ Deno funziona!')"
# Dovrebbe stampare: ✅ Deno funziona!
```

## 🎯 Dopo l'Installazione

Una volta installati tutti i tools, potrò:

1. ✅ **Eseguire test SQL direttamente** usando psql o Supabase CLI
2. ✅ **Eseguire script TypeScript** usando deno
3. ✅ **Creare booking di test automaticamente** per tutte le tipologie
4. ✅ **Verificare che idempotency_key sia popolato** correttamente
5. ✅ **Correggere eventuali problemi** e ri-testare finché non funziona

## 📝 Comandi da Eseguire (Copia e Incolla)

```bash
# 1. Installa Homebrew (se non presente)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Installa PostgreSQL (psql)
brew install postgresql@15

# 3. Installa Deno
brew install deno

# 4. Verifica installazione
which psql deno node npm supabase
psql --version
deno --version
```

## ⚠️ Note Importanti

- **Homebrew**: Richiede Xcode Command Line Tools (vengono installati automaticamente)
- **PostgreSQL**: Non serve avviare il server, solo il client `psql`
- **Deno**: Funziona immediatamente, non serve configurazione
- **Tempo totale**: Circa 15-20 minuti per installare tutto

## 🆘 In caso di problemi

### Homebrew non si installa
- Verifica la connessione internet
- Controlla i permessi (potrebbe chiedere password)
- Segui le istruzioni a schermo

### psql non funziona dopo installazione
```bash
# Aggiungi psql al PATH (se necessario)
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### deno non funziona
```bash
# Verifica installazione
brew list deno

# Reinstalla se necessario
brew reinstall deno
```

---

**Una volta completata l'installazione, dimmi e procederò con i test automatici!** 🚀





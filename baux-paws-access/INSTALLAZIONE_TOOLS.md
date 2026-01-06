# 🛠️ Installazione Tools per Test Autonomi

## 📋 Tools Necessari

Per rendere i test completamente autonomi, servono:

1. **psql** - Client PostgreSQL (per eseguire SQL direttamente)
2. **deno** - Runtime TypeScript/JavaScript (per script avanzati)
3. **Node.js** - Già installato ✅
4. **Supabase CLI** - Già installato ✅

## 🍺 Installazione via Homebrew (macOS)

### 1. Installa PostgreSQL (include psql)

```bash
brew install postgresql@15
```

Oppure per l'ultima versione:
```bash
brew install postgresql
```

**Verifica installazione:**
```bash
psql --version
```

### 2. Installa Deno

```bash
brew install deno
```

**Verifica installazione:**
```bash
deno --version
```

## 🔧 Configurazione

### PostgreSQL (psql)

Non serve configurazione particolare, psql funziona da subito.

### Deno

Deno funziona immediatamente, non serve configurazione.

## ✅ Verifica Completa

Dopo l'installazione, esegui:

```bash
which psql deno node npm supabase
```

Dovresti vedere tutti i path.

## 🧪 Test Rapido

### Test psql
```bash
psql --version
```

### Test deno
```bash
deno --version
deno eval "console.log('Deno funziona!')"
```

## 📝 Note

- **psql**: Non serve un database locale, lo useremo solo per eseguire script SQL
- **deno**: Funziona immediatamente, non serve configurazione
- **Node.js**: Già disponibile ✅

## 🚀 Dopo l'Installazione

Una volta installati psql e deno, potrò:
- ✅ Eseguire test SQL direttamente
- ✅ Eseguire script TypeScript/Deno
- ✅ Creare booking di test automaticamente
- ✅ Verificare che tutto funzioni

---

**Esegui questi comandi per installare:**

```bash
# Installa PostgreSQL (psql)
brew install postgresql@15

# Installa Deno
brew install deno

# Verifica
which psql deno
```





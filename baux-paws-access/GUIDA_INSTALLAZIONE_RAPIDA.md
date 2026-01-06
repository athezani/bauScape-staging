# 🚀 Guida Rapida Installazione

## ⚡ Installazione Veloce (Copia e Incolla)

Esegui questi comandi **uno alla volta** nel terminale:

```bash
# 1. Installa Homebrew (se non presente)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Installa PostgreSQL (psql)
brew install postgresql@15

# 3. Installa Deno
brew install deno

# 4. Verifica che tutto sia installato
which psql deno node npm supabase
psql --version
deno --version
```

## ✅ Verifica

Dopo l'installazione, dovresti vedere:

```
/opt/homebrew/bin/psql
/opt/homebrew/bin/deno
/usr/local/bin/node
/usr/local/bin/npm
/usr/local/bin/supabase
```

E le versioni di psql e deno.

## 🎯 Dopo l'Installazione

**Dimmi quando hai finito** e procederò automaticamente con:

1. ✅ Eseguire test per tutte e 3 le tipologie (experience, class, trip)
2. ✅ Verificare che tutti abbiano idempotency_key
3. ✅ Correggere eventuali problemi
4. ✅ Ripetere finché non funziona tutto

## ⏱️ Tempo Stimato

- Homebrew: 5-10 minuti
- PostgreSQL: 5-10 minuti  
- Deno: 2-3 minuti
- **Totale: ~15-20 minuti**

## 📝 Note

- Homebrew potrebbe chiedere la password (per installare Xcode Command Line Tools)
- PostgreSQL non richiede configurazione (solo il client)
- Deno funziona immediatamente

---

**Esegui i comandi sopra e dimmi quando hai finito!** 🚀





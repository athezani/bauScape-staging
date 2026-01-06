# Configurazione Variabili Odoo

## 📍 Dove Configurare

Le variabili Odoo devono essere configurate come **Secrets** nelle **Supabase Edge Functions**.

## 🔧 Metodo 1: Tramite Dashboard Supabase (Raccomandato)

### Step 1: Accedi al Dashboard
1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il progetto: **zyonwzilijgnnnmhxvbo** (o il tuo progetto)
3. Vai su **Settings** → **Edge Functions** → **Secrets**

### Step 2: Aggiungi le Variabili Odoo

Aggiungi queste 4 variabili (una per volta):

#### 1. OD_URL
- **Name**: `OD_URL`
- **Value**: `https://your-odoo-instance.com` (es. `https://odoo.example.com`)
- **Description**: URL dell'istanza Odoo

#### 2. OD_DB_NAME
- **Name**: `OD_DB_NAME`
- **Value**: `your_database_name` (es. `odoo_production`)
- **Description**: Nome del database Odoo

#### 3. OD_LOGIN
- **Name**: `OD_LOGIN`
- **Value**: `your_username` (es. `admin@example.com`)
- **Description**: Username per l'autenticazione Odoo

#### 4. OD_API_KEY
- **Name**: `OD_API_KEY`
- **Value**: `your_api_key` (chiave API Odoo)
- **Description**: API Key per l'autenticazione Odoo

### Step 3: Verifica
Dopo aver aggiunto tutte le variabili, verifica che siano presenti nella lista dei Secrets.

## 🔧 Metodo 2: Tramite CLI Supabase

### Prerequisiti
Assicurati di avere Supabase CLI installato e autenticato:
```bash
npx supabase login
npx supabase link --project-ref zyonwzilijgnnnmhxvbo
```

### Configurazione
```bash
cd baux-paws-access

# Configura le variabili Odoo
npx supabase secrets set OD_URL=https://your-odoo-instance.com
npx supabase secrets set OD_DB_NAME=your_database_name
npx supabase secrets set OD_LOGIN=your_username
npx supabase secrets set OD_API_KEY=your_api_key
```

### Verifica
```bash
npx supabase secrets list
```

Dovresti vedere tutte le variabili Odoo nella lista:
```
OD_URL
OD_DB_NAME
OD_LOGIN
OD_API_KEY
```

## 🔄 Configurazione Multi-Account (Opzionale)

Se hai bisogno di supportare più account Odoo (dev/staging/prod), puoi configurare account alternativi:

### Account Alternativo
```bash
npx supabase secrets set OD_ALT_URL=https://odoo-staging.example.com
npx supabase secrets set OD_ALT_DB_NAME=odoo_staging
npx supabase secrets set OD_ALT_LOGIN=staging_user
npx supabase secrets set OD_ALT_API_KEY=staging_api_key
```

### Selezionare Account Attivo
```bash
# Usa account default (OD_URL, OD_DB_NAME, etc.)
npx supabase secrets set OD_ACTIVE_ACCOUNT=default

# Oppure usa account alternativo
npx supabase secrets set OD_ACTIVE_ACCOUNT=alt
```

## 📝 Variabili Richieste

### Obbligatorie
- ✅ `OD_URL` - URL dell'istanza Odoo
- ✅ `OD_DB_NAME` - Nome del database
- ✅ `OD_API_KEY` - API Key per autenticazione

### Opzionali (ma raccomandate)
- ⚠️ `OD_LOGIN` - Username (raccomandato per autenticazione standard)
- ⚠️ `OD_ACTIVE_ACCOUNT` - Account attivo (`default` | `alt` | custom)

## 🔍 Verifica Configurazione

### Test Locale (con script diretto)
```bash
cd baux-paws-access
export OD_URL="https://your-odoo-instance.com"
export OD_DB_NAME="your_database"
export OD_LOGIN="your_username"
export OD_API_KEY="your_api_key"

deno run --allow-net --allow-env test-odoo-po-direct.ts
```

### Test via Edge Function
Dopo aver configurato i secrets, puoi testare la funzione:
```bash
curl -X POST https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/test-odoo-po \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 5, "dryRun": true}'
```

## ⚠️ Note Importanti

1. **Sicurezza**: Le variabili sono secrets e non vengono esposte nel codice o nei log
2. **Stesso Account del Modulo Sales**: Le variabili `OD_URL`, `OD_DB_NAME`, `OD_LOGIN`, `OD_API_KEY` sono le stesse usate dal modulo Sales esistente
3. **Aggiornamento**: Dopo aver modificato i secrets, le Edge Functions vengono automaticamente aggiornate
4. **Migrazione Account**: Per migrare a un nuovo account Odoo, basta aggiornare i valori dei secrets

## 🐛 Troubleshooting

### Errore: "Odoo configuration not available"
- Verifica che tutte le variabili obbligatorie siano configurate
- Controlla che i nomi delle variabili siano esatti (case-sensitive)
- Verifica che i secrets siano visibili nel dashboard

### Errore: "Authentication failed"
- Verifica che `OD_LOGIN` e `OD_API_KEY` siano corretti
- Controlla che l'utente abbia i permessi necessari in Odoo
- Verifica che l'API Key sia valida e non scaduta

### Errore: "Database not found"
- Verifica che `OD_DB_NAME` corrisponda esattamente al nome del database in Odoo
- Controlla che l'utente abbia accesso a quel database

## 📚 Riferimenti

- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Odoo JSON-RPC API](https://www.odoo.com/documentation/17.0/developer/reference/external_api.html)
- Documentazione integrazione: `ODOO_PO_IMPLEMENTATION.md`


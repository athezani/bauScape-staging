# Variabili d'Ambiente Vercel - Configurazione Completa

## Variabili Richieste per Next.js Webhook

Tutte le seguenti variabili devono essere configurate su Vercel con i valori corretti.

### 1. Odoo Configuration

```
OD_URL=<your-odoo-instance-url>
OD_DB_NAME=<your-database-name>
OD_LOGIN=<your-odoo-email>
OD_API_KEY=<your-odoo-api-key>
```

⚠️ **IMPORTANTE**: Sostituisci i valori placeholder con i tuoi valori reali. **NON** committare mai questi valori nel repository.

### 2. Supabase Configuration

```
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

⚠️ **CRITICO**: La `SUPABASE_SERVICE_ROLE_KEY` ha accesso completo al database. Mantienila segreta e non condividerla mai pubblicamente.

### 3. Stripe Configuration

```
STRIPE_SECRET_KEY=<your-stripe-secret-key>
ST_WEBHOOK_SECRET=<your-stripe-webhook-secret>
```

⚠️ **IMPORTANTE**: Questi sono secrets di Stripe. Ottienili dal dashboard di Stripe.

### 4. Next.js Public Variables (per client-side)

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_STRIPE_CHECKOUT_URL=<your-stripe-checkout-url>
```

ℹ️ **Nota**: Le variabili `NEXT_PUBLIC_*` sono pubbliche e vengono esposte al client. Non contengono informazioni sensibili.

## Come Configurare su Vercel

1. Vai su **Vercel Dashboard** → Il tuo progetto → **Settings** → **Environment Variables**
2. Per ogni variabile:
   - Clicca su **"Add New"**
   - **Key**: Nome esatto (es. `OD_URL`)
   - **Value**: Il valore corrispondente
   - **Environment**: Seleziona **Production**, **Preview**, e **Development**
   - Clicca su **Save**
3. Dopo aver aggiunto tutte le variabili, fai un **nuovo deploy**

## Verifica

Dopo il deploy, verifica che:
- ✅ Il webhook endpoint risponda a GET: `https://flixdog.com/api/stripe-webhook-odoo`
- ✅ Le pagine Next.js carichino correttamente
- ✅ I prodotti vengano visualizzati nella homepage
- ✅ Il checkout funzioni correttamente

## Note Importanti

- **NON** committare mai queste variabili nel codice
- Le variabili `OD_*`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, e `ST_WEBHOOK_SECRET` sono **secrets** e devono essere configurate solo su Vercel
- Le variabili `NEXT_PUBLIC_*` sono pubbliche e vengono esposte al client


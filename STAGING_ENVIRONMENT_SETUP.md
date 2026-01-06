# 🚀 Setup Ambiente Staging - Guida Completa

## 📋 Panoramica

Questa guida spiega come creare un ambiente di staging completamente separato dalla produzione, permettendo di testare cambiamenti senza impattare l'ambiente attuale.

## 🎯 Obiettivi

- ✅ **Preservare completamente l'ambiente di produzione attuale**
- ✅ **Creare un ambiente di staging isolato per test**
- ✅ **Separare database, servizi e configurazioni**
- ✅ **Definire workflow chiaro per deploy e cambiamenti**

---

## 📊 Architettura Ambienti

```
┌─────────────────────────────────────────────────────────┐
│                    PRODUZIONE (main)                     │
├─────────────────────────────────────────────────────────┤
│ • Branch: main                                           │
│ • Vercel: bau-scape (Customer) + bauscape (Provider)   │
│ • Supabase: zyonwzilijgnnnmhxvbo (PROD)                │
│ • Stripe: Live Mode                                     │
│ • Odoo: Production Account                              │
│ • Domain: flixdog.com                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    STAGING (staging)                     │
├─────────────────────────────────────────────────────────┤
│ • Branch: staging                                        │
│ • Vercel: bau-scape-staging + bauscape-staging          │
│ • Supabase: [NUOVO_PROGETTO_STAGING]                    │
│ • Stripe: Test Mode                                     │
│ • Odoo: Test/Sandbox Account                            │
│ • Domain: staging.flixdog.com (o vercel.app)            │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Step 1: Creare Branch Staging

### 1.1 Creare Branch da Main

```bash
cd /Users/adezzani/bauScape

# Assicurati di essere su main e aggiornato
git checkout main
git pull origin main

# Crea branch staging
git checkout -b staging

# Push branch staging su GitHub
git push -u origin staging
```

### 1.2 Configurare Branch Protection (Opzionale ma Consigliato)

Su GitHub:
1. Vai su **Settings** → **Branches**
2. Aggiungi regola per `main`:
   - ✅ Require pull request before merging
   - ✅ Require status checks to pass
   - ✅ Do not allow bypassing

---

## 🗄️ Step 2: Creare Progetto Supabase Staging

### 2.1 Creare Nuovo Progetto Supabase

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Clicca **"New Project"**
3. Configurazione:
   - **Name**: `bau-scape-staging`
   - **Database Password**: Genera password sicura (salvala!)
   - **Region**: Stessa regione del progetto produzione
   - **Pricing Plan**: Free tier (o stesso piano di produzione)

### 2.2 Copiare Schema da Produzione

**Opzione A: Via Supabase CLI (Raccomandato)**

```bash
# Installa Supabase CLI se non ce l'hai
npm install -g supabase

# Login
supabase login

# Link progetto produzione
cd /Users/adezzani/bauScape
supabase link --project-ref zyonwzilijgnnnmhxvbo

# Esporta schema produzione
supabase db dump -f production-schema.sql

# Link progetto staging (sostituisci con il nuovo project-ref)
supabase link --project-ref [STAGING_PROJECT_REF]

# Applica schema a staging
supabase db push
```

**Opzione B: Via Dashboard (Manuale)**

1. Vai su progetto produzione → **SQL Editor**
2. Esegui query per esportare schema (o usa migrations esistenti)
3. Vai su progetto staging → **SQL Editor**
4. Esegui le migrations in ordine:
   - `0019_create_booking.sql`
   - `0020_create_cancellation_request.sql`
   - E altre migrations necessarie

### 2.3 Configurare RLS Policies

Le RLS policies devono essere copiate manualmente o via script. Verifica che tutte le policies siano presenti.

### 2.4 Annotare Credenziali Staging

Salva queste informazioni in un posto sicuro:

```
STAGING_SUPABASE_URL=https://[STAGING_PROJECT_REF].supabase.co
STAGING_SUPABASE_ANON_KEY=[ANON_KEY_STAGING]
STAGING_SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY_STAGING]
STAGING_PROJECT_REF=[STAGING_PROJECT_REF]
```

---

## 💳 Step 3: Configurare Stripe Test Mode

### 3.1 Verificare Account Stripe

1. Vai su [Stripe Dashboard](https://dashboard.stripe.com/)
2. Assicurati di avere accesso a **Test Mode** (toggle in alto a destra)
3. In Test Mode, ottieni:
   - **Publishable Key**: `pk_test_...`
   - **Secret Key**: `sk_test_...`

### 3.2 Creare Webhook Staging

1. In Stripe Dashboard (Test Mode) → **Developers** → **Webhooks**
2. Clicca **"Add endpoint"**
3. Configurazione:
   - **Endpoint URL**: `https://[STAGING_SUPABASE_URL]/functions/v1/stripe-webhook`
   - **Events**: `checkout.session.completed`, `payment_intent.succeeded`
4. Copia il **Signing Secret** (inizia con `whsec_...`)

### 3.3 Annotare Credenziali Stripe Test

```
STAGING_STRIPE_PUBLISHABLE_KEY=pk_test_...
STAGING_STRIPE_SECRET_KEY=sk_test_...
STAGING_STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🏭 Step 4: Configurare Odoo Staging

### 4.1 Opzioni Odoo Staging

**Opzione A: Account Odoo Separato (Raccomandato)**
- Crea un account Odoo di test/sandbox
- Configura prodotti e dati di test

**Opzione B: Stesso Account, Database Diverso**
- Usa lo stesso account Odoo ma database separato
- Configura variabili con suffisso `_STAGING`

### 4.2 Annotare Credenziali Odoo Staging

```
STAGING_OD_URL=[ODOO_URL_STAGING]
STAGING_OD_DB_NAME=[ODOO_DB_NAME_STAGING]
STAGING_OD_LOGIN=[ODOO_EMAIL_STAGING]
STAGING_OD_API_KEY=[ODOO_API_KEY_STAGING]
```

---

## 🚀 Step 5: Creare Progetti Vercel Staging

### 5.1 Creare Progetto Customer Website Staging

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Clicca **"Add New Project"**
3. Configurazione:
   - **Import Git Repository**: `athezani/bauScape`
   - **Project Name**: `bau-scape-staging`
   - **Framework Preset**: Next.js
   - **Root Directory**: `ecommerce-homepage`
   - **Branch**: `staging` ⚠️ **IMPORTANTE: Seleziona staging, non main!**
4. Clicca **"Deploy"**

### 5.2 Configurare Environment Variables (Customer Website)

Vai su **Settings** → **Environment Variables** e aggiungi:

**Per Production Environment:**
```
NEXT_PUBLIC_SUPABASE_URL=[STAGING_SUPABASE_URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[STAGING_SUPABASE_ANON_KEY]
NEXT_PUBLIC_STRIPE_CHECKOUT_URL=[STRIPE_TEST_CHECKOUT_URL]
SUPABASE_URL=[STAGING_SUPABASE_URL]
SUPABASE_SERVICE_ROLE_KEY=[STAGING_SUPABASE_SERVICE_ROLE_KEY]
STRIPE_SECRET_KEY=[STAGING_STRIPE_SECRET_KEY]
ST_WEBHOOK_SECRET=[STAGING_STRIPE_WEBHOOK_SECRET]
OD_URL=[STAGING_OD_URL]
OD_DB_NAME=[STAGING_OD_DB_NAME]
OD_LOGIN=[STAGING_OD_LOGIN]
OD_API_KEY=[STAGING_OD_API_KEY]
```

⚠️ **IMPORTANTE**: 
- Seleziona **solo "Production"** per queste variabili (non Preview/Development)
- Questo assicura che il branch `staging` usi sempre le variabili di staging

### 5.3 Creare Progetto Provider Portal Staging

1. Clicca **"Add New Project"**
2. Configurazione:
   - **Import Git Repository**: `athezani/bauScape`
   - **Project Name**: `bauscape-staging`
   - **Framework Preset**: Vite
   - **Root Directory**: `baux-paws-access`
   - **Branch**: `staging` ⚠️ **IMPORTANTE: Seleziona staging!**
3. Clicca **"Deploy"**

### 5.4 Configurare Environment Variables (Provider Portal)

Vai su **Settings** → **Environment Variables** e aggiungi:

```
VITE_SUPABASE_URL=[STAGING_SUPABASE_URL]
VITE_SUPABASE_PUBLISHABLE_KEY=[STAGING_SUPABASE_ANON_KEY]
VITE_SUPABASE_PROJECT_ID=[STAGING_PROJECT_REF]
```

⚠️ **IMPORTANTE**: Seleziona **solo "Production"** per queste variabili.

### 5.5 Configurare Supabase Edge Functions per Staging

```bash
cd /Users/adezzani/bauScape/baux-paws-access

# Link progetto staging
supabase link --project-ref [STAGING_PROJECT_REF]

# Configurare secrets
supabase secrets set STRIPE_SECRET_KEY=[STAGING_STRIPE_SECRET_KEY]
supabase secrets set STRIPE_WEBHOOK_SECRET=[STAGING_STRIPE_WEBHOOK_SECRET]
supabase secrets set SUPABASE_URL=[STAGING_SUPABASE_URL]
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=[STAGING_SERVICE_ROLE_KEY]

# Deploy functions
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy create-booking
# ... altre functions necessarie
```

---

## 🔄 Step 6: Workflow per Deploy e Cambiamenti

### 6.1 Workflow Standard

```
┌─────────────┐
│   Feature   │
│   Branch    │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│   Staging   │─────▶│   Testing    │
│   Branch    │      │   & Review   │
└──────┬──────┘      └──────────────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│    Main     │─────▶│  Production  │
│   Branch    │      │    Deploy    │
└─────────────┘      └──────────────┘
```

### 6.2 Processo per Nuovi Cambiamenti

**1. Sviluppo su Feature Branch**
```bash
git checkout staging
git pull origin staging
git checkout -b feature/nome-feature

# Fai le modifiche
git add .
git commit -m "feat: descrizione feature"
git push origin feature/nome-feature
```

**2. Merge su Staging**
```bash
git checkout staging
git merge feature/nome-feature
git push origin staging

# Vercel deployerà automaticamente su staging
```

**3. Test su Staging**
- Verifica che tutto funzioni su staging
- Testa checkout, webhook, booking, etc.
- Verifica con team/clienti se necessario

**4. Merge su Main (Solo dopo test completi)**
```bash
git checkout main
git pull origin main
git merge staging
git push origin main

# Vercel deployerà automaticamente su produzione
```

### 6.3 Hotfix per Produzione

Se serve un fix urgente in produzione:

```bash
# Crea branch da main
git checkout main
git checkout -b hotfix/nome-fix

# Fai il fix
git add .
git commit -m "fix: descrizione fix"
git push origin hotfix/nome-fix

# Merge su main PRIMA
git checkout main
git merge hotfix/nome-fix
git push origin main

# Poi merge su staging per allineare
git checkout staging
git merge main
git push origin staging
```

---

## 📝 Step 7: Documentazione e Checklist

### 7.1 Checklist Setup Completo

- [ ] Branch `staging` creato e pushato su GitHub
- [ ] Progetto Supabase staging creato
- [ ] Schema database copiato su staging
- [ ] RLS policies configurate su staging
- [ ] Credenziali Supabase staging annotate
- [ ] Stripe Test Mode configurato
- [ ] Webhook Stripe staging creato
- [ ] Credenziali Stripe staging annotate
- [ ] Odoo staging configurato
- [ ] Credenziali Odoo staging annotate
- [ ] Progetto Vercel `bau-scape-staging` creato
- [ ] Progetto Vercel `bauscape-staging` creato
- [ ] Environment variables configurate su Vercel staging
- [ ] Supabase Edge Functions deployate su staging
- [ ] Test completo su ambiente staging

### 7.2 File da Creare (Opzionale)

Crea un file `.env.staging.example` con tutte le variabili necessarie (senza valori reali):

```bash
# .env.staging.example
# Copia questo file e riempi con i valori reali

# Supabase Staging
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe Test Mode
STRIPE_SECRET_KEY=
ST_WEBHOOK_SECRET=

# Odoo Staging
OD_URL=
OD_DB_NAME=
OD_LOGIN=
OD_API_KEY=
```

---

## 🚨 Regole Importanti

### ⚠️ NON FARE MAI:

1. ❌ **NON** fare merge da `main` a `staging` senza testare prima
2. ❌ **NON** usare credenziali di produzione in staging
3. ❌ **NON** fare deploy su produzione senza testare su staging
4. ❌ **NON** modificare direttamente il branch `main` (usa sempre staging prima)
5. ❌ **NON** condividere credenziali di produzione in chat/documenti non sicuri

### ✅ SEMPRE:

1. ✅ Testa tutto su staging prima di merge su main
2. ✅ Usa Stripe Test Mode per staging
3. ✅ Verifica che le variabili d'ambiente siano corrette
4. ✅ Documenta cambiamenti importanti
5. ✅ Comunica quando fai deploy su produzione

---

## 📞 Comunicazione per Deploy

### Quando Deployare su Staging

**Non serve comunicare** - puoi deployare su staging quando vuoi per testare.

### Quando Deployare su Produzione

**Comunica sempre** quando fai deploy su produzione:

```
🚀 Deploy in produzione
- Branch: main
- Commit: [hash]
- Cambiamenti: [descrizione breve]
- Testato su staging: ✅
- Deploy automatico: [link Vercel]
```

### Quando Serve Aiuto

Se hai bisogno di aiuto per:
- Setup iniziale staging
- Problemi con deploy
- Configurazione variabili d'ambiente
- Merge complessi
- Hotfix urgenti

**Comunica sempre**:
- Cosa stai facendo
- Quale ambiente (staging/produzione)
- Quale problema stai riscontrando
- Cosa hai già provato

---

## 🔍 Verifica Setup

### Test Ambiente Staging

1. **Customer Website Staging**
   - Visita URL staging (es. `bau-scape-staging.vercel.app`)
   - Verifica che i prodotti si carichino
   - Testa checkout con carta test Stripe
   - Verifica che booking venga creato

2. **Provider Portal Staging**
   - Visita URL staging
   - Verifica login
   - Verifica dashboard
   - Verifica gestione booking

3. **Webhook Stripe Staging**
   - Fai un checkout di test
   - Verifica che webhook venga ricevuto
   - Verifica che booking venga creato in Supabase staging

4. **Database Staging**
   - Verifica che i dati siano separati da produzione
   - Verifica che RLS policies funzionino
   - Verifica che migrations siano applicate

---

## 📚 Risorse Utili

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Branching](https://supabase.com/docs/guides/cli/local-development#database-branching)
- [Stripe Test Mode](https://stripe.com/docs/testing)
- [Git Branching Strategy](https://www.atlassian.com/git/tutorials/comparing-workflows)

---

## ✅ Setup Completato

Una volta completato tutto, l'ambiente di staging sarà completamente funzionante e separato dalla produzione. Puoi testare tutti i cambiamenti in sicurezza prima di deployare su produzione.

**Ricorda**: L'ambiente di produzione (`main`) rimane **completamente invariato** fino a quando non fai merge esplicito da `staging` a `main`.


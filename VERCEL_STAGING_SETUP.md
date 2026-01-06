# 🚀 Configurazione Vercel Staging

## Progetti da Configurare

### 1. ecommerce-homepage (Next.js)

#### Opzione A: Nuovo Progetto Staging
1. Vai su: https://vercel.com/dashboard
2. Clicca **"Add New"** → **"Project"**
3. Importa repository `bauScape`
4. Configura:
   - **Framework Preset**: Next.js
   - **Root Directory**: `ecommerce-homepage`
   - **Project Name**: `ecommerce-homepage-staging` (o nome preferito)
   - **Branch**: `staging`

#### Opzione B: Usa Progetto Esistente con Branch Staging
1. Vai su progetto esistente su Vercel
2. Settings → Git → Aggiungi branch `staging` se non presente
3. Settings → General → Production Branch: `main`
4. Le preview deployments useranno automaticamente `staging`

### 2. Variabili d'Ambiente

#### Variabili Client-Side (NEXT_PUBLIC_*)

Vai su **Settings** → **Environment Variables** e aggiungi:

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ilbbviadwedumvvwqqon.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzg4NjMsImV4cCI6MjA4MzIxNDg2M30.6CvZV598Yv4YD9tvEo5vIADzBDqynxd8X6SIciDBoGw` | Production, Preview, Development |
| `NEXT_PUBLIC_STRIPE_CHECKOUT_URL` | `https://buy.stripe.com/test_5kQeV61dQh2EeiMetc7Re00` | Production, Preview, Development |

⚠️ **Nota**: Stripe rimane quello di produzione come richiesto. Verrà aggiornato quando Stripe produzione sarà attivo.

#### Variabili Server-Side (per API Routes)

Se hai API routes che richiedono secrets server-side, aggiungi anche:

| Key | Value | Environment | Note |
|-----|-------|-------------|------|
| `SUPABASE_URL` | `https://ilbbviadwedumvvwqqon.supabase.co` | Production, Preview, Development | Server-side only |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYzODg2MywiZXhwIjoyMDgzMjE0ODYzfQ.8OsjS-5UsrWbh7Uo5btg0uDtFRMO2AgxXBJfjF9iSS8` | Production, Preview, Development | Server-side only, segreta |
| `STRIPE_SECRET_KEY` | `sk_test_51SZXax2FcuESq0iaywG0P8ZkvV0XBNKGzg28edR7bX8G6V4cKdVZqTu5w1YxDi9ZpBaxiNgjPhmHRbLq8eYSL0ds00cV5FlveI` | Production, Preview, Development | Server-side only, segreta |
| `STRIPE_WEBHOOK_SECRET` | `whsec_MNlOi1KcUEUxpJZGWz0VH9hLnLehuW0E` | Production, Preview, Development | Server-side only, segreta |

### 3. baux-paws-access (Vite)

Se hai anche questo progetto su Vercel:

#### Variabili Client-Side (VITE_*)

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_SUPABASE_URL` | `https://ilbbviadwedumvvwqqon.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzg4NjMsImV4cCI6MjA4MzIxNDg2M30.6CvZV598Yv4YD9tvEo5vIADzBDqynxd8X6SIciDBoGw` | Production, Preview, Development |
| `VITE_STRIPE_CHECKOUT_URL` | `https://buy.stripe.com/test_5kQeV61dQh2EeiMetc7Re00` | Production, Preview, Development |

## Configurazione via CLI (Alternativa)

Se preferisci usare Vercel CLI:

```bash
# Installa Vercel CLI se non presente
npm i -g vercel

# Login
vercel login

# Link progetto
cd ecommerce-homepage
vercel link

# Aggiungi variabili
vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development
# Incolla: https://ilbbviadwedumvvwqqon.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production preview development
# Incolla: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzg4NjMsImV4cCI6MjA4MzIxNDg2M30.6CvZV598Yv4YD9tvEo5vIADzBDqynxd8X6SIciDBoGw

vercel env add NEXT_PUBLIC_STRIPE_CHECKOUT_URL production preview development
# Incolla: https://buy.stripe.com/test_5kQeV61dQh2EeiMetc7Re00
```

## Deploy

Dopo aver configurato le variabili:

1. **Via Dashboard**: Vai su Deployments → Redeploy
2. **Via CLI**: `vercel --prod` (per production) o `vercel` (per preview)
3. **Via Git**: Push su branch `staging` creerà automaticamente preview deployment

## Verifica

Dopo il deploy, verifica:
- ✅ La homepage carica i prodotti da staging
- ✅ Le pagine prodotto funzionano
- ✅ Il checkout Stripe funziona (usa test mode)
- ✅ Non ci sono errori nella console

## URL Staging

Dopo il deploy, avrai un URL tipo:
- Preview: `https://ecommerce-homepage-staging-*.vercel.app`
- Production (se configurato): `https://staging.flixdog.com` (con dominio custom)

## ⚠️ Note Importanti

1. **Stripe**: Attualmente usa le credenziali di produzione. Verrà aggiornato quando Stripe produzione sarà attivo.
2. **Supabase**: Usa completamente staging (ilbbviadwedumvvwqqon)
3. **Branch**: Assicurati che il branch `staging` esista e sia aggiornato
4. **Secrets**: Le variabili server-side sono segrete, non esporle mai pubblicamente


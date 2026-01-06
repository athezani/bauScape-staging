# ✅ Configurazione Finale Vercel

## 📊 Progetti Finali

### 1. **bauscape** - Customer Website
- **Root Directory**: `ecommerce-homepage` ✅
- **Tipo**: Customer Website (Next.js)
- **URL**: `flixdog.com` (dominio custom)
- **Branch Production**: `main`
- **Status**: ✅ **MANTIENI** - Customer Website principale

### 2. **bau-scape** - Provider Portal
- **Root Directory**: `baux-paws-access` ✅
- **Tipo**: Provider Portal (Vite)
- **URL**: `bau-scape.vercel.app`
- **Branch Production**: `main`
- **Status**: ✅ **MANTIENI** - Provider Portal principale

### 3. **ecommerce-homepage** - Non Serve
- **Root Directory**: `/` (vuoto)
- **Status**: ❌ **ELIMINA** - Non serve, duplicato di `bauscape`

---

## 🗑️ Eliminare `ecommerce-homepage`

Il progetto `ecommerce-homepage` con root directory vuota non serve perché:
- `bauscape` già gestisce il Customer Website con root `ecommerce-homepage`
- È un duplicato inutile

**Come eliminare:**
1. Vai su Vercel Dashboard → `ecommerce-homepage`
2. Settings → General → Scroll in basso
3. Clicca "Delete Project"
4. Conferma l'eliminazione

---

## 🚀 Setup Staging

### Per `bauscape` (Customer Website)

1. Vai su Vercel Dashboard → `bauscape`
2. Settings → Environment Variables
3. Aggiungi variabili con **Environment = Preview**:

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ilbbviadwedumvvwqqon.supabase.co` | **Preview** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzg4NjMsImV4cCI6MjA4MzIxNDg2M30.6CvZV598Yv4YD9tvEo5vIADzBDqynxd8X6SIciDBoGw` | **Preview** |
| `NEXT_PUBLIC_STRIPE_CHECKOUT_URL` | `https://buy.stripe.com/test_5kQeV61dQh2EeiMetc7Re00` | **Preview** |
| `SUPABASE_URL` | `https://ilbbviadwedumvvwqqon.supabase.co` | **Preview** |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYzODg2MywiZXhwIjoyMDgzMjE0ODYzfQ.8OsjS-5UsrWbh7Uo5btg0uDtFRMO2AgxXBJfjF9iSS8` | **Preview** |
| `STRIPE_SECRET_KEY` | `sk_test_51SZXax2FcuESq0iaywG0P8ZkvV0XBNKGzg28edR7bX8G6V4cKdVZqTu5w1YxDi9ZpBaxiNgjPhmHRbLq8eYSL0ds00cV5FlveI` | **Preview** |
| `STRIPE_WEBHOOK_SECRET` | `whsec_MNlOi1KcUEUxpJZGWz0VH9hLnLehuW0E` | **Preview** |

### Per `bau-scape` (Provider Portal)

1. Vai su Vercel Dashboard → `bau-scape`
2. Settings → Environment Variables
3. Aggiungi variabili con **Environment = Preview**:

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_SUPABASE_URL` | `https://ilbbviadwedumvvwqqon.supabase.co` | **Preview** |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzg4NjMsImV4cCI6MjA4MzIxNDg2M30.6CvZV598Yv4YD9tvEo5vIADzBDqynxd8X6SIciDBoGw` | **Preview** |

---

## 📋 Checklist Setup Completo

### Step 1: Pulizia
- [ ] Elimina progetto `ecommerce-homepage` (root vuoto)
- [ ] Verifica che `bauscape` e `bau-scape` siano configurati correttamente

### Step 2: Configura Staging
- [ ] Aggiungi variabili Preview a `bauscape` (Customer Website)
- [ ] Aggiungi variabili Preview a `bau-scape` (Provider Portal)

### Step 3: Test
- [ ] Push su branch `staging`
- [ ] Verifica che Preview Deployments usino variabili staging
- [ ] Testa entrambe le applicazioni

---

## 🎯 Configurazione Finale

Dopo il setup, avrai:

### Produzione (branch `main`)
- **bauscape** → Customer Website → `flixdog.com`
- **bau-scape** → Provider Portal → `bau-scape.vercel.app`

### Staging (branch `staging`)
- **bauscape** → Preview Deployment → Usa variabili Preview (staging)
- **bau-scape** → Preview Deployment → Usa variabili Preview (staging)

---

## ✅ Vantaggi di Questa Configurazione

1. ✅ **Semplice**: Solo 2 progetti da gestire
2. ✅ **Chiaro**: Nomi progetti corrispondono alle applicazioni
3. ✅ **Staging automatico**: Preview Deployments per branch `staging`
4. ✅ **Produzione separata**: Variabili Production vs Preview

---

## 📝 Note

- **Stripe**: Attualmente usa credenziali di produzione. Verrà aggiornato quando Stripe produzione sarà attivo.
- **Supabase**: Staging completamente separato (ilbbviadwedumvvwqqon)
- **Preview Deployments**: Si attivano automaticamente quando fai push su branch `staging`


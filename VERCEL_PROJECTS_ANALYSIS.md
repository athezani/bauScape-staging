# 📊 Analisi Progetti Vercel

## 🔍 Progetti Attuali

### 1. **ecommerce-homepage**
- **URL**: `ecommerce-homepage-nine.vercel.app`
- **Root Directory**: `ecommerce-homepage` (presumibilmente)
- **Tipo**: Customer Website (Next.js)
- **Status**: ✅ **MANTIENI** - Questo è il Customer Website principale

### 2. **bauscape**
- **URL**: `flixdog.com` (dominio custom!)
- **Root Directory**: `baux-paws-access` (presumibilmente)
- **Tipo**: Provider Portal (Vite)
- **Status**: ✅ **MANTIENI** - Questo è il Provider Portal principale

### 3. **bau-scape**
- **URL**: `bau-scape.vercel.app`
- **Root Directory**: `ecommerce-homepage` o `/` (da verificare)
- **Tipo**: Potrebbe essere duplicato/vecchio
- **Status**: ❓ **DA VERIFICARE** - Potrebbe essere eliminabile

---

## 🗑️ Cosa Eliminare?

### **bau-scape** - Probabilmente Eliminabile

**Motivi:**
- Hai già `ecommerce-homepage` che fa la stessa cosa
- `bau-scape.vercel.app` sembra essere un progetto vecchio/duplicato
- Non è collegato a un dominio custom importante

**Prima di eliminare, verifica:**
1. Vai su Vercel Dashboard → `bau-scape`
2. Settings → General → **Root Directory**
   - Se è `/` (root) → ✅ **ELIMINA** (non serve)
   - Se è `ecommerce-homepage` → ⚠️ **Verifica se è ancora usato**
3. Settings → Domains → Verifica se ha domini custom collegati
   - Se ha solo `bau-scape.vercel.app` → ✅ **ELIMINA**
   - Se ha domini importanti → ⚠️ **NON eliminare**

**Raccomandazione**: Se `bau-scape` ha Root Directory = `/` o è un duplicato di `ecommerce-homepage`, puoi eliminarlo.

---

## 🚀 Setup Staging

### Opzione 1: Preview Deployments (Raccomandato - Più Semplice)

Usa i progetti produzione esistenti con Preview Deployments:

#### Per `ecommerce-homepage`:
1. Vai su progetto `ecommerce-homepage` su Vercel
2. Settings → Environment Variables
3. Aggiungi variabili con **Environment = Preview**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://ilbbviadwedumvvwqqon.supabase.co` (Preview)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (staging anon key) (Preview)
   - `NEXT_PUBLIC_STRIPE_CHECKOUT_URL` = (produzione per ora) (Preview)
   - Variabili server-side (Preview)
4. Quando fai push su branch `staging`, Vercel creerà automaticamente una Preview Deployment con variabili "Preview"

**Vantaggi:**
- ✅ Non serve creare nuovi progetti
- ✅ Gestione centralizzata
- ✅ Preview automatiche per ogni branch

#### Per `bauscape`:
1. Vai su progetto `bauscape` su Vercel
2. Settings → Environment Variables
3. Aggiungi variabili con **Environment = Preview**:
   - `VITE_SUPABASE_URL` = `https://ilbbviadwedumvvwqqon.supabase.co` (Preview)
   - `VITE_SUPABASE_ANON_KEY` = (staging anon key) (Preview)
   - Altre variabili necessarie (Preview)

### Opzione 2: Progetti Separati Staging (Più Complesso)

Se preferisci progetti completamente separati:

#### 1. Crea `ecommerce-homepage-staging`
- Root Directory: `ecommerce-homepage`
- Production Branch: `staging`
- Variabili: Staging (Production environment)

#### 2. Crea `bauscape-staging`
- Root Directory: `baux-paws-access`
- Production Branch: `staging`
- Variabili: Staging (Production environment)

**Nota**: Con questa opzione, le variabili vanno in "Production" environment (perché `staging` è il production branch del progetto staging).

---

## 📋 Checklist Setup Staging

### Step 1: Verifica e Pulizia
- [ ] Verifica Root Directory di `bau-scape`
- [ ] Se `bau-scape` è duplicato/obsoleto, eliminalo
- [ ] Mantieni solo `ecommerce-homepage` e `bauscape`

### Step 2: Configura Staging (Opzione 1 - Preview)
- [ ] Progetto `ecommerce-homepage`:
  - [ ] Aggiungi variabili staging in **Preview** environment
  - [ ] Verifica che branch `staging` esista
- [ ] Progetto `bauscape`:
  - [ ] Aggiungi variabili staging in **Preview** environment
  - [ ] Verifica che branch `staging` esista

### Step 3: Test
- [ ] Push su branch `staging`
- [ ] Verifica che Preview Deployment usi variabili staging
- [ ] Testa che tutto funzioni

---

## 🔧 Variabili da Configurare

### Per `ecommerce-homepage` (Preview Environment)

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ilbbviadwedumvvwqqon.supabase.co` | **Preview** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzg4NjMsImV4cCI6MjA4MzIxNDg2M30.6CvZV598Yv4YD9tvEo5vIADzBDqynxd8X6SIciDBoGw` | **Preview** |
| `NEXT_PUBLIC_STRIPE_CHECKOUT_URL` | `https://buy.stripe.com/test_5kQeV61dQh2EeiMetc7Re00` | **Preview** |
| `SUPABASE_URL` | `https://ilbbviadwedumvvwqqon.supabase.co` | **Preview** |
| `SUPABASE_SERVICE_ROLE_KEY` | (staging service role key) | **Preview** |
| `STRIPE_SECRET_KEY` | (produzione per ora) | **Preview** |
| `STRIPE_WEBHOOK_SECRET` | (produzione per ora) | **Preview** |

### Per `bauscape` (Preview Environment)

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_SUPABASE_URL` | `https://ilbbviadwedumvvwqqon.supabase.co` | **Preview** |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzg4NjMsImV4cCI6MjA4MzIxNDg2M30.6CvZV598Yv4YD9tvEo5vIADzBDqynxd8X6SIciDBoGw` | **Preview** |

---

## ✅ Raccomandazione Finale

1. **Elimina `bau-scape`** se:
   - Root Directory = `/` (root)
   - O è un duplicato di `ecommerce-homepage`
   - Non ha domini custom importanti

2. **Usa Preview Deployments** per staging:
   - Più semplice da gestire
   - Non serve creare nuovi progetti
   - Preview automatiche per ogni branch

3. **Mantieni solo 2 progetti produzione**:
   - `ecommerce-homepage` (Customer Website)
   - `bauscape` (Provider Portal)

---

## 🎯 Prossimi Step

1. Verifica Root Directory di `bau-scape` su Vercel Dashboard
2. Se è obsoleto, eliminalo
3. Configura variabili Preview su `ecommerce-homepage` e `bauscape`
4. Testa con push su branch `staging`


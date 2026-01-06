# 🔧 Correzione Configurazione Progetti Vercel

## 🚨 Problema Identificato

La configurazione attuale è **SBAGLIATA**:

| Progetto | Root Directory Attuale | Root Directory Corretta | Status |
|----------|------------------------|-------------------------|--------|
| `ecommerce-homepage` | `/` (vuoto) | `ecommerce-homepage` | ❌ DA CORREGGERE |
| `bauscape` | `ecommerce-homepage` | `baux-paws-access` | ❌ DA CORREGGERE |
| `bau-scape` | `baux-paws-access` | `baux-paws-access` | ✅ CORRETTO |

## 📊 Situazione Reale

### 1. `ecommerce-homepage`
- **Root Directory**: `/` (vuoto) ❌
- **Dovrebbe essere**: `ecommerce-homepage`
- **Problema**: Sta buildando dalla root invece che dalla cartella corretta
- **URL**: `ecommerce-homepage-nine.vercel.app`

### 2. `bauscape`
- **Root Directory**: `ecommerce-homepage` ❌
- **Dovrebbe essere**: `baux-paws-access`
- **Problema**: Sta buildando il Customer Website invece del Provider Portal!
- **URL**: `flixdog.com` (dominio custom)
- **Nota**: Questo spiega perché flixdog.com potrebbe mostrare il Customer Website invece del Provider Portal

### 3. `bau-scape`
- **Root Directory**: `baux-paws-access` ✅
- **Corretto**: Questo è il Provider Portal
- **URL**: `bau-scape.vercel.app`

## 🔧 Soluzione

### Opzione 1: Correggere i Progetti Esistenti (Raccomandato)

#### Step 1: Correggi `ecommerce-homepage`
1. Vai su Vercel Dashboard → `ecommerce-homepage`
2. Settings → General → **Root Directory**
3. Cambia da `/` (vuoto) a `ecommerce-homepage`
4. Salva
5. Vai su Deployments → **Redeploy** (per applicare la modifica)

#### Step 2: Correggi `bauscape`
1. Vai su Vercel Dashboard → `bauscape`
2. Settings → General → **Root Directory**
3. Cambia da `ecommerce-homepage` a `baux-paws-access`
4. Salva
5. Vai su Deployments → **Redeploy** (per applicare la modifica)

#### Step 3: Elimina `bau-scape` (Opzionale)
- Se `bauscape` (flixdog.com) ora funziona correttamente, puoi eliminare `bau-scape`
- Oppure mantienilo come backup/staging

### Opzione 2: Usa `bau-scape` come Provider Portal Principale

Se `bauscape` ha problemi o preferisci:
1. Collega il dominio `flixdog.com` a `bau-scape` invece che a `bauscape`
2. Elimina `bauscape`
3. Rinomina `bau-scape` in `bauscape` (se possibile) o lascialo così

## ✅ Configurazione Finale Corretta

Dopo le correzioni, dovresti avere:

### 1. `ecommerce-homepage`
- **Root Directory**: `ecommerce-homepage` ✅
- **Tipo**: Customer Website (Next.js)
- **URL**: `ecommerce-homepage-nine.vercel.app`
- **Branch Production**: `main`

### 2. `bauscape` (o `bau-scape`)
- **Root Directory**: `baux-paws-access` ✅
- **Tipo**: Provider Portal (Vite)
- **URL**: `flixdog.com` (se collegato a `bauscape`) o `bau-scape.vercel.app`
- **Branch Production**: `main`

## 🚀 Setup Staging Dopo Correzione

Dopo aver corretto i progetti, configura staging:

### Per `ecommerce-homepage`:
1. Settings → Environment Variables
2. Aggiungi variabili con **Environment = Preview**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://ilbbviadwedumvvwqqon.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (staging anon key)
   - `NEXT_PUBLIC_STRIPE_CHECKOUT_URL` = (produzione per ora)
   - Variabili server-side (staging)

### Per `bauscape` (o `bau-scape`):
1. Settings → Environment Variables
2. Aggiungi variabili con **Environment = Preview**:
   - `VITE_SUPABASE_URL` = `https://ilbbviadwedumvvwqqon.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (staging anon key)

## ⚠️ Attenzione

**Prima di correggere:**
1. Verifica quale progetto ha il dominio `flixdog.com` collegato
2. Se `bauscape` ha `flixdog.com`, correggi `bauscape`
3. Se `bau-scape` ha `flixdog.com`, usa `bau-scape` come principale

**Dopo la correzione:**
- I progetti potrebbero avere bisogno di un nuovo deploy
- Verifica che tutto funzioni correttamente
- Testa entrambe le applicazioni

## 📋 Checklist

- [ ] Verifica quale progetto ha dominio `flixdog.com`
- [ ] Correggi Root Directory di `ecommerce-homepage` → `ecommerce-homepage`
- [ ] Correggi Root Directory di `bauscape` → `baux-paws-access`
- [ ] Redeploy entrambi i progetti
- [ ] Verifica che funzionino correttamente
- [ ] Configura variabili staging (Preview environment)
- [ ] (Opzionale) Elimina `bau-scape` se non serve più


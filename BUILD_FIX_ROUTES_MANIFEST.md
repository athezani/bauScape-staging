# Fix: Errore "routes-manifest.json not found"

## 🔍 Problema

Dopo che il build funziona correttamente con webpack, Vercel mostra:
```
Error: The file "/vercel/path0/.next/routes-manifest.json" couldn't be found.
```

## 🔎 Root Cause

Il file `routes-manifest.json` **esiste** in `ecommerce-homepage/.next/routes-manifest.json`, ma Vercel lo cerca in `/vercel/path0/.next/routes-manifest.json` (root del repository).

**Causa**: La **Root Directory** su Vercel Dashboard non è configurata correttamente.

## ✅ Soluzione

### Step 1: Configura Root Directory su Vercel Dashboard

1. Vai su **Vercel Dashboard** → Progetto `bauscape-staging`
2. Vai su **Settings** → **General**
3. Scorri fino a **Root Directory**
4. **DEVE essere**: `ecommerce-homepage`
   - Se è vuoto o `/` → Cambialo a `ecommerce-homepage`
   - Se è già `ecommerce-homepage` → Verifica che sia salvato correttamente
5. Clicca **Save**

### Step 2: Verifica Build Command

Assicurati che il Build Command sia:
```
./build-next-webpack.sh
```

### Step 3: Riedploya

1. Vai su **Deployments**
2. Clicca sui 3 puntini dell'ultimo deploy
3. Seleziona **Redeploy**
4. **IMPORTANTE**: Deseleziona **"Use existing Build Cache"**
5. Clicca **Redeploy**

## 📋 Verifica

Dopo il deploy, verifica che:
- ✅ Il build completa senza errori
- ✅ Non c'è più l'errore "routes-manifest.json not found"
- ✅ Il deploy è completato con successo

## 🔍 Perché Funziona?

- **Con Root Directory = `/`**: Vercel cerca `.next/` nella root del repository → ❌ Non trovato
- **Con Root Directory = `ecommerce-homepage`**: Vercel cerca `ecommerce-homepage/.next/` → ✅ Trovato

Il file `routes-manifest.json` viene generato durante `next build` dentro `ecommerce-homepage/.next/`, quindi Vercel deve sapere che la root del progetto Next.js è `ecommerce-homepage/`, non la root del repository.


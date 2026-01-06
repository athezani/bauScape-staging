# 🔍 Checklist: Perché il Deploy su Staging Non Parte

## Differenze Chiave tra Produzione e Staging

### 1. Repository GitHub
- **Produzione**: `athezani/bauScape` (branch `main`)
- **Staging**: `athezani/bauScape-staging` (branch `main`)

### 2. Progetto Vercel
- **Produzione**: Progetto collegato a `athezani/bauScape`
- **Staging**: Progetto `bauscape-staging` collegato a `athezani/bauScape-staging`

### 3. Variabili d'Ambiente Supabase
- **Produzione**: `zyonwzilijgnnnmhxvbo.supabase.co`
- **Staging**: `ilbbviadwedumvvwqqon.supabase.co`

## ⚠️ Punti Critici da Verificare

### 1. Repository GitHub Staging
```bash
# Verifica che il push sia andato a buon fine
git log staging-origin/main --oneline -5
```

**Problema possibile**: Il push non è stato fatto o è fallito.

### 2. Configurazione Vercel Staging

Verifica su Vercel Dashboard → Progetto `bauscape-staging` → Settings:

#### A. Git Integration
- ✅ Repository collegata: `athezani/bauScape-staging`
- ✅ Production Branch: `main`
- ✅ Auto-deploy: Abilitato

#### B. Root Directory
- ✅ **DEVE essere**: `ecommerce-homepage`
- ❌ **NON può essere**: vuoto o `/`

#### C. Build Command
- ✅ **DEVE essere**: `./build-next-webpack.sh`
- ❌ **NON può essere**: `next build` o `npm run build`

#### D. Environment Variables
Verifica che siano configurate per **Production** environment:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` = `https://ilbbviadwedumvvwqqon.supabase.co`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (chiave staging)
- ✅ `SUPABASE_URL` = `https://ilbbviadwedumvvwqqon.supabase.co`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` = (chiave staging)

**⚠️ CRITICO**: Le variabili `NEXT_PUBLIC_*` devono essere disponibili al **BUILD TIME**.

### 3. Webhook GitHub → Vercel

**Problema possibile**: Il webhook GitHub non è configurato o è rotto.

Verifica:
1. Vai su GitHub → `athezani/bauScape-staging` → Settings → Webhooks
2. Verifica che ci sia un webhook per Vercel
3. Controlla gli ultimi delivery per vedere se ci sono errori

### 4. Differenze nel Codice

Il codice dovrebbe essere identico, ma verifica:
```bash
# Confronta i file chiave
git diff staging-origin/main main -- ecommerce-homepage/src/lib/supabaseClient.ts
git diff staging-origin/main main -- ecommerce-homepage/build-next-webpack.sh
git diff staging-origin/main main -- ecommerce-homepage/vercel.json
```

## 🚨 Problemi Comuni

### Problema 1: Deploy Non Triggerato
**Sintomo**: Nessun deploy appare su Vercel dopo il push.

**Soluzioni**:
1. Verifica che il push sia andato a buon fine: `git log staging-origin/main -1`
2. Verifica il webhook GitHub → Vercel
3. Prova a fare un redeploy manuale su Vercel Dashboard

### Problema 2: Build Fallisce
**Sintomo**: Deploy parte ma fallisce durante il build.

**Soluzioni**:
1. Verifica che `build-next-webpack.sh` sia eseguibile
2. Verifica che le variabili `NEXT_PUBLIC_*` siano configurate
3. Controlla i log di build su Vercel per errori specifici

### Problema 3: Variabili d'Ambiente Non Disponibili
**Sintomo**: Build passa ma runtime fallisce con "Supabase is not configured".

**Soluzioni**:
1. Verifica che le variabili siano configurate per **Production** environment
2. Verifica che i nomi siano esatti (case-sensitive)
3. Fai un redeploy dopo aver aggiunto/modificato variabili

## ✅ Verifica Rapida

Esegui questi comandi per verificare:

```bash
# 1. Verifica che il codice sia stato pushato
cd /Users/adezzani/bauScape
git log staging-origin/main --oneline -1

# 2. Verifica che non ci siano differenze critiche
git diff staging-origin/main main -- ecommerce-homepage/src/lib/supabaseClient.ts

# 3. Verifica che build-next-webpack.sh esista e sia eseguibile
ls -la ecommerce-homepage/build-next-webpack.sh
```

## 🔧 Fix Immediato

Se il deploy non parte:

1. **Forza un nuovo deploy**:
   - Vai su Vercel Dashboard → Progetto `bauscape-staging`
   - Clicca "Redeploy" sull'ultimo deployment
   - Oppure fai un commit vuoto: `git commit --allow-empty -m "trigger deploy" && git push staging-origin main`

2. **Verifica configurazione**:
   - Root Directory = `ecommerce-homepage`
   - Build Command = `./build-next-webpack.sh`
   - Environment Variables configurate per Production

3. **Controlla i log**:
   - Vai su Vercel Dashboard → Deployments
   - Apri l'ultimo deployment
   - Controlla i log di build per errori


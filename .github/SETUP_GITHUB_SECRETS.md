# 🔐 Setup GitHub Secrets per Test Critici

## ⚠️ Stato Attuale

I test critici sono attualmente **SKIPPATI** in CI perché i GitHub Secrets non sono configurati.

Il deploy procede comunque, ma **NON vengono eseguiti i test automatici** prima del deploy.

## ✅ Per Abilitare i Test Automatici (Opzionale)

### 1. Vai su GitHub Secrets

https://github.com/athezani/bauScape/settings/secrets/actions

### 2. Aggiungi i seguenti Secrets

Clicca su **"New repository secret"** per ognuno:

#### Secret 1: `SUPABASE_URL`
- **Name:** `SUPABASE_URL`
- **Value:** `https://zyonwzilijgnnnmhxvbo.supabase.co`

#### Secret 2: `SUPABASE_ANON_KEY`
- **Name:** `SUPABASE_ANON_KEY`
- **Value:** `[copia da .env.test locale]`

#### Secret 3: `SUPABASE_SERVICE_ROLE_KEY`
- **Name:** `SUPABASE_SERVICE_ROLE_KEY`
- **Value:** `[copia da .env.test locale]`

### 3. Come Ottenere i Valori

I valori sono nel file locale `ecommerce-homepage/.env.test`:

```bash
cd ecommerce-homepage
cat .env.test
```

Copia ogni valore e incollalo nel rispettivo secret su GitHub.

### 4. Verifica

Dopo aver configurato i secrets:

1. Fai un nuovo commit/push
2. Vai su **Actions** → Il workflow dovrebbe eseguire i test ✅
3. Se i test passano, il deploy procede
4. Se i test falliscono, il deploy viene bloccato

## 🔒 Sicurezza

- ⚠️ **SUPABASE_SERVICE_ROLE_KEY** ha accesso completo al database
- ✅ I secrets sono criptati e non visibili nei log
- ✅ Solo i workflow possono accedervi
- ⚠️ Non committare MAI questi valori nel codice

## 📊 Differenza con/senza Secrets

### Senza Secrets (Attuale)
```
✅ Build & Deploy procedono
⚠️  Test automatici skippati
ℹ️  Test eseguiti solo localmente
```

### Con Secrets (Opzionale)
```
✅ Build & Deploy procedono SOLO se test passano
✅ Test automatici eseguiti
🛡️ Deploy bloccato se test falliscono
```

## 🎯 Raccomandazione

**Per ambiente di produzione:** Configura i secrets per avere protezione completa.

**Per test/sviluppo:** Puoi lasciare i test skippati in CI e eseguirli solo localmente.

## 📝 Note

I test locali continuano a funzionare normalmente:

```bash
cd ecommerce-homepage
npm run test:critical
```

I secrets sono necessari **SOLO** per i test automatici in GitHub Actions.


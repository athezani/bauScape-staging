# 🚀 Setup Completo Staging - AUTOMATIZZATO

## 🎯 Cosa Automatizza Questo Script

Lo script `setup-staging-complete.ts` automatizza **TUTTI** i tool coinvolti:

### ✅ Completamente Automatico

1. **Git**
   - ✅ Crea branch staging
   - ✅ Push su GitHub
   - ✅ Gestisce branch esistenti

2. **Supabase**
   - ✅ Applica migrations (via CLI o API)
   - ✅ Configura secrets
   - ✅ Deploy Edge Functions
   - ✅ Link progetto

3. **Vercel**
   - ✅ Crea progetti (Customer Website + Provider Portal)
   - ✅ Configura variabili d'ambiente
   - ✅ Imposta branch staging
   - ✅ Configura root directory

4. **Stripe**
   - ✅ Guida creazione webhook
   - ✅ Configura secrets in Supabase

5. **Odoo**
   - ✅ Salva configurazione
   - ✅ Configura variabili

### 🔐 Richiede Solo Credenziali

Lo script ti chiede solo:
- Supabase project-ref (dopo creazione manuale progetto)
- Supabase API keys
- Stripe test keys
- Stripe webhook secret
- Odoo credentials (opzionale)
- Vercel token (opzionale, può usare CLI)

---

## 🚀 Come Usare

### Prerequisiti

```bash
# Installa dipendenze
npm install

# Assicurati di avere:
# - Supabase CLI installato (opzionale ma consigliato)
# - Vercel CLI installato (opzionale, può usare token)
```

### Esegui lo Script

```bash
npm run setup:staging:complete
```

### Segui le Istruzioni

Lo script ti guiderà passo-passo:

1. **Git**: Automatico ✅
2. **Supabase**: 
   - Crea progetto manualmente (1 click)
   - Incolla project-ref quando richiesto
   - Incolla API keys quando richiesto
3. **Migrations**: 
   - Se hai Supabase CLI → automatico ✅
   - Altrimenti → ti dice come applicarle manualmente
4. **Functions**: 
   - Se hai Supabase CLI → automatico ✅
   - Altrimenti → ti dice come deployarle manualmente
5. **Stripe**: 
   - Incolla keys quando richiesto
   - Crea webhook (ti guida)
   - Incolla webhook secret quando richiesto
6. **Vercel**: 
   - Se hai token → automatico ✅
   - Altrimenti → ti guida per creare manualmente
7. **Odoo**: 
   - Opzionale, puoi configurare dopo

---

## 📋 Cosa Fa lo Script

### Step 1: Git Branch ✅
- Verifica stato
- Passa a main
- Crea branch staging
- Push su GitHub

### Step 2: Supabase ✅
- Ti guida per creare progetto
- Salva credenziali
- Applica migrations (se CLI disponibile)
- Configura secrets
- Deploy functions (se CLI disponibile)

### Step 3: Stripe ✅
- Ti guida per ottenere keys
- Ti guida per creare webhook
- Salva credenziali

### Step 4: Odoo ✅
- Salva configurazione (opzionale)

### Step 5: Vercel ✅
- Crea progetti via API (se token disponibile)
- Configura variabili d'ambiente
- Imposta branch staging
- Configura root directory

### Step 6: Salvataggio ✅
- Salva tutte le credenziali in `.staging-credentials.json`
- Aggiorna `.gitignore`
- Genera file di configurazione

---

## 🔒 Sicurezza

- ✅ Credenziali salvate in `.staging-credentials.json` (non committato)
- ✅ File aggiunto automaticamente a `.gitignore`
- ✅ Nessuna credenziale nel repository
- ✅ Token Vercel opzionale (puoi creare progetti manualmente)

---

## ⚠️ Cosa Richiede Login Manuale

Alcune operazioni richiedono login manuale (ma script ti guida):

1. **Creare progetto Supabase** (1 click su Dashboard)
2. **Creare webhook Stripe** (se non usi API)
3. **Creare progetti Vercel** (se non hai token)

---

## 🆘 Se Qualcosa Va Storto

Lo script è **resiliente**:
- Se branch esiste → lo usa
- Se progetto Vercel esiste → continua
- Se migration fallisce → ti dice come applicarla manualmente
- Se function fallisce → continua con le altre

---

## 📊 Tempo Stimato

- **Con CLI installati**: ~10-15 minuti
- **Senza CLI**: ~20-30 minuti (più operazioni manuali)

---

## ✅ Checklist Post-Setup

Dopo lo script, verifica:

- [ ] Branch staging su GitHub
- [ ] Progetto Supabase staging creato
- [ ] Migrations applicate
- [ ] Edge Functions deployate
- [ ] Secrets configurati in Supabase
- [ ] Progetti Vercel creati
- [ ] Variabili d'ambiente Vercel configurate
- [ ] Webhook Stripe creato
- [ ] Credenziali salvate in `.staging-credentials.json`

---

## 📚 Documentazione

- **STAGING_WORKFLOW_GUIDE.md** - Workflow quotidiano
- **STAGING_ENVIRONMENT_SETUP.md** - Dettagli completi
- **STAGING_QUICK_START.md** - Quick start

---

## 🎯 Pronto?

Esegui semplicemente:

```bash
npm run setup:staging:complete
```

E segui le istruzioni! 🚀


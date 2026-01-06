# 🤖 Setup Staging Completamente Automatico

## 🎯 Cosa Posso Fare Autonomamente

Ho creato uno script che automatizza **tutto il possibile**. Ecco cosa viene fatto automaticamente e cosa richiede le tue credenziali:

### ✅ Completamente Automatico (Zero Intervento)

1. **Creare branch staging** - Script crea e pusha automaticamente
2. **Generare file di configurazione** - Script genera tutto automaticamente
3. **Preparare script per Vercel** - Script genera script di configurazione
4. **Salvare credenziali** - Script salva tutto in file sicuro (non committato)

### 🔐 Richiede le Tue Credenziali (Ma ti Guido)

1. **Supabase Project** - Devi crearlo manualmente (1 click), poi incolli project-ref
2. **Supabase API Keys** - Incolli anon key e service role key
3. **Stripe Test Keys** - Incolli publishable e secret key
4. **Stripe Webhook Secret** - Incolli dopo aver creato webhook
5. **Odoo Credentials** - Opzionale, puoi configurare dopo

### 🚀 Richiede Login Manuale (Ma Script Ti Guida)

1. **Vercel Projects** - Devi crearli manualmente (ma script ti dice esattamente cosa fare)
2. **Vercel Environment Variables** - Script genera script automatico per configurarle

---

## 🚀 Come Usare lo Script

### Step 1: Esegui lo Script

```bash
cd /Users/adezzani/bauScape
tsx setup-staging-environment.ts
```

### Step 2: Segui le Istruzioni

Lo script ti chiederà:
1. **Supabase Project Reference** - Dopo che crei il progetto su Supabase Dashboard
2. **Supabase API Keys** - Dopo che le copi da Settings → API
3. **Stripe Keys** - Dopo che le copi da Stripe Dashboard (Test Mode)
4. **Stripe Webhook Secret** - Dopo che crei il webhook
5. **Odoo Credentials** - Opzionale

### Step 3: Script Fa il Resto

Lo script:
- ✅ Crea branch staging
- ✅ Salva tutte le credenziali
- ✅ Genera script per Vercel
- ✅ Prepara tutto per deploy

### Step 4: Configura Vercel (Semi-Automatico)

Dopo che crei i progetti Vercel manualmente:

```bash
# Ottieni token Vercel: https://vercel.com/account/tokens
export VERCEL_TOKEN=your_token

# Esegui script automatico
tsx configure-vercel-staging.ts
```

Lo script configurerà automaticamente tutte le variabili d'ambiente su Vercel!

---

## 📋 Checklist Completa

### ✅ Automatico (Script Fa Tutto)

- [x] Creare branch staging
- [x] Push branch su GitHub
- [x] Salvare credenziali
- [x] Generare script Vercel
- [x] Generare file .env.example

### 🔐 Manuale (Ma ti Guido)

- [ ] Creare progetto Supabase staging (1 click, poi incolli project-ref)
- [ ] Copiare Supabase API keys (incolli quando richiesto)
- [ ] Creare Stripe webhook (incolli secret quando richiesto)
- [ ] Creare progetti Vercel (2 progetti, script ti dice esattamente cosa fare)
- [ ] Eseguire script Vercel (1 comando dopo aver creato progetti)

### ⚙️ Opzionale (Puoi Fare Dopo)

- [ ] Applicare migrations Supabase (puoi fare via CLI o Dashboard)
- [ ] Deploy Edge Functions (puoi fare dopo)
- [ ] Configurare Odoo staging (puoi fare dopo)

---

## 🎯 Tempo Stimato

- **Script automatico**: ~5 minuti (solo incollare credenziali quando richiesto)
- **Setup manuale Supabase**: ~2 minuti (creare progetto, copiare keys)
- **Setup manuale Stripe**: ~3 minuti (copiare keys, creare webhook)
- **Setup manuale Vercel**: ~5 minuti (creare progetti, eseguire script)
- **Totale**: ~15 minuti (vs 1-2 ore manuale)

---

## 🔒 Sicurezza

- ✅ Credenziali salvate in `.staging-credentials.json` (non committato)
- ✅ File aggiunto automaticamente a `.gitignore`
- ✅ Nessuna credenziale committata nel repository
- ✅ Script genera solo file di esempio

---

## 🆘 Se Qualcosa Va Storto

Lo script è progettato per essere **resiliente**:
- Se branch staging esiste già, lo usa
- Se migrations falliscono, ti dice come applicarle manualmente
- Se Vercel script fallisce, puoi configurare manualmente

---

## 📚 Documentazione Completa

Dopo lo setup, consulta:
- **STAGING_WORKFLOW_GUIDE.md** - Workflow quotidiano
- **STAGING_ENVIRONMENT_SETUP.md** - Dettagli completi

---

## ✅ Pronto?

Esegui semplicemente:

```bash
tsx setup-staging-environment.ts
```

E segui le istruzioni! 🚀


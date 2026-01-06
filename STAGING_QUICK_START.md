# ⚡ Staging Environment - Quick Start

## 🎯 Setup Completamente Automatico

Ho creato uno script che automatizza **TUTTI i tool coinvolti**:
- ✅ Git (branch staging)
- ✅ Supabase (migrations, functions, secrets)
- ✅ Stripe (webhook, secrets)
- ✅ Vercel (progetti, variabili)
- ✅ Odoo (configurazione)

## 🚀 Avvio Rapido

```bash
# Installa dipendenze (se necessario)
npm install

# Esegui script completo automatico
npm run setup:staging:complete
```

Lo script automatizza tutto e ti guida solo per le credenziali!

## 📋 Cosa Fa lo Script

### ✅ Automatico
- Crea branch staging
- Push su GitHub
- Salva credenziali
- Genera script per Vercel
- Prepara tutto

### 🔐 Ti Chiede Solo
- Supabase project-ref (dopo che crei progetto)
- Supabase API keys
- Stripe test keys
- Stripe webhook secret

### 🚀 Dopo lo Script
1. Crea progetti Vercel (script ti dice esattamente come)
2. Esegui: `tsx configure-vercel-staging.ts`

## 📚 Documentazione Completa

- **[STAGING_COMPLETE_SETUP.md](./STAGING_COMPLETE_SETUP.md)** - 🚀 **Setup completo automatizzato (LEGGI QUESTO!)**
- **[STAGING_ENVIRONMENT_SETUP.md](./STAGING_ENVIRONMENT_SETUP.md)** - Setup manuale dettagliato
- **[STAGING_WORKFLOW_GUIDE.md](./STAGING_WORKFLOW_GUIDE.md)** - Workflow quotidiano

## ⚠️ Importante

- ✅ Ambiente produzione rimane **completamente invariato**
- ✅ Tutte le credenziali salvate in file sicuro (non committato)
- ✅ Script resiliente (gestisce errori gracefully)

---

**Prossimo passo**: Esegui `npm run setup:staging:complete` e segui le istruzioni! 🚀

**Tempo stimato**: 10-15 minuti (con CLI) o 20-30 minuti (senza CLI)

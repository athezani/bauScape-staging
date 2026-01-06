# 🔄 Workflow Staging - Guida Rapida

## 📋 Quick Reference

### Ambienti

| Ambiente | Branch | Vercel Project | Supabase | Stripe | Quando Usare |
|---------|--------|----------------|----------|--------|--------------|
| **Staging** | `staging` | `bau-scape-staging` | Staging Project | Test Mode | Test e sviluppo |
| **Production** | `main` | `bau-scape` | Production | Live Mode | Solo dopo test completi |

---

## 🚀 Workflow Standard

### 1. Sviluppo Nuova Feature

```bash
# Parti da staging aggiornato
git checkout staging
git pull origin staging

# Crea feature branch
git checkout -b feature/nome-feature

# Sviluppa e committa
git add .
git commit -m "feat: descrizione feature"
git push origin feature/nome-feature
```

### 2. Test su Staging

```bash
# Merge su staging
git checkout staging
git merge feature/nome-feature
git push origin staging

# Vercel deployerà automaticamente
# Testa su: https://bau-scape-staging.vercel.app
```

**Cosa testare:**
- ✅ Funzionalità nuova
- ✅ Checkout funziona
- ✅ Webhook ricevuto
- ✅ Booking creato correttamente
- ✅ Nessun errore in console

### 3. Deploy su Produzione (Solo dopo test completi)

```bash
# Merge su main
git checkout main
git pull origin main
git merge staging
git push origin main

# Vercel deployerà automaticamente su produzione
# Comunica il deploy al team
```

---

## 🚨 Hotfix Urgente

Se serve un fix immediato in produzione:

```bash
# Crea branch da main
git checkout main
git checkout -b hotfix/nome-fix

# Fai il fix
git add .
git commit -m "fix: descrizione fix urgente"
git push origin hotfix/nome-fix

# Merge su main PRIMA (produzione)
git checkout main
git merge hotfix/nome-fix
git push origin main

# Poi allinea staging
git checkout staging
git merge main
git push origin staging
```

---

## 📝 Checklist Pre-Deploy Produzione

Prima di fare merge su `main`, verifica:

- [ ] ✅ Testato completamente su staging
- [ ] ✅ Nessun errore in console
- [ ] ✅ Checkout funziona
- [ ] ✅ Webhook ricevuto correttamente
- [ ] ✅ Booking creato nel database
- [ ] ✅ Nessun breaking change
- [ ] ✅ Variabili d'ambiente corrette
- [ ] ✅ Migrations applicate (se necessario)

---

## 🔍 Verifica Ambiente Corretto

### Come Sapere su Quale Ambiente Sei

**Vercel:**
- Staging: `bau-scape-staging.vercel.app`
- Production: `flixdog.com` o `bau-scape.vercel.app`

**Git:**
```bash
git branch
# Mostra branch corrente
```

**Variabili d'Ambiente:**
- Staging: Usa Supabase staging project
- Production: Usa Supabase production project

---

## 🛠️ Comandi Utili

### Sincronizzare Staging con Main

```bash
# Se main ha cambiamenti che staging non ha
git checkout staging
git merge main
git push origin staging
```

### Vedere Differenze tra Staging e Main

```bash
git diff main..staging
```

### Rollback su Staging (se qualcosa va storto)

```bash
git checkout staging
git reset --hard origin/staging
git push origin staging --force
```

⚠️ **ATTENZIONE**: `--force` sovrascrive la storia. Usa solo se necessario.

---

## 📞 Quando Comunicare

### ✅ Non Serve Comunicare

- Deploy su staging
- Test su staging
- Sviluppo su feature branch

### 🚨 DEVI Comunicare

- **Deploy su produzione** (sempre!)
- Problemi critici su produzione
- Hotfix urgenti
- Cambiamenti a database/migrations
- Cambiamenti a variabili d'ambiente produzione

### 📧 Template Comunicazione Deploy Produzione

```
🚀 Deploy in Produzione

Branch: main
Commit: [hash breve]
Cambiamenti: [descrizione breve]
Testato su staging: ✅
Deploy: [link Vercel deployment]

Note: [eventuali note importanti]
```

---

## 🐛 Troubleshooting

### Deploy su Staging Non Funziona

1. Verifica che il branch sia `staging`
2. Verifica che Vercel sia collegato al branch corretto
3. Controlla i log di build su Vercel
4. Verifica variabili d'ambiente

### Variabili d'Ambiente Sbagliate

1. Vai su Vercel Dashboard → Settings → Environment Variables
2. Verifica che siano configurate per il progetto corretto
3. Verifica che l'environment sia "Production" (per branch staging/main)
4. Fai redeploy dopo modifiche

### Database Staging Non Sincronizzato

1. Verifica che migrations siano applicate
2. Controlla che RLS policies siano presenti
3. Se necessario, riapplica migrations manualmente

---

## ⚠️ Regole d'Oro

1. **Mai deployare su produzione senza testare su staging**
2. **Mai modificare direttamente main** (usa sempre staging prima)
3. **Mai usare credenziali produzione in staging**
4. **Sempre comunicare deploy produzione**
5. **Sempre testare checkout e webhook dopo deploy**

---

## 📚 Documentazione Completa

Per setup dettagliato, vedi: [STAGING_ENVIRONMENT_SETUP.md](./STAGING_ENVIRONMENT_SETUP.md)


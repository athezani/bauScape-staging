# Aggiornamento Framework Preset Vercel

## ✅ Azioni Completate

1. **Aggiornato `vercel.json`** per forzare Next.js:
   ```json
   {
     "framework": "nextjs",
     "buildCommand": null,
     "outputDirectory": null,
     "installCommand": "npm install --legacy-peer-deps"
   }
   ```

2. **Commit e push** completati - il file è su GitHub

## 🔄 Prossimi Passi

### Opzione 1: Verifica se vercel.json è sufficiente
Il file `vercel.json` con `"framework": "nextjs"` dovrebbe essere letto da Vercel al prossimo deploy. 

**Verifica**:
1. Vai su Vercel Dashboard → Deployments
2. Attendi il nuovo deploy (triggerato dal commit)
3. Verifica che il Framework Preset sia cambiato a Next.js

### Opzione 2: Usa l'API Vercel (se vercel.json non basta)

Se dopo il deploy il Framework Preset è ancora "Vite", usa lo script per aggiornarlo via API:

```bash
# 1. Ottieni un token Vercel
#    Vai su https://vercel.com/account/tokens
#    Crea un nuovo token

# 2. Esegui lo script
export VERCEL_TOKEN=your_token_here
./scripts/update-vercel-via-api.sh
```

Oppure usa Node.js:
```bash
export VERCEL_TOKEN=your_token_here
node scripts/update-vercel-framework.js
```

## 📋 Script Disponibili

1. **`scripts/update-vercel-via-api.sh`** - Script bash per aggiornare via API
2. **`scripts/update-vercel-framework.js`** - Script Node.js per aggiornare via API

Entrambi richiedono `VERCEL_TOKEN` come variabile d'ambiente.

## 🎯 Risultato Atteso

Dopo l'aggiornamento, Vercel dovrebbe:
- ✅ Rilevare Next.js come framework
- ✅ Usare `next build` automaticamente
- ✅ Usare `.next/` come output directory
- ✅ Servire correttamente tutte le route Next.js, incluso `/regolamento-a-6-zampe`

## ⚠️ Nota

Il file `vercel.json` con `"framework": "nextjs"` dovrebbe essere sufficiente. Se Vercel continua a usare Vite, usa gli script API per forzare l'aggiornamento.


# Istruzioni per Deploy su Vercel

## Prerequisiti

1. Account Vercel (gratuito)
2. Node.js e npm installati

## Opzione 1: Deploy tramite CLI (Raccomandato)

### Step 1: Login a Vercel

```bash
cd ecommerce-homepage
npx vercel login
```

Segui le istruzioni per autenticarti tramite browser.

### Step 2: Deploy

```bash
# Deploy in produzione
npx vercel --prod --yes

# Oppure usa lo script
./deploy.sh
```

## Opzione 2: Deploy tramite GitHub (Automatico)

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Clicca "Add New Project"
3. Connetti il repository GitHub
4. Seleziona la cartella `ecommerce-homepage`
5. Configura:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`
6. Aggiungi le variabili d'ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Clicca "Deploy"

## Variabili d'Ambiente Richieste

Assicurati di configurare queste variabili in Vercel Dashboard → Settings → Environment Variables:

- `VITE_SUPABASE_URL` - URL del progetto Supabase
- `VITE_SUPABASE_ANON_KEY` - Chiave anonima di Supabase

## Verifica Deploy

Dopo il deploy, verifica che:
1. Il sito sia accessibile
2. I prodotti vengano caricati correttamente
3. Il checkout Stripe funzioni

## Troubleshooting

### Errore: "Token not valid"
```bash
npx vercel logout
npx vercel login
```

### Errore: "Build failed"
- Verifica che tutte le dipendenze siano installate
- Controlla i log di build in Vercel Dashboard
- Verifica che le variabili d'ambiente siano configurate

### Errore: "404 on routes"
- Verifica che `vercel.json` contenga le rewrites corrette
- Assicurati che `outputDirectory` sia `build`

## Note

- Il deploy automatico avviene ad ogni push su `main` se configurato
- I deploy di preview vengono creati per ogni pull request
- I log sono disponibili in Vercel Dashboard → Deployments




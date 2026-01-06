# Configurazione Vercel per Next.js

## ⚠️ IMPORTANTE: Configurazione Dashboard Vercel

Il problema `routes-manifest.json` in `build/` è causato da una configurazione nel **Vercel Dashboard** che dice che il framework è **Vite** invece di **Next.js**.

### Step 1: Aggiorna Framework Preset nel Dashboard

1. Vai su **Vercel Dashboard** → Il tuo progetto → **Settings** → **General**
2. Scorri fino a **Build & Development Settings**
3. **IMPORTANTE**: Cambia **Framework Preset** da **Vite** a **Next.js**
4. Rimuovi o lascia vuoto **Output Directory** (Next.js usa automaticamente `.next/`)
5. Rimuovi o lascia vuoto **Build Command** (Next.js usa automaticamente `next build`)
6. Lascia **Install Command** vuoto (vercel.json gestisce `--legacy-peer-deps`)
7. Clicca **Save**

### Step 2: Verifica Root Directory

1. Nella stessa pagina, verifica che **Root Directory** sia: `ecommerce-homepage`
2. Se non lo è, cambialo e salva

### Step 3: Variabili d'Ambiente

Assicurati che le variabili d'ambiente siano configurate:
- `NEXT_PUBLIC_SUPABASE_URL` (non `VITE_SUPABASE_URL`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (non `VITE_SUPABASE_ANON_KEY`)

**NOTA**: Next.js usa `NEXT_PUBLIC_*` invece di `VITE_*` per le variabili pubbliche.

### Step 4: Trigger Nuovo Deploy

Dopo aver cambiato il Framework Preset:
1. Vai su **Deployments**
2. Clicca **Create Deployment**
3. Seleziona branch `main`
4. Clicca **Deploy**

## Perché questo risolve il problema?

- **Vite** cerca `build/routes-manifest.json`
- **Next.js** genera `.next/routes-manifest.json`
- Cambiando il Framework Preset, Vercel sa di usare Next.js e cerca i file nel posto giusto

## File vercel.json

Il `vercel.json` contiene solo:
```json
{
  "installCommand": "npm install --legacy-peer-deps"
}
```

Vercel auto-rileva Next.js e usa il processo di build di default.


# Configurazione Variabili d'Ambiente Vercel

## Variabili Richieste per Next.js

Le seguenti variabili d'ambiente devono essere configurate su Vercel con il prefisso `NEXT_PUBLIC_*`:

### 1. Supabase Configuration

- **NEXT_PUBLIC_SUPABASE_URL**: `https://zyonwzilijgnnnmhxvbo.supabase.co`
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: `sb_publishable_tVK70OrNKiaVmttm2WxyXA_tMFn9bUc`

### 2. Stripe Configuration (opzionale, se usato nel client)

- **NEXT_PUBLIC_STRIPE_CHECKOUT_URL**: `https://buy.stripe.com/test_5kQeV61dQh2EeiMetc7Re00`

## Come Aggiungere su Vercel

1. Vai su **Vercel Dashboard** → Il tuo progetto → **Settings** → **Environment Variables**
2. Per ogni variabile:
   - Clicca su **"Add New"**
   - **Key**: Nome esatto (es. `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: Il valore corrispondente
   - **Environment**: Seleziona **Production**, **Preview**, e **Development**
   - Clicca su **Save**
3. Dopo aver aggiunto tutte le variabili, fai un **nuovo deploy**

## Verifica

Dopo il deploy, verifica che:
- ✅ La homepage carica i prodotti correttamente
- ✅ Le pagine prodotto (`/prodotto/[type]/[id]`) caricano senza errori
- ✅ L'`AvailabilitySelector` funziona correttamente
- ✅ Non ci sono errori nella console del browser

## Nota

Il codice supporta automaticamente sia `VITE_*` (per Vite) che `NEXT_PUBLIC_*` (per Next.js), quindi puoi mantenere entrambe le variabili se necessario.


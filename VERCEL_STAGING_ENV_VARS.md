# Variabili d'Ambiente Vercel per bauscape-staging

## Variabili Richieste

Configura queste variabili su Vercel per il progetto **bauscape-staging**:

### Variabili Pubbliche (NEXT_PUBLIC_*)

```
NEXT_PUBLIC_SUPABASE_URL=https://ilbbviadwedumvvwqqon.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzg4NjMsImV4cCI6MjA4MzIxNDg2M30.6CvZV598Yv4YD9tvEo5vIADzBDqynxd8X6SIciDBoGw
NEXT_PUBLIC_STRIPE_CHECKOUT_URL=https://buy.stripe.com/test_5kQeV61dQh2EeiMetc7Re00
```

### Variabili Server-Side

```
SUPABASE_URL=https://ilbbviadwedumvvwqqon.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[DA_CONFIGURARE - ottieni da Supabase Dashboard]
STRIPE_SECRET_KEY=[DA_CONFIGURARE - sk_test_...]
ST_WEBHOOK_SECRET=[DA_CONFIGURARE - whsec_...]
OD_URL=[DA_CONFIGURARE - se usi Odoo]
OD_DB_NAME=[DA_CONFIGURARE - se usi Odoo]
OD_LOGIN=[DA_CONFIGURARE - se usi Odoo]
OD_API_KEY=[DA_CONFIGURARE - se usi Odoo]
```

## Come Configurare

### Step 1: Configura Production Branch

1. Vai su: https://vercel.com/dashboard
2. Seleziona progetto **bauscape-staging**
3. Vai su **Settings** → **General**
4. Nella sezione **Production Branch**, imposta:
   - **Production Branch**: `main` ✅
   - **Perché `main`?** Perché `bauscape-staging` punta a una repository GitHub **completamente separata** (`athezani/bauScape-staging`), quindi non c'è conflitto con il progetto di produzione
   - Questo fa sì che i deploy del branch `main` vadano su **Production** del progetto staging

### Step 2: Configura Environment Variables

1. Vai su **Settings** → **Environment Variables**
2. Per ogni variabile:
   - Clicca **"Add New"**
   - **Key**: Nome esatto (es. `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: Il valore corrispondente
   - **Environment**: Seleziona **✅ Production** (e opzionalmente Preview/Development se vuoi testare altri branch)
   - Clicca **Save**

⚠️ **IMPORTANTE**: 
- Se hai configurato `main` come Production Branch, i deploy di quel branch useranno le variabili **Production**
- Questo è corretto perché `bauscape-staging` è un progetto separato che non tocca il sito di produzione (`flixdog.com`)
- Il dominio `staging.flixdog.com` è collegato a questo progetto, quindi i deploy Production vanno lì
- La repository `athezani/bauScape-staging` è separata da quella di produzione, quindi usare `main` non crea conflitti

### Step 3: Deploy

5. Dopo aver configurato tutto, fai push su `main` della repository `bauScape-staging`
6. Vercel farà un deploy **Production** (non Preview) perché `main` è il production branch del progetto staging

## ⚠️ CRITICO - LEGGI ATTENTAMENTE

### Perché Production e non Preview?

- `bauscape-staging` è un **progetto Vercel separato** da quello di produzione
- Punta a una **repository GitHub separata** (`athezani/bauScape-staging`)
- Ha il suo dominio (`staging.flixdog.com`) e non tocca `flixdog.com`
- Il branch `main` è il **production branch** di questo progetto staging
- Quindi i deploy vanno su **Production** environment del progetto staging
- Questo è diverso da usare Preview Deployments nel progetto di produzione
- **Non c'è conflitto** perché repository e progetto Vercel sono completamente separati

### Per le variabili `NEXT_PUBLIC_*`:
- **Configura per Production** (obbligatorio)
- Opzionalmente anche Preview/Development se vuoi testare altri branch
- Queste variabili sono necessarie al **BUILD TIME**, quindi devono essere disponibili quando Vercel fa il build

### Per le variabili server-side (senza `NEXT_PUBLIC_*`):
- Configura per **Production** (obbligatorio)
- Queste sono disponibili solo al runtime

### Verifica dopo la configurazione:
1. Controlla che le variabili siano visibili in tutti e tre gli ambienti
2. Fai un nuovo deploy
3. Verifica i log di build - non dovrebbero più esserci errori "Supabase is not configured"

## Verifica

Dopo il deploy, verifica che:
- ✅ Il deploy è completato con successo
- ✅ Le pagine caricano correttamente
- ✅ I prodotti vengono caricati da Supabase
- ✅ Non ci sono errori nella console del browser


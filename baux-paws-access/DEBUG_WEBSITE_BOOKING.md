# Debug: Booking Non Creato dal Website

## Problema
I test da terminale funzionano, ma quando si completa un pagamento dal website, il booking non viene creato.

## Diagnostica

### Step 1: Verifica Frontend Deployato
Il frontend su Vercel potrebbe non avere le modifiche più recenti.

**Verifica:**
1. Vai su https://bauscape.vercel.app/thank-you?session_id=cs_test_b1hrXhNUgqbzo3oArqNxQRLiYLaoFLGb7Z7XtLKjxc37UJitnBaAKoMgEE
2. Apri la console del browser (F12 → Console)
3. Cerca questi log:
   - `[ThankYouPage] Step 1: Ensuring booking exists for session:`
   - `[ThankYouPage] Calling ensure-booking:`
   - `[ThankYouPage] ensure-booking response status:`

**Se non vedi questi log:**
- Il frontend non è stato deployato con le modifiche
- Deploy manuale necessario

### Step 2: Test Manuale con Session ID Reale
```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=your_key ./test-real-session.sh
```

Questo testa se `ensure-booking` funziona con il session_id reale dal website.

### Step 3: Verifica Log Supabase
1. Supabase Dashboard → Edge Functions → `ensure-booking` → Logs
2. Cerca il session_id: `cs_test_b1hrXhNUgqbzo3oArqNxQRLiYLaoFLGb7Z7XtLKjxc37UJitnBaAKoMgEE`
3. Verifica se la funzione è stata chiamata

**Se non vedi log:**
- La funzione non è stata chiamata dal frontend
- Possibile problema di CORS o autenticazione

### Step 4: Verifica Console Browser
Apri la console del browser sulla thank you page e cerca:
- Errori di rete (Network tab)
- Errori JavaScript (Console tab)
- Chiamate a `ensure-booking`

## Possibili Cause

### 1. Frontend Non Deployato
**Sintomo**: Console browser non mostra log `[ThankYouPage]`
**Soluzione**: Deploy frontend su Vercel

### 2. Errore CORS
**Sintomo**: Errore in console "CORS policy" o "preflight"
**Soluzione**: Verifica che `ensure-booking` abbia CORS headers corretti

### 3. Errore Autenticazione
**Sintomo**: Errore 401 in console
**Soluzione**: Verifica che `anonKey` sia corretta

### 4. Errore Silenzioso
**Sintomo**: Nessun errore visibile, ma booking non creato
**Soluzione**: Controlla log Supabase per errori

## Test Immediato

### Test 1: Verifica Funzione
```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=your_key ./test-real-session.sh
```

### Test 2: Verifica Frontend
1. Apri https://bauscape.vercel.app/thank-you?session_id=cs_test_b1hrXhNUgqbzo3oArqNxQRLiYLaoFLGb7Z7XtLKjxc37UJitnBaAKoMgEE
2. Apri console browser (F12)
3. Cerca log `[ThankYouPage]`
4. Controlla Network tab per chiamata a `ensure-booking`

### Test 3: Deploy Frontend
Se i log non appaiono, deploy frontend:
```bash
cd ecommerce-homepage
npm run build
# Poi deploy su Vercel
```

## Prossimi Passi

1. ✅ Esegui test manuale con session_id reale
2. ✅ Controlla console browser sulla thank you page
3. ✅ Verifica log Supabase
4. ✅ Se necessario, deploy frontend su Vercel
5. ✅ Testa di nuovo con pagamento reale





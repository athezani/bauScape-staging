# Verifica Webhook e Booking

## Problema
Il booking non viene trovato nel database con il session ID fornito.

## Possibili Cause

### 1. Webhook non chiamato
Il webhook Stripe potrebbe non essere stato chiamato o potrebbe essere fallito.

**Verifica:**
- Vai su Stripe Dashboard → Developers → Webhooks
- Controlla gli eventi per il session ID
- Verifica se `checkout.session.completed` è stato inviato

### 2. Booking non creato
Il webhook potrebbe essere stato chiamato ma la creazione del booking è fallita.

**Verifica:**
- Vai su Supabase Dashboard → Edge Functions → stripe-webhook → Logs
- Cerca il session ID nei log
- Controlla errori di creazione booking

### 3. Session ID diverso
Il session ID nella URL potrebbe essere diverso da quello salvato nel database.

**Verifica:**
- Esegui `./find-booking.sh` per cercare booking simili
- Controlla i booking recenti

## Azioni da Fare

### Step 1: Cercare booking simili
```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=your_key ./find-booking.sh
```

### Step 2: Verificare log webhook
1. Vai su Supabase Dashboard
2. Edge Functions → stripe-webhook → Logs
3. Cerca il session ID o timestamp recente
4. Verifica se ci sono errori

### Step 3: Verificare Stripe Webhook
1. Vai su Stripe Dashboard → Developers → Webhooks
2. Controlla gli eventi recenti
3. Verifica se `checkout.session.completed` è stato inviato
4. Controlla se ci sono errori di consegna

### Step 4: Test manuale del webhook
Se il webhook non è stato chiamato, possiamo testarlo manualmente usando Stripe CLI o creando un evento di test.

## Se il Booking Non Esiste

Se il booking non esiste, significa che:
- Il webhook non è stato chiamato (problema Stripe)
- Il webhook è fallito (problema Supabase)
- Il pagamento non è stato completato

In questo caso, dobbiamo:
1. Verificare la configurazione del webhook in Stripe
2. Verificare che l'endpoint sia corretto
3. Testare manualmente il webhook





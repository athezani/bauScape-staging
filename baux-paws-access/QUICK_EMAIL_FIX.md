# Quick Fix - Test Email per Ordine #BHWY3TJS

## ✅ Correzioni Applicate

1. **Corretto bug TypeScript**: Aggiunti i campi `DISPLAY` mancanti all'interfaccia `BrevoEmailParams`
2. **Deployato funzione aggiornata**: `send-transactional-email` è stata deployata con le correzioni

## 🔍 Prossimi Passi per Debug

### Step 1: Verifica Log Edge Functions

Vai su **Supabase Dashboard** → **Edge Functions** → **send-transactional-email** → **Logs**

Cerca:
- `=== SENDING TRANSACTIONAL EMAIL ===`
- `Template selection:` (dovrebbe mostrare templateId: 2 o 3)
- `Email sent successfully:` oppure errori Brevo API

### Step 2: Verifica Configurazione Brevo

#### A. Verifica API Key
```bash
npx supabase secrets list --project-ref zyonwzilijgnnnmhxvbo
```
Deve essere presente `BREVO_API_KEY`

#### B. Verifica Template IDs
- Template ID **2** deve esistere in Brevo (per prodotti normali)
- Template ID **3** deve esistere in Brevo (per prodotti "no_adults")

### Step 3: Test Manuale

Esegui questo comando per testare l'invio email per l'ordine #BHWY3TJS:

```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=your_key deno run --allow-net --allow-env test-email-order.ts BHWY3TJS
```

**Come ottenere la Service Role Key:**
1. Vai su Supabase Dashboard → Settings → API
2. Copia la chiave **service_role** (non "anon")

### Step 4: Verifica Log Brevo

Vai su **Brevo Dashboard** → **Transactional** → **Emails** → **Logs**

Cerca email inviate all'indirizzo del cliente per vedere se:
- L'email è stata inviata
- C'è un errore di consegna
- L'email è in spam

## 🐛 Problemi Comuni

### 1. "BREVO_API_KEY is not set"
**Soluzione**: Configura la chiave:
```bash
npx supabase secrets set BREVO_API_KEY=your_brevo_api_key --project-ref zyonwzilijgnnnmhxvbo
```

### 2. "Template not found" (Brevo API)
**Soluzione**: 
- Verifica che il template ID 2 (o 3) esista in Brevo
- Verifica che sia pubblicato e attivo

### 3. Email inviata ma non ricevuta
**Soluzione**: 
- Controlla la cartella spam
- Verifica i log Brevo per errori di consegna

## 📋 Checklist Completa

- [ ] BREVO_API_KEY configurato in Supabase Secrets
- [ ] Template ID 2 esiste e è pubblicato in Brevo
- [ ] Template ID 3 esiste e è pubblicato in Brevo (se prodotto "no_adults")
- [ ] Log Edge Functions mostrano tentativo di invio email
- [ ] Log Brevo mostrano email inviata con successo
- [ ] Email non è in spam

## 📞 Se il Problema Persiste

1. Esegui il test manuale con lo script `test-email-order.ts`
2. Controlla tutti i log (Edge Functions + Brevo)
3. Verifica che tutti i placeholder nel template Brevo siano corretti
4. Verifica che il template sia pubblicato e attivo





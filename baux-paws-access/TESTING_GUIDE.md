# 🧪 Guida Completa ai Test - Booking Creation

## ✅ Cosa è Stato Implementato

### 1. Funzione `ensure-booking` (Nuova)
- **Scopo**: Garantisce che booking venga sempre creato
- **Deploy**: ✅ Completato
- **Endpoint**: `https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/ensure-booking`

### 2. Thank You Page Aggiornata
- **Modifica**: Chiama `ensure-booking` prima di caricare dati
- **File**: `ecommerce-homepage/src/pages/ThankYouPage.tsx`
- **Status**: ✅ Modificato, da deployare su Vercel

### 3. Webhook Migliorato
- **Modifica**: Logging più dettagliato
- **Deploy**: ✅ Completato

## 🧪 Test da Eseguire

### Test 1: Verifica Funzione Deployata ✅
```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=your_key ./test-booking-creation.sh
```
**Risultato Atteso**: ✅ ensure-booking function exists

### Test 2: Test Completo del Flusso (DA FARE)

#### Step 1: Completa un Pagamento
1. Vai su https://bauscape.vercel.app
2. Seleziona un prodotto
3. Completa il pagamento con carta di test: `4242 4242 4242 4242`
4. Nota il `session_id` dalla URL della thank you page

#### Step 2: Verifica Booking Creato
```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=your_key ./find-booking.sh
```
**Risultato Atteso**: Booking trovato con il session_id del pagamento

#### Step 3: Verifica Email Inviata
```bash
SUPABASE_SERVICE_ROLE_KEY=your_key ./test-email-with-booking.sh a.thezani@gmail.com
```
**Risultato Atteso**: ✅ EMAIL SENT SUCCESSFULLY

#### Step 4: Controlla Log
1. Supabase Dashboard → Edge Functions → `ensure-booking` → Logs
2. Cerca: "BOOKING CREATED SUCCESSFULLY" o "Booking already exists"
3. Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
4. Cerca: "STRIPE WEBHOOK RECEIVED" e "BOOKING CREATED SUCCESSFULLY"

### Test 3: Test Fallback (Webhook Disabilitato)

#### Step 1: Simula Webhook Non Funzionante
- Non serve disabilitare webhook, `ensure-booking` funziona comunque
- Se webhook non viene chiamato, `ensure-booking` crea il booking

#### Step 2: Completa Pagamento
- Completa un pagamento normalmente
- `ensure-booking` creerà il booking se webhook non l'ha fatto

#### Step 3: Verifica
- Booking deve essere creato
- Email deve essere inviata

## 📊 Checklist Test

- [ ] Test 1: Funzione deployata ✅ (già verificato)
- [ ] Test 2: Pagamento completo → Booking creato
- [ ] Test 2: Pagamento completo → Email inviata
- [ ] Test 2: Thank you page mostra dati corretti
- [ ] Test 3: Log webhook mostrano creazione booking
- [ ] Test 3: Log ensure-booking mostrano creazione o esistenza booking
- [ ] Test 3: Log email mostrano invio riuscito

## 🚀 Deploy Frontend

Il frontend è stato modificato ma non ancora deployato su Vercel:

```bash
cd ecommerce-homepage
# Verifica che build funzioni
npm run build

# Deploy su Vercel (se configurato)
# Oppure push su GitHub e Vercel deployerà automaticamente
```

## 🔍 Monitoraggio Post-Deploy

Dopo il deploy, monitora:

1. **Log ensure-booking**:
   - Quante volte viene chiamata
   - Se crea booking o trova booking esistente
   - Eventuali errori

2. **Log webhook**:
   - Se viene chiamato correttamente
   - Se crea booking con successo
   - Eventuali errori

3. **Database**:
   - Verifica che booking vengano creati per ogni pagamento
   - Controlla che non ci siano duplicati

## ⚠️ Cosa Controllare

### Se Booking Non Viene Creato
1. ✅ Verifica che `ensure-booking` sia deployata
2. ✅ Controlla log di `ensure-booking` per errori
3. ✅ Verifica che Stripe session abbia tutti i metadata
4. ✅ Controlla che prodotto esista nel database

### Se Email Non Viene Inviata
1. ✅ Verifica che `BREVO_API_KEY` sia configurato
2. ✅ Verifica che template ID 2 esista in Brevo
3. ✅ Controlla log di `send-transactional-email`
4. ✅ Testa manualmente con script di test

## 📝 Note Finali

- **Doppia Protezione**: Webhook + ensure-booking garantiscono che booking venga sempre creato
- **Idempotenza**: Entrambe le funzioni possono essere chiamate multiple volte senza problemi
- **Performance**: Webhook è più veloce, ensure-booking è fallback sicuro
- **Email**: Viene inviata solo una volta (gestito da entrambe le funzioni)





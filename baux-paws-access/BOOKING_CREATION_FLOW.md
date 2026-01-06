# Booking Creation Flow - Documentazione Completa

## 🔄 Flusso Completo

### Scenario Ideale (Webhook Funziona)
1. ✅ Utente completa pagamento su Stripe
2. ✅ Stripe chiama webhook `stripe-webhook`
3. ✅ Webhook crea booking nel database
4. ✅ Webhook invia email di conferma
5. ✅ Utente arriva alla thank you page
6. ✅ Thank you page verifica che booking esista (già creato)

### Scenario Fallback (Webhook Non Funziona)
1. ✅ Utente completa pagamento su Stripe
2. ❌ Webhook non viene chiamato o fallisce
3. ✅ Utente arriva alla thank you page
4. ✅ Thank you page chiama `ensure-booking`
5. ✅ `ensure-booking` verifica se booking esiste
6. ✅ Se non esiste, lo crea da Stripe session
7. ✅ `ensure-booking` invia email di conferma
8. ✅ Thank you page mostra i dettagli

## 🛡️ Doppia Protezione

Il sistema ora ha **doppia protezione**:

1. **Webhook Stripe** (primario)
   - Viene chiamato automaticamente da Stripe
   - Crea booking immediatamente dopo pagamento
   - Più veloce e efficiente

2. **ensure-booking** (fallback)
   - Chiamato dalla thank you page
   - Garantisce che booking esista sempre
   - Gestisce race conditions

## 📋 Funzioni Coinvolte

### 1. `stripe-webhook`
- **Quando**: Chiamato da Stripe dopo pagamento
- **Cosa fa**: Crea booking + invia email
- **Endpoint**: `https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/stripe-webhook`

### 2. `ensure-booking`
- **Quando**: Chiamato dalla thank you page
- **Cosa fa**: Verifica booking esistente, crea se mancante, invia email
- **Endpoint**: `https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/ensure-booking`

### 3. `get-checkout-session`
- **Quando**: Chiamato dalla thank you page
- **Cosa fa**: Recupera dettagli sessione Stripe per visualizzazione
- **Endpoint**: `https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/get-checkout-session`

### 4. `send-transactional-email`
- **Quando**: Chiamato da webhook o ensure-booking
- **Cosa fa**: Invia email di conferma via Brevo
- **Endpoint**: `https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/send-transactional-email`

## ✅ Test

### Test 1: Verifica Funzione Deployata
```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=your_key ./test-booking-creation.sh
```

### Test 2: Test Completo del Flusso
1. Completa un pagamento di test sul sito
2. Verifica che booking sia creato immediatamente
3. Verifica che email sia inviata
4. Controlla i log di entrambe le funzioni

### Test 3: Test Fallback
1. Disabilita temporaneamente il webhook in Stripe
2. Completa un pagamento
3. Verifica che `ensure-booking` crei il booking
4. Verifica che email sia inviata

## 🔍 Verifica

### Controlla Booking Creato
```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=your_key ./find-booking.sh
```

### Controlla Log Webhook
- Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
- Cerca: "BOOKING CREATED SUCCESSFULLY"

### Controlla Log ensure-booking
- Supabase Dashboard → Edge Functions → `ensure-booking` → Logs
- Cerca: "BOOKING CREATED SUCCESSFULLY" o "Booking already exists"

### Controlla Log Email
- Supabase Dashboard → Edge Functions → `send-transactional-email` → Logs
- Cerca: "EMAIL SENT SUCCESSFULLY"

## 🐛 Troubleshooting

### Booking Non Creato
1. ✅ Verifica che `ensure-booking` sia deployata
2. ✅ Controlla log di `ensure-booking` per errori
3. ✅ Verifica che Stripe session abbia tutti i metadata necessari
4. ✅ Controlla che prodotto esista nel database

### Email Non Inviata
1. ✅ Verifica che `BREVO_API_KEY` sia configurato
2. ✅ Verifica che template ID 2 esista in Brevo
3. ✅ Controlla log di `send-transactional-email`
4. ✅ Verifica che email cliente sia valida

### Webhook Non Chiamato
1. ✅ Verifica configurazione webhook in Stripe Dashboard
2. ✅ Verifica URL endpoint: `https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/stripe-webhook`
3. ✅ Verifica che evento `checkout.session.completed` sia selezionato
4. ✅ Controlla log Stripe per errori di consegna

## 📝 Note Importanti

- **Race Conditions**: `ensure-booking` gestisce race conditions (se webhook e ensure-booking creano booking simultaneamente)
- **Idempotenza**: Entrambe le funzioni sono idempotenti (possono essere chiamate multiple volte senza problemi)
- **Email**: Email viene inviata solo una volta (gestito da entrambe le funzioni)
- **Performance**: Webhook è più veloce, ensure-booking è fallback sicuro

## ✅ Checklist Deployment

- [x] Funzione `ensure-booking` creata e deployata
- [x] Thank you page aggiornata per chiamare `ensure-booking`
- [x] Config.toml aggiornato con `verify_jwt = false` per `ensure-booking`
- [x] Test script creato
- [ ] Test completo del flusso eseguito
- [ ] Verifica che booking venga sempre creato
- [ ] Verifica che email venga sempre inviata





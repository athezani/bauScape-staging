# Test Email - Step by Step

## Step 1: Verifica che i booking esistano ✅
```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=your_key ./find-booking.sh
```

## Step 2: Testa l'invio email con un booking

### Opzione A: Usa il booking più recente (automatico)
```bash
SUPABASE_SERVICE_ROLE_KEY=your_key ./test-email-with-booking.sh
```

### Opzione B: Specifica un booking ID
```bash
SUPABASE_SERVICE_ROLE_KEY=your_key ./test-email-with-booking.sh <booking_id>
```

## Step 3: Verifica il risultato

Lo script ti dirà:
- ✅ Se l'email è stata inviata con successo
- ❌ Se c'è stato un errore (con dettagli)

## Step 4: Controlla la tua email

- Controlla la casella di posta del cliente
- Controlla anche la cartella spam
- L'email dovrebbe arrivare entro pochi minuti

## Troubleshooting

### Se l'email non viene inviata:
1. Controlla i log di `send-transactional-email` in Supabase Dashboard
2. Verifica che `BREVO_API_KEY` sia configurato
3. Verifica che il template ID 2 esista in Brevo
4. Controlla i log di Brevo Dashboard

### Se l'email viene inviata ma non arriva:
1. Controlla la cartella spam
2. Verifica l'indirizzo email del cliente
3. Controlla i log di Brevo per errori di consegna





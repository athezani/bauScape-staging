# Fix Booking #AFHTWQCB

## Problema
Per l'ordine #AFHTWQCB:
- ❌ Non è stata inviata nessuna mail di conferma
- ❌ Non è stato creato l'ordine su Odoo

## Diagnostica

### 1. Verificare se il booking esiste in Supabase

Esegui lo script di diagnostica:
```bash
cd baux-paws-access
export SUPABASE_SERVICE_ROLE_KEY='your_key'
deno run --allow-net --allow-env find-and-fix-booking-afhtwqcb.ts
```

Se il booking non viene trovato, potrebbe essere che:
- Il booking non è stato creato dal webhook Stripe
- L'order number è diverso (verifica in Stripe Dashboard)
- Il booking è più vecchio dei booking recenti

### 2. Verificare i log Supabase

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/logs/edge-functions)
2. Controlla i log delle funzioni:
   - `stripe-webhook` - dovrebbe creare il booking
   - `create-booking` - dovrebbe creare il booking e inviare email
   - `send-transactional-email` - dovrebbe inviare l'email

Cerca errori per:
- Session ID che termina con `AFHTWQCB`
- Payment Intent ID associato
- Timestamp del pagamento

### 3. Verificare i log Vercel

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto `bauscape`
3. Vai su "Functions" → "Logs"
4. Cerca errori per:
   - `stripe-webhook-odoo` - dovrebbe creare l'ordine Odoo
   - Payment Intent ID associato

### 4. Verificare in Stripe

1. Vai su [Stripe Dashboard](https://dashboard.stripe.com)
2. Cerca sessioni che terminano con `AFHTWQCB`
3. Verifica:
   - Se la sessione esiste
   - Se il pagamento è stato completato
   - Se i webhook sono stati chiamati (tab "Events")
   - Se ci sono errori nei webhook

## Soluzione

### Opzione 1: Booking esiste ma email non inviata

Se il booking esiste ma l'email non è stata inviata:

```bash
cd baux-paws-access
export SUPABASE_SERVICE_ROLE_KEY='your_key'
deno run --allow-net --allow-env fix-booking-afhtwqcb.ts
```

Lo script invierà automaticamente l'email se mancante.

### Opzione 2: Booking non esiste

Se il booking non esiste, devi crearlo manualmente:

1. **Trova la sessione Stripe:**
   - Vai su Stripe Dashboard
   - Cerca sessioni che terminano con `AFHTWQCB`
   - Copia il Session ID completo (es. `cs_xxxxx...AFHTWQCB`)

2. **Crea il booking:**
   ```bash
   curl -X POST https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/ensure-booking \
     -H "Authorization: Bearer YOUR_SERVICE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"sessionId": "cs_xxxxx...AFHTWQCB", "paymentGateway": "stripe"}'
   ```

3. **Verifica che l'email sia stata inviata:**
   - Controlla il campo `confirmation_email_sent` nel booking
   - Se `false`, esegui lo script di fix

### Opzione 3: Ordine Odoo non creato

Se il booking esiste ma l'ordine Odoo non è stato creato:

1. **Verifica che il webhook Vercel sia configurato in Stripe:**
   - Vai su Stripe Dashboard → Webhooks
   - Verifica che esista un webhook per `payment_intent.succeeded`
   - Endpoint: `https://bauscape.vercel.app/api/stripe-webhook-odoo`

2. **Chiama manualmente il webhook (se necessario):**
   - Recupera il Payment Intent ID dal booking
   - Crea un evento di test in Stripe o chiama manualmente il webhook

3. **Verifica in Odoo:**
   - Cerca ordini con `client_order_ref` = Payment Intent ID
   - Se non esiste, il webhook non è stato chiamato o ha fallito

## Test su Altri Booking

Per verificare che le funzionalità funzionino su altri booking:

```bash
cd baux-paws-access
export SUPABASE_SERVICE_ROLE_KEY='your_key'
deno run --allow-net --allow-env test-booking-functionality.ts
```

Questo script:
- Analizza gli ultimi 20 booking
- Identifica booking con problemi
- Fixa automaticamente le email mancanti

## Prevenzione Futura

Per prevenire questi problemi in futuro:

1. **Monitoraggio:**
   - Configura alert in Supabase per errori nelle Edge Functions
   - Configura alert in Vercel per errori nelle Functions
   - Monitora i log Stripe per webhook falliti

2. **Retry Logic:**
   - Il sistema ha già retry logic per le email (`ensure-booking`)
   - Considera di aggiungere retry per la creazione ordini Odoo

3. **Verifica Periodica:**
   - Esegui periodicamente `test-booking-functionality.ts`
   - Identifica e fixa booking con problemi

## File Creati

- `fix-booking-afhtwqcb.ts` - Script per fixare un booking specifico
- `find-and-fix-booking-afhtwqcb.ts` - Script completo per trovare e fixare
- `test-booking-functionality.ts` - Script di test per verificare altri booking
- `FIX_BOOKING_AFHTWQCB.md` - Questo documento

## Note

- Il booking #AFHTWQCB potrebbe non esistere se il webhook Stripe non è stato chiamato
- Verifica sempre i log prima di procedere con fix manuali
- Se il booking non esiste, potrebbe essere necessario crearlo manualmente da Stripe


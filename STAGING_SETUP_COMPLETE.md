# 🎉 Setup Staging - COMPLETATO

## ✅ Completato

### 1. Database Supabase Staging
- ✅ Progetto: **ilbbviadwedumvvwqqon**
- ✅ Database pulito e ricreato
- ✅ Migration completa applicata:
  - 16 tabelle create
  - ENUMs (product_type, pricing_model, app_role)
  - Funzioni (set_updated_at, has_role, is_cancellation_token_valid)
  - Triggers per updated_at
  - Indexes ottimizzati
  - Foreign keys configurate

### 2. Supabase Edge Functions
- ✅ 7 functions deployate:
  - create-checkout-session
  - stripe-webhook
  - create-booking
  - send-transactional-email
  - create-cancellation-request
  - admin-process-cancellation
  - check-pending-cancellations

### 3. Secrets Supabase Configurati
- ✅ **Stripe:**
  - STRIPE_SECRET_KEY (sk_test_...)
  - STRIPE_WEBHOOK_SECRET (whsec_...)
- ✅ **Brevo:**
  - BREVO_API_KEY
  - BREVO_TEMPLATE_ID (2)
  - BREVO_TEMPLATE_ID_NO_ADULTS (3)
  - BREVO_TEMPLATE_CANCELLATION_REQUEST_ADMIN (10)
  - BREVO_TEMPLATE_CANCELLATION_APPROVED (11)
  - BREVO_TEMPLATE_CANCELLATION_REJECTED (12)
  - BREVO_TEMPLATE_CANCELLATION_PROVIDER (13)
  - BREVO_TEMPLATE_CANCELLATION_REMINDER (14)
- ✅ **Sistema:**
  - CANCELLATION_TOKEN_SECRET
  - WEBSITE_URL
  - ENVIRONMENT (staging)

### 4. Documentazione Vercel
- ✅ Guida completa creata: `VERCEL_STAGING_SETUP.md`
- ✅ Script di configurazione: `configure-vercel-staging.ts`
- ✅ Credenziali salvate: `.staging-credentials.json`

## ⏳ Da Completare

### 1. Vercel Configuration

**Opzione A: Via Dashboard (Raccomandato)**
1. Vai su: https://vercel.com/dashboard
2. Seleziona progetto `ecommerce-homepage` (o crea nuovo progetto staging)
3. Settings → Environment Variables
4. Aggiungi le variabili elencate in `VERCEL_STAGING_SETUP.md`

**Opzione B: Via CLI**
```bash
cd ecommerce-homepage
npx vercel login
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development
# (incolla: https://ilbbviadwedumvvwqqon.supabase.co)
# ...ripeti per ogni variabile...
```

**Variabili da configurare:**
- `NEXT_PUBLIC_SUPABASE_URL` = `https://ilbbviadwedumvvwqqon.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (staging anon key)
- `NEXT_PUBLIC_STRIPE_CHECKOUT_URL` = `https://buy.stripe.com/test_5kQeV61dQh2EeiMetc7Re00`
- `SUPABASE_URL` = `https://ilbbviadwedumvvwqqon.supabase.co` (server-side)
- `SUPABASE_SERVICE_ROLE_KEY` = (staging service role key) (server-side)
- `STRIPE_SECRET_KEY` = (produzione per ora) (server-side)
- `STRIPE_WEBHOOK_SECRET` = (produzione per ora) (server-side)

### 2. Stripe Webhook (Da Verificare)

**Verifica su Stripe Dashboard (Test Mode):**
https://dashboard.stripe.com/test/webhooks

**URL Webhook deve essere:**
```
https://ilbbviadwedumvvwqqon.supabase.co/functions/v1/stripe-webhook
```

**Events da abilitare:**
- `checkout.session.completed`
- `payment_intent.succeeded`

⚠️ **Nota**: Stripe attualmente punta a produzione. Verrà aggiornato quando Stripe produzione sarà attivo.

### 3. Deploy Vercel

Dopo aver configurato le variabili:
1. Vai su Vercel Dashboard → Deployments
2. Clicca "Redeploy" o push su branch `staging`
3. Verifica che il deploy sia completato

### 4. Test End-to-End

Dopo il deploy, testa:
- ✅ Homepage carica prodotti da staging
- ✅ Pagine prodotto funzionano
- ✅ Checkout Stripe funziona (test mode)
- ✅ Email di conferma vengono inviate
- ✅ Webhook Stripe funziona

## 📋 File Utili

- `VERCEL_STAGING_SETUP.md` - Guida completa configurazione Vercel
- `configure-vercel-staging.ts` - Script helper per configurazione
- `.staging-credentials.json` - Tutte le credenziali salvate
- `staging-setup-complete.md` - Questo file

## 🔗 Link Utili

- **Supabase Dashboard:** https://supabase.com/dashboard/project/ilbbviadwedumvvwqqon
- **Stripe Dashboard (Test):** https://dashboard.stripe.com/test
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Brevo Dashboard:** https://app.brevo.com

## ⚠️ Note Importanti

1. **Stripe**: Attualmente usa credenziali di produzione. Verrà aggiornato quando Stripe produzione sarà attivo.
2. **Supabase**: Completamente separato da produzione (ilbbviadwedumvvwqqon)
3. **Branch**: Assicurati che il branch `staging` esista e sia aggiornato
4. **Secrets**: Le variabili server-side sono segrete, non esporle mai pubblicamente

## ✅ Prossimi Passi

1. ✅ Configurare variabili Vercel (vedi sopra)
2. ✅ Deployare applicazione su Vercel
3. ✅ Verificare webhook Stripe
4. ✅ Test completo end-to-end
5. ✅ Quando Stripe produzione sarà attivo, aggiornare credenziali Stripe

---

**Setup completato il:** 2026-01-05
**Progetto Supabase Staging:** ilbbviadwedumvvwqqon

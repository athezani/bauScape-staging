# 🎉 Setup Staging - Completato

## ✅ Completato

### 1. Database Staging
- ✅ Progetto Supabase: **ilbbviadwedumvvwqqon**
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

### 3. Secrets Configurati
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

## ⚠️ Da Verificare/Completare

### 1. Stripe Webhook
**Verifica su Stripe Dashboard (Test Mode):**
https://dashboard.stripe.com/test/webhooks

**URL Webhook deve essere:**
```
https://ilbbviadwedumvvwqqon.supabase.co/functions/v1/stripe-webhook
```

**Events da abilitare:**
- `checkout.session.completed`
- `payment_intent.succeeded`

**Se non esiste, crealo:**
1. Vai su Stripe Dashboard → Developers → Webhooks
2. Clicca "Add endpoint"
3. URL: `https://ilbbviadwedumvvwqqon.supabase.co/functions/v1/stripe-webhook`
4. Seleziona events sopra
5. Copia il webhook secret e verifica che corrisponda a quello configurato

### 2. Vercel (Prossimo Step)
- [ ] Creare progetti staging per:
  - ecommerce-homepage
  - baux-paws-access (se applicabile)
- [ ] Configurare variabili d'ambiente
- [ ] Deployare applicazioni

### 3. Odoo (Opzionale)
- [ ] Configurare secrets Odoo se necessario:
  - OD_URL
  - OD_DB_NAME
  - OD_LOGIN
  - OD_API_KEY

## 📋 Credenziali Salvate

Tutte le credenziali sono salvate in `.staging-credentials.json`

## 🔗 Link Utili

- **Supabase Dashboard:** https://supabase.com/dashboard/project/ilbbviadwedumvvwqqon
- **Stripe Dashboard (Test):** https://dashboard.stripe.com/test
- **Brevo Dashboard:** https://app.brevo.com

## ✅ Prossimi Passi

1. Verificare webhook Stripe
2. Configurare Vercel
3. Test completo end-to-end

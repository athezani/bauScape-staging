# 🚀 Setup Staging - Progresso

## ✅ Completato

1. **Database Staging**
   - ✅ Progetto ricreato: ilbbviadwedumvvwqqon
   - ✅ Database pulito
   - ✅ Migration completa applicata (16 tabelle)
   - ✅ ENUMs creati (product_type, pricing_model, app_role)
   - ✅ Funzioni create
   - ✅ Triggers creati
   - ✅ Indexes creati

2. **Supabase CLI**
   - ✅ Progetto linkato
   - ✅ Secrets base configurati:
     - CANCELLATION_TOKEN_SECRET
     - WEBSITE_URL
     - ENVIRONMENT

3. **Edge Functions**
   - ✅ 7 functions deployate:
     - create-checkout-session
     - stripe-webhook
     - create-booking
     - send-transactional-email
     - create-cancellation-request
     - admin-process-cancellation
     - check-pending-cancellations

## ⏳ Da Completare

### 1. Secrets Stripe (Test Mode)
- [ ] STRIPE_SECRET_KEY (sk_test_...)
- [ ] STRIPE_WEBHOOK_SECRET (dopo aver creato webhook)

### 2. Secrets Brevo
- [ ] BREVO_API_KEY
- [ ] BREVO_TEMPLATE_ID
- [ ] BREVO_TEMPLATE_ID_NO_ADULTS
- [ ] BREVO_TEMPLATE_CANCELLATION_REQUEST_ADMIN
- [ ] BREVO_TEMPLATE_CANCELLATION_APPROVED
- [ ] BREVO_TEMPLATE_CANCELLATION_REJECTED
- [ ] BREVO_TEMPLATE_CANCELLATION_PROVIDER
- [ ] BREVO_TEMPLATE_CANCELLATION_REMINDER

### 3. Secrets Odoo (Opzionale)
- [ ] OD_URL
- [ ] OD_DB_NAME
- [ ] OD_LOGIN
- [ ] OD_API_KEY

### 4. Vercel
- [ ] Creare progetti staging
- [ ] Configurare variabili d'ambiente

### 5. Stripe Webhook
- [ ] Creare webhook in Stripe Test Mode
- [ ] Configurare STRIPE_WEBHOOK_SECRET

## 📋 Prossimi Passi

1. Fornire credenziali Stripe Test Mode
2. Fornire credenziali Brevo (o copiare da produzione)
3. Configurare Vercel
4. Creare webhook Stripe
5. Test completo

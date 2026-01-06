# Secrets Necessari per Staging

## Secrets Richiesti per Edge Functions

### Stripe (Test Mode)
- STRIPE_SECRET_KEY (sk_test_...)
- STRIPE_WEBHOOK_SECRET (whsec_...) - dopo aver creato webhook

### Brevo (Email)
- BREVO_API_KEY
- BREVO_TEMPLATE_ID (template conferma booking)
- BREVO_TEMPLATE_ID_NO_ADULTS (template senza adulti)
- BREVO_TEMPLATE_CANCELLATION_REQUEST_ADMIN
- BREVO_TEMPLATE_CANCELLATION_APPROVED
- BREVO_TEMPLATE_CANCELLATION_REJECTED
- BREVO_TEMPLATE_CANCELLATION_PROVIDER
- BREVO_TEMPLATE_CANCELLATION_REMINDER

### Cancellation System
- CANCELLATION_TOKEN_SECRET (genera una stringa random 64 caratteri)
- WEBSITE_URL (https://staging.flixdog.com o URL staging)

### Odoo (Opzionale per ora)
- OD_URL
- OD_DB_NAME
- OD_LOGIN
- OD_API_KEY

### Altri (Opzionali)
- ALLOWED_ORIGINS (default: flixdog.com)
- ENVIRONMENT (staging)

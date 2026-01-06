# Deploy create-checkout-session su Supabase

## Comandi per Deploy

### Opzione 1: Deploy solo create-checkout-session (consigliato)

```bash
cd /Users/adezzani/bauScape/baux-paws-access

# Assicurati di essere loggato in Supabase CLI
supabase login

# Link al progetto (se non già fatto)
supabase link --project-ref zyonwzilijgnnnmhxvbo

# Deploy solo la funzione create-checkout-session
supabase functions deploy create-checkout-session
```

### Opzione 2: Deploy tutte le funzioni

```bash
cd /Users/adezzani/bauScape/baux-paws-access

# Deploy tutte le funzioni
supabase functions deploy
```

## Verifica del Deploy

Dopo il deploy, verifica che la funzione sia aggiornata:

```bash
# Controlla lo status delle funzioni
supabase functions list

# Testa la funzione (opzionale)
supabase functions serve create-checkout-session
```

## Variabili d'Ambiente Richieste

Assicurati che queste variabili siano configurate in Supabase Dashboard:

1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/settings/functions
2. Verifica che siano presenti:
   - `STRIPE_SECRET_KEY` (sk_test_... o sk_live_...)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Test Post-Deploy

Dopo il deploy, testa creando una nuova sessione di checkout e verifica nei log:

1. Crea una nuova sessione tramite il checkout interno
2. Controlla i log in Supabase Dashboard → Functions → create-checkout-session → Logs
3. Verifica che nei log appaia:
   - `customFieldsCount: 0`
   - `billingAddressCollection: 'never'`
   - `shippingAddressCollection: 'never'`
   - `customerUpdateDisabled: true`

## Note Importanti

- ⚠️ Le sessioni create PRIMA del deploy continueranno a chiedere i dati (sono state create con il vecchio codice)
- ✅ Le NUOVE sessioni create DOPO il deploy non chiederanno più dati
- 🔄 Se Stripe chiede ancora dati, verifica che il deploy sia completato e crea una nuova sessione




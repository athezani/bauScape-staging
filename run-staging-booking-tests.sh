#!/bin/bash
# Script per eseguire test booking end-to-end in staging

set -e

echo "🧪 Test End-to-End: 10 Booking Reali in Staging"
echo "================================================"

# Carica variabili d'ambiente staging
if [ -f .env.staging ]; then
  echo "📋 Caricando variabili da .env.staging..."
  export $(cat .env.staging | grep -v '^#' | xargs)
elif [ -f .env.local ]; then
  echo "📋 Caricando variabili da .env.local..."
  export $(cat .env.local | grep -v '^#' | xargs)
else
  echo "⚠️  Nessun file .env trovato. Assicurati di avere le variabili d'ambiente configurate:"
  echo "   - SUPABASE_URL (staging: https://ilbbviadwedumvvwqqon.supabase.co)"
  echo "   - SUPABASE_SERVICE_ROLE_KEY"
  echo "   - STRIPE_SECRET_KEY (test mode)"
  echo "   - BASE_URL (staging: https://staging.flixdog.com)"
  echo ""
  read -p "Vuoi continuare comunque? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Verifica variabili richieste
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY non trovata"
  exit 1
fi

if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "❌ STRIPE_SECRET_KEY non trovata"
  exit 1
fi

# Imposta variabili staging se non già impostate
export SUPABASE_URL=${SUPABASE_URL:-"https://ilbbviadwedumvvwqqon.supabase.co"}
export BASE_URL=${BASE_URL:-"https://staging.flixdog.com"}

echo ""
echo "📍 Configurazione:"
echo "   Supabase: $SUPABASE_URL"
echo "   Base URL: $BASE_URL"
echo ""

# Esegui test
echo "🚀 Eseguendo test..."
deno run --allow-net --allow-env --allow-read test-10-bookings-staging.ts

echo ""
echo "✅ Test completati!"


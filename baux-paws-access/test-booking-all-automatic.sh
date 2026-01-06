#!/bin/bash

# Script Automatico per Test Booking - Tutte le Tipologie
# Crea booking di test e verifica idempotency_key finché non funziona tutto

set -e

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@15/bin:$PATH"

SUPABASE_URL="https://zyonwzilijgnnnmhxvbo.supabase.co"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    # Try to read from .env.local
    if [ -f .env.local ]; then
        export $(grep SUPABASE_SERVICE_ROLE_KEY .env.local | xargs)
        SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
    fi
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY non trovata"
    echo "   Esporta: export SUPABASE_SERVICE_ROLE_KEY='your-key'"
    exit 1
fi

echo "🚀 Test Automatico Booking - Tutte le Tipologie"
echo "================================================"
echo ""

# Test con Node.js (più affidabile)
echo "📦 Esecuzione test con Node.js..."
echo ""

export SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_KEY"
node test-booking-node.js

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Tutti i test sono passati!"
    exit 0
else
    echo ""
    echo "❌ Alcuni test sono falliti"
    echo "   Verifica i logs sopra per dettagli"
    exit 1
fi





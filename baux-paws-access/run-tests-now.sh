#!/bin/bash

# Script per eseguire test booking immediatamente (usa Node.js già disponibile)

set -e

echo "🧪 Esecuzione Test Booking Automatici"
echo "======================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trovato"
    exit 1
fi

echo "✅ Node.js trovato: $(node --version)"
echo ""

# Check for service key
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  SUPABASE_SERVICE_ROLE_KEY non impostata"
    echo ""
    echo "Opzioni:"
    echo "1. Esporta la variabile:"
    echo "   export SUPABASE_SERVICE_ROLE_KEY='your-key'"
    echo ""
    echo "2. Oppure crea un file .env.local con:"
    echo "   SUPABASE_SERVICE_ROLE_KEY=your-key"
    echo ""
    
    # Try to read from .env.local
    if [ -f .env.local ]; then
        echo "📖 Tentativo di leggere da .env.local..."
        export $(grep SUPABASE_SERVICE_ROLE_KEY .env.local | xargs)
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        echo "❌ Service key non trovata. Impostala e riprova."
        exit 1
    fi
fi

echo "✅ Service key trovata"
echo ""

# Run test
echo "🚀 Esecuzione test..."
echo ""

node test-booking-node.js





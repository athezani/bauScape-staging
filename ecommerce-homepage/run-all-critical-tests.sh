#!/bin/bash

# Script per eseguire tutti i test critici
# Carica automaticamente le variabili d'ambiente dai file .env se disponibili

set -e

cd "$(dirname "$0")"

echo "🚀 Esecuzione di tutti i test critici"
echo "=========================================="
echo ""

# Funzione per caricare variabili da file .env
load_env_file() {
    local env_file=$1
    if [ -f "$env_file" ]; then
        echo "📋 Caricamento variabili da $env_file"
        # Carica le variabili, rimuovendo commenti e linee vuote
        # Usa set -a per esportare automaticamente
        set -a
        source "$env_file" 2>/dev/null || true
        set +a
    fi
}

# Prova a caricare variabili da vari file .env
load_env_file ".env.test"
load_env_file ".env.local"
load_env_file ".env.vercel"

# Verifica che Deno sia installato
if ! command -v deno &> /dev/null; then
    echo "❌ ERRORE: Deno non è installato!"
    echo "   Installa Deno con: curl -fsSL https://deno.land/install.sh | sh"
    exit 1
fi

echo "✅ Deno installato: $(deno --version | head -1)"
echo ""

# Normalizza variabili (supporta diversi nomi)
if [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] && [ -z "$SUPABASE_ANON_KEY" ]; then
    export SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"
fi

if [ -n "$VITE_SUPABASE_ANON_KEY" ] && [ -z "$SUPABASE_ANON_KEY" ]; then
    export SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY"
fi

if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -z "$SUPABASE_URL" ]; then
    export SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
fi

if [ -n "$VITE_SUPABASE_URL" ] && [ -z "$SUPABASE_URL" ]; then
    export SUPABASE_URL="$VITE_SUPABASE_URL"
fi

# Verifica variabili richieste
MISSING_VARS=()

if [ -z "$SUPABASE_ANON_KEY" ]; then
    MISSING_VARS+=("SUPABASE_ANON_KEY (o VITE_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY)")
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    MISSING_VARS+=("SUPABASE_SERVICE_ROLE_KEY")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ ERRORE: Variabili d'ambiente mancanti:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Configura le variabili d'ambiente:"
    echo "   1. Crea un file .env.test con le tue credenziali"
    echo "   2. Oppure esporta le variabili:"
    echo "      export SUPABASE_ANON_KEY=\"your-key\""
    echo "      export SUPABASE_SERVICE_ROLE_KEY=\"your-key\""
    echo ""
    exit 1
fi

echo "✅ Variabili d'ambiente configurate"
echo ""

# Esegui i test
echo "=========================================="
echo "TEST 1: Trip Checkout"
echo "=========================================="
deno run --allow-net --allow-env --allow-read --allow-run ./load-env-for-tests.ts ./test-trip-checkout-always-works.ts || {
    echo ""
    echo "❌ Test trip checkout fallito!"
    exit 1
}

echo ""
echo "=========================================="
echo "TEST 2: Critical Checkout Flows"
echo "=========================================="
deno run --allow-net --allow-env --allow-read --allow-run ./load-env-for-tests.ts ./test-critical-checkout-flows.ts || {
    echo ""
    echo "❌ Test flussi checkout falliti!"
    exit 1
}

echo ""
echo "=========================================="
echo "TEST 3: Complete Product Coverage (All Types & Characteristics)"
echo "=========================================="
deno run --allow-net --allow-env --allow-read --allow-run ./load-env-for-tests.ts ./test-complete-product-coverage.ts || {
    echo ""
    echo "❌ Test copertura completa prodotti fallito!"
    exit 1
}

echo ""
echo "=========================================="
echo "✅ TUTTI I TEST CRITICI SONO PASSATI!"
echo "=========================================="


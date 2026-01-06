#!/bin/bash

# Script che verifica se il fix ENUM è applicato e poi esegue i test

set -e

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@15/bin:$PATH"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI}"

echo "🔍 Verifica Fix ENUM e Esecuzione Test"
echo "======================================"
echo ""

echo "⚠️  IMPORTANTE: Prima di eseguire i test, applica il fix ENUM!"
echo ""
echo "📋 Applica il fix:"
echo "   1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new"
echo "   2. Apri: fix-product-type-enum.sql"
echo "   3. Copia tutto e incolla nel SQL Editor"
echo "   4. Esegui"
echo ""
read -p "Hai applicato il fix? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Applica prima il fix e poi riprova"
    exit 1
fi

echo ""
echo "🚀 Esecuzione test..."
echo ""

cd "$(dirname "$0")"
node test-booking-node.js





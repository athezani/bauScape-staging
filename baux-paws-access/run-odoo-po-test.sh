#!/bin/bash

# Script per eseguire i test Odoo PO
# Chiama la Supabase Edge Function test-odoo-po

set -e

# Carica variabili d'ambiente
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Verifica variabili richieste
if [ -z "$SUPABASE_URL" ]; then
  echo "❌ SUPABASE_URL non configurato"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY o SUPABASE_ANON_KEY richiesti"
  exit 1
fi

SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_ANON_KEY}"

echo "🧪 ========================================"
echo "🧪 Test Odoo Purchase Order Integration"
echo "🧪 ========================================"
echo ""

# Parametri test
LIMIT=${1:-10}  # Default: 10 booking
DRY_RUN=${2:-true}  # Default: dry run

echo "📊 Parametri test:"
echo "   - Limit: $LIMIT booking"
echo "   - Dry Run: $DRY_RUN"
echo ""

# Chiama la funzione
echo "🚀 Esecuzione test..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/functions/v1/test-odoo-po" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -d "{
    \"limit\": $LIMIT,
    \"dryRun\": $DRY_RUN
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Risultati:"
echo "=========================================="
echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  
  # Estrai statistiche
  SUCCESS=$(echo "$BODY" | jq -r '.success' 2>/dev/null || echo "unknown")
  TOTAL_BOOKINGS=$(echo "$BODY" | jq -r '.summary.totalBookings' 2>/dev/null || echo "0")
  TOTAL_GROUPS=$(echo "$BODY" | jq -r '.summary.totalGroups' 2>/dev/null || echo "0")
  ACTUAL_POS=$(echo "$BODY" | jq -r '.summary.actualPOs' 2>/dev/null || echo "0")
  
  echo ""
  echo "=========================================="
  echo "📈 Statistiche:"
  echo "   - Success: $SUCCESS"
  echo "   - Booking processati: $TOTAL_BOOKINGS"
  echo "   - Gruppi trovati: $TOTAL_GROUPS"
  echo "   - PO creati/aggiornati: $ACTUAL_POS"
  
  if [ "$SUCCESS" = "true" ]; then
    echo ""
    echo "✅ Test completato con successo!"
  else
    echo ""
    echo "❌ Test fallito"
    exit 1
  fi
else
  echo "❌ Errore HTTP: $HTTP_CODE"
  echo "$BODY"
  exit 1
fi


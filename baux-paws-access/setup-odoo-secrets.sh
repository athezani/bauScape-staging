#!/bin/bash

# Script per configurare le variabili Odoo in Supabase Edge Functions
# Questo script chiede i valori e li configura tramite Supabase CLI

set -e

echo "🔧 Configurazione Variabili Odoo per Supabase Edge Functions"
echo "=============================================================="
echo ""

# Verifica che Supabase CLI sia linkato
if ! npx supabase link --project-ref zyonwzilijgnnnmhxvbo > /dev/null 2>&1; then
  echo "⚠️  Collegamento a Supabase..."
  npx supabase link --project-ref zyonwzilijgnnnmhxvbo
fi

echo "📝 Inserisci le credenziali Odoo:"
echo ""

# Chiedi OD_URL
read -p "OD_URL (es. https://your-odoo-instance.com): " OD_URL
if [ -z "$OD_URL" ]; then
  echo "❌ OD_URL è obbligatorio"
  exit 1
fi

# Chiedi OD_DB_NAME
read -p "OD_DB_NAME (nome database Odoo): " OD_DB_NAME
if [ -z "$OD_DB_NAME" ]; then
  echo "❌ OD_DB_NAME è obbligatorio"
  exit 1
fi

# Chiedi OD_LOGIN
read -p "OD_LOGIN (username Odoo): " OD_LOGIN
if [ -z "$OD_LOGIN" ]; then
  echo "⚠️  OD_LOGIN non fornito (opzionale ma raccomandato)"
  read -p "Vuoi continuare senza OD_LOGIN? (y/n): " CONTINUE
  if [ "$CONTINUE" != "y" ]; then
    exit 1
  fi
fi

# Chiedi OD_API_KEY
read -p "OD_API_KEY (API Key Odoo): " OD_API_KEY
if [ -z "$OD_API_KEY" ]; then
  echo "❌ OD_API_KEY è obbligatorio"
  exit 1
fi

echo ""
echo "📦 Configurazione variabili in Supabase..."
echo ""

# Configura OD_URL
echo "  → Configurando OD_URL..."
npx supabase secrets set OD_URL="$OD_URL"

# Configura OD_DB_NAME
echo "  → Configurando OD_DB_NAME..."
npx supabase secrets set OD_DB_NAME="$OD_DB_NAME"

# Configura OD_LOGIN (se fornito)
if [ -n "$OD_LOGIN" ]; then
  echo "  → Configurando OD_LOGIN..."
  npx supabase secrets set OD_LOGIN="$OD_LOGIN"
fi

# Configura OD_API_KEY
echo "  → Configurando OD_API_KEY..."
npx supabase secrets set OD_API_KEY="$OD_API_KEY"

echo ""
echo "✅ Configurazione completata!"
echo ""
echo "📋 Verifica variabili configurate:"
npx supabase secrets list | grep -E "OD_|^NAME"

echo ""
echo "🧪 Per testare la configurazione:"
echo "   deno run --allow-net --allow-env test-odoo-po-direct.ts"
echo ""


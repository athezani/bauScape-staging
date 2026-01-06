#!/bin/bash

# Comandi pronti per configurare le variabili Odoo
# Sostituisci i valori placeholder con le tue credenziali reali

cd /Users/adezzani/bauScape/baux-paws-access

# Verifica link a Supabase
npx supabase link --project-ref zyonwzilijgnnnmhxvbo

# ============================================
# SOSTITUISCI I VALORI QUI SOTTO CON LE TUE CREDENZIALI ODOO
# ============================================

# URL dell'istanza Odoo (es. https://your-company.odoo.com)
OD_URL="https://your-odoo-instance.com"

# Nome del database Odoo
OD_DB_NAME="your_database_name"

# Username Odoo (es. admin@example.com)
OD_LOGIN="your_username"

# API Key Odoo
OD_API_KEY="your_api_key"

# ============================================
# ESEGUI I COMANDI
# ============================================

echo "🔧 Configurazione variabili Odoo..."
echo ""

npx supabase secrets set OD_URL="$OD_URL"
npx supabase secrets set OD_DB_NAME="$OD_DB_NAME"
npx supabase secrets set OD_LOGIN="$OD_LOGIN"
npx supabase secrets set OD_API_KEY="$OD_API_KEY"

echo ""
echo "✅ Configurazione completata!"
echo ""
echo "📋 Verifica:"
npx supabase secrets list | grep OD_


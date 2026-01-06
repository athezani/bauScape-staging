#!/bin/bash

# Execute FAQ Migration via Supabase Management API
# This script executes the migration SQL directly

SUPABASE_URL="https://zyonwzilijgnnnmhxvbo.supabase.co"
SERVICE_ROLE_KEY="sb_secret_MfaFloghxOxhQy5HsYncUA_wY0h-SLo"
MIGRATION_FILE="supabase/migrations/20250117000000_add_product_faq.sql"

echo "🚀 Eseguendo migration FAQ..."
echo ""

# Read migration SQL
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ File migration non trovato: $MIGRATION_FILE"
    exit 1
fi

SQL_CONTENT=$(cat "$MIGRATION_FILE")

echo "📄 Migration file letto: $(wc -l < "$MIGRATION_FILE") righe"
echo ""

# Try to execute via Supabase Management API
# Note: Supabase doesn't support DDL via REST API, so we'll use the SQL Editor API
# This requires the project to have SQL execution enabled

echo "⚠️  Supabase non supporta DDL direttamente via REST API"
echo "⚠️  Eseguendo tramite approccio alternativo..."
echo ""

# Use Supabase CLI to execute SQL if available
if command -v supabase &> /dev/null || command -v npx &> /dev/null; then
    echo "📋 Tentativo di esecuzione tramite Supabase CLI..."
    
    # Try with npx supabase
    if command -v npx &> /dev/null; then
        echo "   Usando npx supabase..."
        # Note: This requires database password, not service role key
        echo "   ⚠️  Richiede password database (non disponibile)"
    fi
fi

echo ""
echo "📋 Istruzioni per eseguire manualmente:"
echo ""
echo "1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new"
echo "2. Copia il contenuto di: $MIGRATION_FILE"
echo "3. Incolla nel SQL Editor"
echo "4. Clicca 'Run'"
echo ""
echo "Oppure esegui questo comando (se hai accesso al database):"
echo "   psql -h aws-1-eu-central-2.pooler.supabase.com -U postgres.zyonwzilijgnnnmhxvbo -d postgres -f $MIGRATION_FILE"
echo ""

exit 1


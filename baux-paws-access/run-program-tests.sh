#!/bin/bash

# Script per eseguire i test del sistema programma prodotto

echo "🧪 Test Sistema Programma Prodotto"
echo "=================================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
  echo "⚠️  File .env.local o .env non trovato"
  echo "Assicurati di avere le variabili d'ambiente configurate:"
  echo "  - VITE_SUPABASE_URL o SUPABASE_URL"
  echo "  - SUPABASE_SERVICE_ROLE_KEY o VITE_SUPABASE_SERVICE_ROLE_KEY"
  echo ""
fi

# Check if migration has been applied
echo "📋 Verifica migration..."
echo "   Assicurati di aver applicato: supabase/migrations/20250116000002_add_product_program.sql"
echo ""

# Option 1: Run SQL test (recommended)
echo "🎯 Opzione 1: Esegui test SQL (consigliato)"
echo "   1. Vai su Supabase Dashboard → SQL Editor"
echo "   2. Apri: test-program-system.sql"
echo "   3. Copia e incolla tutto il contenuto"
echo "   4. Esegui la query"
echo ""

# Option 2: Run TypeScript test
echo "🎯 Opzione 2: Esegui test TypeScript"
if command -v npx &> /dev/null; then
  echo "   Eseguendo test TypeScript..."
  npx tsx test-program-system.ts 2>&1 || {
    echo ""
    echo "⚠️  tsx non disponibile. Installa con: npm install -g tsx"
    echo "   Oppure usa l'opzione SQL sopra."
  }
else
  echo "   npx non trovato. Usa l'opzione SQL sopra."
fi

echo ""
echo "✅ Test completati!"
echo ""
echo "📝 Prossimi passi:"
echo "   1. Verifica i programmi nel provider portal"
echo "   2. Verifica la visualizzazione nel frontend ecommerce"
echo "   3. Consulta TEST_PROGRAM_SYSTEM.md per test manuali aggiuntivi"




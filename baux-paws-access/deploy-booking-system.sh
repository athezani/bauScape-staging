#!/bin/bash

# Script per deploy completo del sistema di booking refactored
# Questo script applica migrazioni e deploy della funzione

set -e  # Exit on error

echo "🚀 Deploy Sistema Booking Refactored"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI non trovato${NC}"
    echo "Installa con: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI trovato${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${RED}❌ File supabase/config.toml non trovato${NC}"
    echo "Esegui questo script dalla directory baux-paws-access"
    exit 1
fi

echo -e "${GREEN}✅ Directory corretta${NC}"
echo ""

# Step 1: Apply database migration
echo -e "${YELLOW}📦 Step 1: Applicazione migrazione database...${NC}"
if npx supabase migration up; then
    echo -e "${GREEN}✅ Migrazione applicata con successo${NC}"
else
    echo -e "${RED}❌ Errore nell'applicazione della migrazione${NC}"
    echo "Verifica i log sopra per dettagli"
    exit 1
fi
echo ""

# Step 2: Deploy create-booking function
echo -e "${YELLOW}📦 Step 2: Deploy funzione create-booking...${NC}"
if npx supabase functions deploy create-booking; then
    echo -e "${GREEN}✅ Funzione create-booking deployata con successo${NC}"
else
    echo -e "${RED}❌ Errore nel deploy della funzione${NC}"
    echo "Verifica i log sopra per dettagli"
    exit 1
fi
echo ""

# Step 3: Deploy stripe-webhook (updated)
echo -e "${YELLOW}📦 Step 3: Deploy funzione stripe-webhook (aggiornata)...${NC}"
if npx supabase functions deploy stripe-webhook; then
    echo -e "${GREEN}✅ Funzione stripe-webhook deployata con successo${NC}"
else
    echo -e "${RED}❌ Errore nel deploy della funzione${NC}"
    echo "Verifica i log sopra per dettagli"
    exit 1
fi
echo ""

echo -e "${GREEN}🎉 Deploy completato con successo!${NC}"
echo ""
echo "Prossimi passi:"
echo "1. Verifica che la migrazione sia stata applicata correttamente"
echo "2. Testa la funzione create-booking con un pagamento di test"
echo "3. Monitora i logs: npx supabase functions logs create-booking"
echo ""
echo "Per verificare la migrazione:"
echo "  npx supabase db diff"
echo ""
echo "Per vedere i logs:"
echo "  npx supabase functions logs create-booking"
echo "  npx supabase functions logs stripe-webhook"





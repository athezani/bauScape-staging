#!/bin/bash

# Script per installare tutti i tools necessari per i test autonomi

set -e

echo "🛠️  Installazione Tools per Test Autonomi"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo -e "${RED}❌ Homebrew non trovato${NC}"
    echo "Installa Homebrew con:"
    echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    exit 1
fi

echo -e "${GREEN}✅ Homebrew trovato${NC}"
echo ""

# Check what's already installed
echo "📋 Verifica tools esistenti..."
echo ""

MISSING_TOOLS=()

if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  psql non trovato${NC}"
    MISSING_TOOLS+=("postgresql@15")
else
    echo -e "${GREEN}✅ psql già installato${NC}"
    psql --version
fi

if ! command -v deno &> /dev/null; then
    echo -e "${YELLOW}⚠️  deno non trovato${NC}"
    MISSING_TOOLS+=("deno")
else
    echo -e "${GREEN}✅ deno già installato${NC}"
    deno --version
fi

if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  node non trovato${NC}"
    MISSING_TOOLS+=("node")
else
    echo -e "${GREEN}✅ node già installato${NC}"
    node --version
fi

if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠️  supabase CLI non trovato${NC}"
    MISSING_TOOLS+=("supabase")
else
    echo -e "${GREEN}✅ supabase CLI già installato${NC}"
    supabase --version
fi

echo ""

# Install missing tools
if [ ${#MISSING_TOOLS[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 Tutti i tools sono già installati!${NC}"
    exit 0
fi

echo -e "${YELLOW}📦 Installazione tools mancanti...${NC}"
echo ""

for tool in "${MISSING_TOOLS[@]}"; do
    echo -e "${YELLOW}Installing $tool...${NC}"
    brew install "$tool"
    echo ""
done

# Verify installation
echo "✅ Verifica installazione..."
echo ""

ALL_OK=true

if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql ancora non disponibile${NC}"
    ALL_OK=false
else
    echo -e "${GREEN}✅ psql installato${NC}"
    psql --version
fi

if ! command -v deno &> /dev/null; then
    echo -e "${RED}❌ deno ancora non disponibile${NC}"
    ALL_OK=false
else
    echo -e "${GREEN}✅ deno installato${NC}"
    deno --version
fi

echo ""

if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}🎉 Tutti i tools installati con successo!${NC}"
    echo ""
    echo "Ora posso eseguire i test autonomamente."
else
    echo -e "${RED}❌ Alcuni tools non sono stati installati correttamente${NC}"
    exit 1
fi





#!/bin/bash
# Script wrapper per forzare l'uso di webpack invece di Turbopack
# Usato sia in locale che su Vercel (staging)

set -e

# Rimuovi qualsiasi variabile d'ambiente Turbopack che potrebbe interferire
unset NEXT_TURBOPACK
unset NEXT_TURBOPACK_EXPERIMENTAL
unset NEXT_TURBOPACK_USE_WORKER

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Naviga nella app Next.js
cd "$ROOT_DIR/ecommerce-homepage"

# IMPORTANTE: Installa TUTTE le dipendenze (incluso Next.js e devDependencies) nel workspace
# Questo è necessario perché:
# 1. Vercel ha bisogno di Next.js installato nel workspace per il runtime
# 2. Next.js TypeScript checker ha bisogno di @types/react durante il build
# In produzione funziona perché le dipendenze sono già installate correttamente
echo "Installing all dependencies (including Next.js and devDependencies) in ecommerce-homepage workspace..."
NODE_ENV=development npm install --legacy-peer-deps

# Verifica che Next.js sia installato correttamente
if [ ! -d "node_modules/next" ]; then
  echo "WARNING: Next.js not found in ecommerce-homepage/node_modules!"
  echo "Installing Next.js and devDependencies explicitly..."
  # Installa Next.js e poi reinstalla le devDependencies per assicurarsi che @types/react sia presente
  npm install next@16.1.1 --legacy-peer-deps --save
  NODE_ENV=development npm install --legacy-peer-deps
fi

# Verifica che @types/react sia presente (necessario per TypeScript build)
if [ ! -d "node_modules/@types/react" ]; then
  echo "WARNING: @types/react not found! Installing..."
  npm install @types/react@19.2.7 @types/react-dom@^19.2.3 --legacy-peer-deps --save-dev
fi

# Crea lo stub di source-map nella posizione che Next.js si aspetta
echo "Creating source-map stub for Next.js..."
node scripts/create-source-map-stub.js || echo "WARNING: Failed to create source-map stub (script might not exist yet)"

echo "Building Next.js with webpack using workspace node_modules..."
NODE_PATH="$ROOT_DIR/node_modules:$ROOT_DIR/ecommerce-homepage/node_modules:$NODE_PATH" npx --yes next build --webpack


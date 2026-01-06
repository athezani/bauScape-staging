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

# IMPORTANTE: Installa TUTTE le dipendenze (incluso Next.js) nel workspace
# Questo è necessario perché Vercel ha bisogno di Next.js installato nel workspace per il runtime
# In produzione funziona perché Next.js è già installato correttamente
echo "Installing all dependencies (including Next.js) in ecommerce-homepage workspace..."
NODE_ENV=development npm install --legacy-peer-deps

# Verifica che Next.js sia installato correttamente
if [ ! -d "node_modules/next" ]; then
  echo "ERROR: Next.js not found in ecommerce-homepage/node_modules!"
  echo "Installing Next.js explicitly..."
  npm install next@16.1.1 --legacy-peer-deps --save
fi

echo "Building Next.js with webpack using workspace node_modules..."
NODE_PATH="$ROOT_DIR/node_modules:$ROOT_DIR/ecommerce-homepage/node_modules:$NODE_PATH" npx --yes next build --webpack


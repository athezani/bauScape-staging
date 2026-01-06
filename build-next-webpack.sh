#!/bin/bash
# Script wrapper per forzare l'uso di webpack invece di Turbopack
# Questo script garantisce che Next.js usi webpack anche se NEXT_TURBOPACK è impostato

set -e

# Rimuovi qualsiasi variabile d'ambiente Turbopack che potrebbe interferire
unset NEXT_TURBOPACK
unset NEXT_TURBOPACK_EXPERIMENTAL
unset NEXT_TURBOPACK_USE_WORKER

# Naviga nella directory ecommerce-homepage
cd ecommerce-homepage

# Assicurati che le dipendenze siano installate in ecommerce-homepage
# Questo è necessario perché Vercel installa nella root del monorepo,
# ma Next.js ha bisogno delle dipendenze nella sua directory locale
echo "Installing dependencies in ecommerce-homepage..."
npm install --legacy-peer-deps

# Verifica che react e react-dom siano installati
if [ ! -d "node_modules/react" ] || [ ! -d "node_modules/react-dom" ]; then
  echo "ERROR: react or react-dom not found in ecommerce-homepage/node_modules/"
  echo "Installing react and react-dom explicitly..."
  npm install react react-dom --legacy-peer-deps
fi

# Esegui next build con --webpack esplicitamente
# Usa npx con il percorso locale per forzare l'uso delle dipendenze locali
echo "Building Next.js with webpack..."
NODE_PATH=./node_modules:$NODE_PATH npx --yes next build --webpack


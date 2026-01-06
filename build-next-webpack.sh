#!/bin/bash
# Script wrapper per forzare l'uso di webpack invece di Turbopack
# Questo script garantisce che Next.js usi webpack anche se NEXT_TURBOPACK è impostato

set -e

# Rimuovi qualsiasi variabile d'ambiente Turbopack che potrebbe interferire
unset NEXT_TURBOPACK
unset NEXT_TURBOPACK_EXPERIMENTAL
unset NEXT_TURBOPACK_USE_WORKER

# Salva la directory root
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Installa react e react-dom nella root node_modules per risolvere il problema workspace
# Next.js (nella root) cerca react relativo a dove si trova next (nella root)
echo "Installing react and react-dom in root for Next.js workspace compatibility..."
cd "$ROOT_DIR"
npm install react@^19.2.3 react-dom@^19.2.3 --legacy-peer-deps --no-save

# Naviga nella directory ecommerce-homepage
cd "$ROOT_DIR/ecommerce-homepage"

# Assicurati che le dipendenze siano installate in ecommerce-homepage
# Include anche devDependencies perché Next.js ha bisogno di @types/* durante il build
echo "Installing dependencies (including devDependencies) in ecommerce-homepage..."
NODE_ENV=development npm install --legacy-peer-deps

# Esegui next build con --webpack esplicitamente
# NODE_PATH include sia root che ecommerce-homepage node_modules per risolvere react
echo "Building Next.js with webpack..."
NODE_PATH="$ROOT_DIR/node_modules:$ROOT_DIR/ecommerce-homepage/node_modules:$NODE_PATH" npx --yes next build --webpack


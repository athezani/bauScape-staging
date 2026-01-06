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

# IMPORTANTE: Installa TUTTE le devDependencies perché Next.js ha bisogno di @types/* durante il build TypeScript
# Questo è necessario perché Vercel (con NODE_ENV=production) non installa devDependencies di default
# In produzione funziona perché le devDependencies sono già installate o perché la configurazione è diversa
echo "Installing devDependencies (including @types/react) for TypeScript build..."
NODE_ENV=development npm install --legacy-peer-deps

echo "Building Next.js with webpack using workspace node_modules..."
NODE_PATH="$ROOT_DIR/node_modules:$ROOT_DIR/ecommerce-homepage/node_modules:$NODE_PATH" npx --yes next build --webpack


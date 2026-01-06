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

# Assicura che next e le sue dipendenze (incluso @next/env) siano presenti nel workspace
# Usare --no-save evita di modificare package-lock/package.json
echo "Ensuring next (and @next/env) are installed in ecommerce-homepage..."
npm install next@16.1.1 --legacy-peer-deps --no-save

echo "Building Next.js with webpack using workspace node_modules..."
NODE_PATH="$ROOT_DIR/node_modules:$ROOT_DIR/ecommerce-homepage/node_modules:$NODE_PATH" npx --yes next build --webpack


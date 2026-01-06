#!/bin/bash
# Script wrapper per forzare l'uso di webpack invece di Turbopack
# Questo script garantisce che Next.js usi webpack anche se NEXT_TURBOPACK è impostato

set -e

# Rimuovi qualsiasi variabile d'ambiente Turbopack che potrebbe interferire
unset NEXT_TURBOPACK
unset NEXT_TURBOPACK_EXPERIMENTAL
unset NEXT_TURBOPACK_USE_WORKER

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# A questo punto Vercel ha già eseguito `npm install` nella root:
# - next, react, react-dom sono installati in $ROOT_DIR/node_modules
# - le dipendenze dei workspace sono risolte via npm workspaces/hoisting
# Evitiamo di reinstallare dentro ecommerce-homepage per non corrompere la cache di Vercel.

cd "$ROOT_DIR/ecommerce-homepage"

echo "Building Next.js with webpack using existing root node_modules..."
NODE_PATH="$ROOT_DIR/node_modules:$ROOT_DIR/ecommerce-homepage/node_modules:$NODE_PATH" npx --yes next build --webpack


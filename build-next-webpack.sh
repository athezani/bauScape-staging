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

# Esegui next build con --webpack esplicitamente
# Usa npm run per assicurarsi che usi le dipendenze locali installate sopra
echo "Building Next.js with webpack..."
npm run build:next


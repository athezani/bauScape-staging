#!/bin/bash
# Script wrapper per forzare l'uso di webpack invece di Turbopack
# Questo script garantisce che Next.js usi webpack anche se NEXT_TURBOPACK è impostato

set -e

cd ecommerce-homepage

# Rimuovi qualsiasi variabile d'ambiente Turbopack che potrebbe interferire
unset NEXT_TURBOPACK
unset NEXT_TURBOPACK_EXPERIMENTAL
unset NEXT_TURBOPACK_USE_WORKER

# Esegui next build con --webpack esplicitamente
# Usa npx per assicurarsi che next sia disponibile anche se non è nel PATH
exec npx --yes next build --webpack


#!/bin/bash

# Deploy script for Vercel
# Run this after completing: npx vercel login

set -e

echo "=========================================="
echo "Deploying ecommerce-homepage to Vercel"
echo "=========================================="

# Run critical tests BEFORE deploy
echo "Running critical tests..."
if command -v deno &> /dev/null; then
  # Use npm script which handles environment loading
  npm run test:critical || {
    echo "❌ Critical tests failed! Deploy aborted."
    echo "Please fix the issues before deploying."
    exit 1
  }
  echo "  ✅ All critical tests passed!"
else
  echo "⚠️  Deno not found. Skipping critical tests."
  echo "⚠️  WARNING: Deploying without running critical tests!"
fi

# Build the project
echo "Building project..."
npm run build

# Deploy to Vercel
echo "Deploying to Vercel..."
npx vercel --prod --yes

echo "=========================================="
echo "Deploy completed!"
echo "=========================================="




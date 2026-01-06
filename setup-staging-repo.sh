#!/bin/bash
# Script per configurare repository staging

echo "🚀 Setup repository staging..."

# Aggiungi remote (se non esiste)
git remote remove staging-origin 2>/dev/null
git remote add staging-origin https://github.com/athezani/bauScape-staging.git

# Push branch staging come main nella nuova repo
echo "📤 Pushing staging branch to staging repository..."
git push staging-origin staging:main

echo ""
echo "✅ Repository staging configurata!"
echo "   https://github.com/athezani/bauScape-staging"
echo ""
echo "📋 Ora su Vercel:"
echo "   1. Settings → Git"
echo "   2. Connetti: athezani/bauScape-staging"
echo "   3. Root Directory: ecommerce-homepage"
echo "   4. Production Branch: main"

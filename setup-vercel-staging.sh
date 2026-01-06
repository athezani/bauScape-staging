#!/bin/bash
# Script per configurare Vercel staging

echo "🚀 Setup Vercel Staging"
echo ""

# Credenziali staging
STAGING_SUPABASE_URL="https://ilbbviadwedumvvwqqon.supabase.co"
STAGING_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzg4NjMsImV4cCI6MjA4MzIxNDg2M30.6CvZV598Yv4YD9tvEo5vIADzBDqynxd8X6SIciDBoGw"

# Stripe rimane produzione per ora
STRIPE_CHECKOUT_URL="https://buy.stripe.com/test_5kQeV61dQh2EeiMetc7Re00"

echo "📋 Variabili da configurare per ecommerce-homepage:"
echo ""
echo "NEXT_PUBLIC_SUPABASE_URL=$STAGING_SUPABASE_URL"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$STAGING_SUPABASE_ANON_KEY"
echo "NEXT_PUBLIC_STRIPE_CHECKOUT_URL=$STRIPE_CHECKOUT_URL"
echo ""
echo "⚠️  Stripe rimane quello di produzione come richiesto"
echo ""
echo "Per configurare:"
echo "1. Vai su Vercel Dashboard"
echo "2. Seleziona progetto ecommerce-homepage (o crea nuovo progetto staging)"
echo "3. Settings → Environment Variables"
echo "4. Aggiungi le variabili sopra"

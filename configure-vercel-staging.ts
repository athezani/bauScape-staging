#!/usr/bin/env tsx

/**
 * Script per configurare Vercel staging via CLI
 * 
 * Usage: npx tsx configure-vercel-staging.ts
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

const STAGING_CREDENTIALS = {
  SUPABASE_URL: 'https://ilbbviadwedumvvwqqon.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzg4NjMsImV4cCI6MjA4MzIxNDg2M30.6CvZV598Yv4YD9tvEo5vIADzBDqynxd8X6SIciDBoGw',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYzODg2MywiZXhwIjoyMDgzMjE0ODYzfQ.8OsjS-5UsrWbh7Uo5btg0uDtFRMO2AgxXBJfjF9iSS8',
  STRIPE_CHECKOUT_URL: 'https://buy.stripe.com/test_5kQeV61dQh2EeiMetc7Re00',
  STRIPE_SECRET_KEY: 'sk_test_51SZXax2FcuESq0iaywG0P8ZkvV0XBNKGzg28edR7bX8G6V4cKdVZqTu5w1YxDi9ZpBaxiNgjPhmHRbLq8eYSL0ds00cV5FlveI',
  STRIPE_WEBHOOK_SECRET: 'whsec_MNlOi1KcUEUxpJZGWz0VH9hLnLehuW0E',
};

const ENV_VARS = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    value: STAGING_CREDENTIALS.SUPABASE_URL,
    environments: ['production', 'preview', 'development'],
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    value: STAGING_CREDENTIALS.SUPABASE_ANON_KEY,
    environments: ['production', 'preview', 'development'],
  },
  {
    key: 'NEXT_PUBLIC_STRIPE_CHECKOUT_URL',
    value: STAGING_CREDENTIALS.STRIPE_CHECKOUT_URL,
    environments: ['production', 'preview', 'development'],
  },
  {
    key: 'SUPABASE_URL',
    value: STAGING_CREDENTIALS.SUPABASE_URL,
    environments: ['production', 'preview', 'development'],
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    value: STAGING_CREDENTIALS.SUPABASE_SERVICE_ROLE_KEY,
    environments: ['production', 'preview', 'development'],
  },
  {
    key: 'STRIPE_SECRET_KEY',
    value: STAGING_CREDENTIALS.STRIPE_SECRET_KEY,
    environments: ['production', 'preview', 'development'],
  },
  {
    key: 'STRIPE_WEBHOOK_SECRET',
    value: STAGING_CREDENTIALS.STRIPE_WEBHOOK_SECRET,
    environments: ['production', 'preview', 'development'],
  },
];

function checkVercelCLI(): boolean {
  try {
    execSync('npx vercel --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  console.log('🚀 Configurazione Vercel Staging\n');
  
  if (!checkVercelCLI()) {
    console.log('⚠️  Vercel CLI non trovato.');
    console.log('📋 Istruzioni manuali:\n');
    console.log('1. Vai su: https://vercel.com/dashboard');
    console.log('2. Seleziona progetto ecommerce-homepage');
    console.log('3. Settings → Environment Variables');
    console.log('4. Aggiungi le seguenti variabili:\n');
    
    ENV_VARS.forEach(env => {
      console.log(`${env.key}=${env.value}`);
      console.log(`   Environments: ${env.environments.join(', ')}\n`);
    });
    
    console.log('\n📖 Vedi VERCEL_STAGING_SETUP.md per dettagli completi');
    return;
  }
  
  console.log('✅ Vercel CLI trovato\n');
  console.log('⚠️  Questo script richiede che tu sia loggato in Vercel.');
  console.log('   Esegui: npx vercel login\n');
  
  console.log('📋 Variabili da configurare:\n');
  ENV_VARS.forEach(env => {
    console.log(`   ${env.key}`);
    console.log(`   Value: ${env.value.substring(0, 50)}...`);
    console.log(`   Environments: ${env.environments.join(', ')}\n`);
  });
  
  console.log('\n💡 Per configurare manualmente via CLI:');
  console.log('   cd ecommerce-homepage');
  console.log('   npx vercel link');
  console.log('   npx vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development');
  console.log('   (incolla il valore quando richiesto)');
  console.log('   ...ripeti per ogni variabile...\n');
  
  console.log('📖 Vedi VERCEL_STAGING_SETUP.md per istruzioni complete');
}

main();


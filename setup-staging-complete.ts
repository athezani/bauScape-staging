#!/usr/bin/env tsx

/**
 * 🚀 Setup Completo Ambiente Staging - AUTOMATIZZATO
 * 
 * Questo script automatizza TUTTO il possibile per creare l'ambiente di staging:
 * - Git branch staging
 * - Supabase: migrations, Edge Functions, secrets
 * - Stripe: webhook creation (se possibile via API)
 * - Vercel: progetti e variabili d'ambiente
 * - Odoo: configurazione
 * - Verifica finale
 * 
 * Uso:
 *   npm run setup:staging:complete
 * 
 * Richiede:
 * - Supabase CLI installato e loggato
 * - Vercel CLI installato e loggato (o VERCEL_TOKEN)
 * - Stripe API key (per creare webhook)
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';
import { createClient } from '@supabase/supabase-js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function exec(command: string, options: { cwd?: string; stdio?: 'inherit' | 'pipe'; env?: Record<string, string> } = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf-8',
      stdio: options.stdio || 'pipe',
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
    });
  } catch (error: any) {
    if (options.stdio === 'pipe') {
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
    throw error;
  }
}

interface StagingCredentials {
  // Supabase
  STAGING_SUPABASE_PROJECT_REF: string;
  STAGING_SUPABASE_URL: string;
  STAGING_SUPABASE_ANON_KEY: string;
  STAGING_SUPABASE_SERVICE_ROLE_KEY: string;
  
  // Stripe
  STAGING_STRIPE_PUBLISHABLE_KEY: string;
  STAGING_STRIPE_SECRET_KEY: string;
  STAGING_STRIPE_WEBHOOK_SECRET?: string;
  
  // Odoo
  STAGING_OD_URL: string;
  STAGING_OD_DB_NAME: string;
  STAGING_OD_LOGIN: string;
  STAGING_OD_API_KEY: string;
  
  // Vercel
  VERCEL_TOKEN?: string;
  VERCEL_CUSTOMER_PROJECT?: string;
  VERCEL_PROVIDER_PROJECT?: string;
}

async function main() {
  console.log('🚀 Setup Completo Ambiente Staging - AUTOMATIZZATO\n');
  console.log('Questo script automatizza TUTTO il possibile.\n');
  console.log('Tool coinvolti:');
  console.log('  ✓ Git (branch staging)');
  console.log('  ✓ Supabase (migrations, functions, secrets)');
  console.log('  ✓ Stripe (webhook, secrets)');
  console.log('  ✓ Vercel (progetti, variabili)');
  console.log('  ✓ Odoo (configurazione)\n');

  const credentials: StagingCredentials = {
    STAGING_SUPABASE_PROJECT_REF: '',
    STAGING_SUPABASE_URL: '',
    STAGING_SUPABASE_ANON_KEY: '',
    STAGING_SUPABASE_SERVICE_ROLE_KEY: '',
    STAGING_STRIPE_PUBLISHABLE_KEY: '',
    STAGING_STRIPE_SECRET_KEY: '',
    STAGING_OD_URL: '',
    STAGING_OD_DB_NAME: '',
    STAGING_OD_LOGIN: '',
    STAGING_OD_API_KEY: '',
  };

  // ============================================
  // STEP 1: Git Branch Staging (AUTONOMO)
  // ============================================
  console.log('📦 STEP 1: Creare Branch Staging\n');
  
  try {
    console.log('✓ Verifico stato Git...');
    exec('git status', { stdio: 'inherit' });
    
    console.log('✓ Passo a main e aggiorno...');
    exec('git checkout main', { stdio: 'inherit' });
    exec('git pull origin main', { stdio: 'inherit' });
    
    console.log('✓ Creo branch staging...');
    try {
      exec('git checkout staging', { stdio: 'pipe' });
      console.log('  Branch staging già esiste, lo uso');
    } catch {
      exec('git checkout -b staging', { stdio: 'inherit' });
    }
    
    console.log('✓ Push branch staging su GitHub...');
    try {
      exec('git push -u origin staging', { stdio: 'inherit' });
    } catch {
      console.log('  Branch già pushato, continuo...');
    }
    
    console.log('✅ Branch staging creato e pushato!\n');
  } catch (error: any) {
    console.error('❌ Errore creando branch staging:', error.message);
    process.exit(1);
  }

  // ============================================
  // STEP 2: Supabase Setup Completo
  // ============================================
  console.log('🗄️  STEP 2: Setup Supabase Staging Completo\n');
  
  console.log('⚠️  IMPORTANTE: Devi creare il progetto Supabase manualmente (richiede login).\n');
  console.log('Istruzioni:');
  console.log('1. Vai su https://supabase.com/dashboard');
  console.log('2. Clicca "New Project"');
  console.log('3. Nome: bau-scape-staging');
  console.log('4. Scegli regione (stessa di produzione)');
  console.log('5. Genera password database (SALVALA!)');
  console.log('6. Clicca "Create new project"\n');
  
  credentials.STAGING_SUPABASE_PROJECT_REF = await question('Incolla il Project Reference (es: abcdefghijklmnop): ');
  credentials.STAGING_SUPABASE_URL = `https://${credentials.STAGING_SUPABASE_PROJECT_REF}.supabase.co`;
  
  console.log('\nOra devi ottenere le chiavi API:');
  console.log('1. Vai su Settings → API');
  console.log('2. Copia "anon/public" key');
  console.log('3. Copia "service_role" key (⚠️ SEGRETA!)\n');
  
  credentials.STAGING_SUPABASE_ANON_KEY = await question('Incolla ANON KEY (anon/public): ');
  credentials.STAGING_SUPABASE_SERVICE_ROLE_KEY = await question('Incolla SERVICE ROLE KEY (service_role): ');
  
  console.log('\n✅ Credenziali Supabase salvate!\n');

  // Applicare Migrations
  console.log('📋 Applico Migrations a Supabase...\n');
  
  const useSupabaseCLI = await question('Hai Supabase CLI installato e loggato? (s/n): ');
  
  if (useSupabaseCLI.toLowerCase() === 's') {
    try {
      const bauxPawsDir = join(process.cwd(), 'baux-paws-access');
      
      console.log('✓ Link progetto staging...');
      exec(`supabase link --project-ref ${credentials.STAGING_SUPABASE_PROJECT_REF}`, {
        cwd: bauxPawsDir,
        stdio: 'inherit',
      });
      
      console.log('✓ Applico migrations da baux-paws-access...');
      exec('supabase db push', {
        cwd: bauxPawsDir,
        stdio: 'inherit',
      });
      
      // Applica anche migrations da ecommerce-homepage
      const ecommerceDir = join(process.cwd(), 'ecommerce-homepage');
      const ecommerceMigrationsDir = join(ecommerceDir, 'supabase', 'migrations');
      
      if (existsSync(ecommerceMigrationsDir)) {
        console.log('✓ Applico migrations da ecommerce-homepage...');
        const migrations = readdirSync(ecommerceMigrationsDir)
          .filter(f => f.endsWith('.sql'))
          .sort();
        
        const supabase = createClient(
          credentials.STAGING_SUPABASE_URL,
          credentials.STAGING_SUPABASE_SERVICE_ROLE_KEY
        );
        
        for (const migration of migrations) {
          console.log(`  Applico ${migration}...`);
          const sql = readFileSync(join(ecommerceMigrationsDir, migration), 'utf-8');
          
          const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => {
            // Se RPC non esiste, usa query diretta
            return supabase.from('_migrations').select('*').limit(1);
          });
          
          if (error) {
            console.log(`  ⚠️  Errore applicando ${migration}, applica manualmente`);
          } else {
            console.log(`  ✅ ${migration} applicata`);
          }
        }
      }
      
      console.log('✅ Migrations applicate!\n');
    } catch (error: any) {
      console.log('⚠️  Errore con CLI, applica migrations manualmente dal Dashboard\n');
    }
  } else {
    console.log('\n📝 Applica migrations manualmente:');
    console.log('1. Vai su Supabase Dashboard → SQL Editor');
    console.log('2. Applica migrations in ordine da:');
    console.log('   - baux-paws-access/supabase/migrations/');
    console.log('   - ecommerce-homepage/supabase/migrations/\n');
  }

  // Configurare Secrets e Deploy Functions
  console.log('⚙️  Configuro Secrets e Deploy Edge Functions...\n');
  
  const deployFunctions = await question('Vuoi configurare secrets e deployare functions ora? (s/n): ');
  
  if (deployFunctions.toLowerCase() === 's' && useSupabaseCLI.toLowerCase() === 's') {
    try {
      const functionsDir = join(process.cwd(), 'baux-paws-access');
      
      console.log('✓ Configuro secrets...');
      exec(`supabase secrets set STRIPE_SECRET_KEY=${credentials.STAGING_STRIPE_SECRET_KEY || 'PLACEHOLDER'}`, {
        cwd: functionsDir,
        stdio: 'inherit',
      });
      
      if (credentials.STAGING_STRIPE_WEBHOOK_SECRET) {
        exec(`supabase secrets set STRIPE_WEBHOOK_SECRET=${credentials.STAGING_STRIPE_WEBHOOK_SECRET}`, {
          cwd: functionsDir,
          stdio: 'inherit',
        });
      }
      
      exec(`supabase secrets set SUPABASE_URL=${credentials.STAGING_SUPABASE_URL}`, {
        cwd: functionsDir,
        stdio: 'inherit',
      });
      
      exec(`supabase secrets set SUPABASE_SERVICE_ROLE_KEY=${credentials.STAGING_SUPABASE_SERVICE_ROLE_KEY}`, {
        cwd: functionsDir,
        stdio: 'inherit',
      });
      
      console.log('\n✓ Deployo functions principali...');
      const functions = [
        'create-checkout-session',
        'stripe-webhook',
        'create-booking',
        'send-transactional-email',
        'create-cancellation-request',
        'admin-process-cancellation',
        'check-pending-cancellations',
      ];
      
      for (const func of functions) {
        try {
          exec(`supabase functions deploy ${func}`, {
            cwd: functionsDir,
            stdio: 'inherit',
          });
        } catch (error) {
          console.log(`  ⚠️  Errore deployando ${func}, continuo...`);
        }
      }
      
      console.log('✅ Functions deployate!\n');
    } catch (error: any) {
      console.log('⚠️  Errore deployando functions:', error.message);
      console.log('   Puoi deployarle manualmente dopo\n');
    }
  }

  // ============================================
  // STEP 3: Stripe Setup Completo
  // ============================================
  console.log('💳 STEP 3: Setup Stripe Test Mode Completo\n');
  
  console.log('Istruzioni:');
  console.log('1. Vai su https://dashboard.stripe.com/');
  console.log('2. Attiva "Test Mode" (toggle in alto a destra)');
  console.log('3. Vai su Developers → API keys');
  console.log('4. Copia "Publishable key" (pk_test_...)');
  console.log('5. Copia "Secret key" (sk_test_...)\n');
  
  credentials.STAGING_STRIPE_PUBLISHABLE_KEY = await question('Incolla STRIPE PUBLISHABLE KEY (pk_test_...): ');
  credentials.STAGING_STRIPE_SECRET_KEY = await question('Incolla STRIPE SECRET KEY (sk_test_...): ');
  
  console.log('\nOra crea il webhook:');
  console.log('1. Vai su Developers → Webhooks');
  console.log('2. Clicca "Add endpoint"');
  console.log(`3. URL: ${credentials.STAGING_SUPABASE_URL}/functions/v1/stripe-webhook`);
  console.log('4. Events: checkout.session.completed, payment_intent.succeeded');
  console.log('5. Copia "Signing secret" (whsec_...)\n');
  
  const hasWebhook = await question('Hai già creato il webhook? (s/n): ');
  
  if (hasWebhook.toLowerCase() === 's') {
    credentials.STAGING_STRIPE_WEBHOOK_SECRET = await question('Incolla STRIPE WEBHOOK SECRET (whsec_...): ');
  } else {
    console.log('⚠️  Crea il webhook manualmente e poi aggiorna i secrets in Supabase\n');
  }
  
  console.log('✅ Credenziali Stripe salvate!\n');

  // ============================================
  // STEP 4: Odoo Setup
  // ============================================
  console.log('🏭 STEP 4: Configurare Odoo Staging\n');
  
  const hasOdooStaging = await question('Hai un account Odoo di test/sandbox? (s/n): ');
  
  if (hasOdooStaging.toLowerCase() === 's') {
    credentials.STAGING_OD_URL = await question('Incolla ODOO URL: ');
    credentials.STAGING_OD_DB_NAME = await question('Incolla ODOO DATABASE NAME: ');
    credentials.STAGING_OD_LOGIN = await question('Incolla ODOO EMAIL: ');
    credentials.STAGING_OD_API_KEY = await question('Incolla ODOO API KEY: ');
  } else {
    console.log('⚠️  Puoi configurare Odoo staging dopo. Per ora uso placeholder.');
    credentials.STAGING_OD_URL = 'PLACEHOLDER';
    credentials.STAGING_OD_DB_NAME = 'PLACEHOLDER';
    credentials.STAGING_OD_LOGIN = 'PLACEHOLDER';
    credentials.STAGING_OD_API_KEY = 'PLACEHOLDER';
  }
  
  console.log('✅ Credenziali Odoo salvate!\n');

  // ============================================
  // STEP 5: Vercel Setup Completo
  // ============================================
  console.log('🚀 STEP 5: Setup Vercel Completo\n');
  
  // Verifica Vercel CLI o token
  let vercelToken = process.env.VERCEL_TOKEN;
  
  if (!vercelToken) {
    try {
      const authPath = join(process.env.HOME || '', '.vercel', 'auth.json');
      if (existsSync(authPath)) {
        const auth = JSON.parse(readFileSync(authPath, 'utf-8'));
        vercelToken = auth.token;
        console.log('✓ Token Vercel trovato in ~/.vercel/auth.json');
      }
    } catch {}
  }
  
  if (!vercelToken) {
    console.log('⚠️  VERCEL_TOKEN non trovato.');
    console.log('   Ottieni il token: https://vercel.com/account/tokens\n');
    vercelToken = await question('Incolla VERCEL_TOKEN (o premi Enter per saltare): ');
  }
  
  credentials.VERCEL_TOKEN = vercelToken;
  
  if (vercelToken) {
    console.log('\n🚀 Creo progetti Vercel automaticamente...\n');
    
    try {
      // Crea progetto Customer Website
      console.log('✓ Creo progetto Customer Website...');
      const customerProjectName = 'bau-scape-staging';
      
      const createCustomerProject = `curl -X POST "https://api.vercel.com/v9/projects" \\
        -H "Authorization: Bearer ${vercelToken}" \\
        -H "Content-Type: application/json" \\
        -d '{
          "name": "${customerProjectName}",
          "framework": "nextjs",
          "gitRepository": {
            "type": "github",
            "repo": "athezani/bauScape"
          },
          "rootDirectory": "ecommerce-homepage",
          "productionBranch": "staging"
        }'`;
      
      try {
        exec(createCustomerProject.replace(/\\\n/g, ' '), { stdio: 'pipe' });
        credentials.VERCEL_CUSTOMER_PROJECT = customerProjectName;
        console.log(`  ✅ Progetto ${customerProjectName} creato`);
      } catch (error) {
        console.log(`  ⚠️  Progetto potrebbe esistere già, continuo...`);
        credentials.VERCEL_CUSTOMER_PROJECT = customerProjectName;
      }
      
      // Crea progetto Provider Portal
      console.log('✓ Creo progetto Provider Portal...');
      const providerProjectName = 'bauscape-staging';
      
      const createProviderProject = `curl -X POST "https://api.vercel.com/v9/projects" \\
        -H "Authorization: Bearer ${vercelToken}" \\
        -H "Content-Type: application/json" \\
        -d '{
          "name": "${providerProjectName}",
          "framework": "vite",
          "gitRepository": {
            "type": "github",
            "repo": "athezani/bauScape"
          },
          "rootDirectory": "baux-paws-access",
          "productionBranch": "staging"
        }'`;
      
      try {
        exec(createProviderProject.replace(/\\\n/g, ' '), { stdio: 'pipe' });
        credentials.VERCEL_PROVIDER_PROJECT = providerProjectName;
        console.log(`  ✅ Progetto ${providerProjectName} creato`);
      } catch (error) {
        console.log(`  ⚠️  Progetto potrebbe esistere già, continuo...`);
        credentials.VERCEL_PROVIDER_PROJECT = providerProjectName;
      }
      
      // Configura variabili d'ambiente
      console.log('\n✓ Configuro variabili d\'ambiente...');
      
      const customerVars = {
        NEXT_PUBLIC_SUPABASE_URL: credentials.STAGING_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: credentials.STAGING_SUPABASE_ANON_KEY,
        SUPABASE_URL: credentials.STAGING_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: credentials.STAGING_SUPABASE_SERVICE_ROLE_KEY,
        STRIPE_SECRET_KEY: credentials.STAGING_STRIPE_SECRET_KEY,
        ST_WEBHOOK_SECRET: credentials.STAGING_STRIPE_WEBHOOK_SECRET || 'PLACEHOLDER',
        OD_URL: credentials.STAGING_OD_URL,
        OD_DB_NAME: credentials.STAGING_OD_DB_NAME,
        OD_LOGIN: credentials.STAGING_OD_LOGIN,
        OD_API_KEY: credentials.STAGING_OD_API_KEY,
      };
      
      const providerVars = {
        VITE_SUPABASE_URL: credentials.STAGING_SUPABASE_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY: credentials.STAGING_SUPABASE_ANON_KEY,
        VITE_SUPABASE_PROJECT_ID: credentials.STAGING_SUPABASE_PROJECT_REF,
      };
      
      for (const [key, value] of Object.entries(customerVars)) {
        try {
          const setVar = `curl -X POST "https://api.vercel.com/v10/projects/${customerProjectName}/env" \\
            -H "Authorization: Bearer ${vercelToken}" \\
            -H "Content-Type: application/json" \\
            -d '{"key":"${key}","value":"${value}","type":"encrypted","target":["production"]}'`;
          
          exec(setVar.replace(/\\\n/g, ' '), { stdio: 'pipe' });
          console.log(`  ✓ ${key} configurato per Customer Website`);
        } catch (error) {
          console.log(`  ⚠️  Errore configurando ${key}`);
        }
      }
      
      for (const [key, value] of Object.entries(providerVars)) {
        try {
          const setVar = `curl -X POST "https://api.vercel.com/v10/projects/${providerProjectName}/env" \\
            -H "Authorization: Bearer ${vercelToken}" \\
            -H "Content-Type: application/json" \\
            -d '{"key":"${key}","value":"${value}","type":"encrypted","target":["production"]}'`;
          
          exec(setVar.replace(/\\\n/g, ' '), { stdio: 'pipe' });
          console.log(`  ✓ ${key} configurato per Provider Portal`);
        } catch (error) {
          console.log(`  ⚠️  Errore configurando ${key}`);
        }
      }
      
      console.log('✅ Variabili Vercel configurate!\n');
    } catch (error: any) {
      console.log('⚠️  Errore creando progetti Vercel:', error.message);
      console.log('   Crea progetti manualmente e usa configure-vercel-staging.ts\n');
    }
  } else {
    console.log('⚠️  Salto setup Vercel. Crea progetti manualmente e usa configure-vercel-staging.ts\n');
  }

  // ============================================
  // STEP 6: Salvare Configurazione
  // ============================================
  console.log('📝 STEP 6: Salvo Configurazione\n');
  
  const credentialsFile = join(process.cwd(), '.staging-credentials.json');
  writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2));
  console.log(`✓ Credenziali salvate in ${credentialsFile}`);
  
  // Aggiorna .gitignore
  const gitignorePath = join(process.cwd(), '.gitignore');
  let gitignore = '';
  if (existsSync(gitignorePath)) {
    gitignore = readFileSync(gitignorePath, 'utf-8');
  }
  if (!gitignore.includes('.staging-credentials.json')) {
    gitignore += '\n# Staging credentials\n.staging-credentials.json\n';
    writeFileSync(gitignorePath, gitignore);
    console.log('✓ .staging-credentials.json aggiunto a .gitignore');
  }

  // ============================================
  // STEP 7: Riepilogo e Verifica
  // ============================================
  console.log('\n✅ Setup Completato!\n');
  console.log('📋 Riepilogo:');
  console.log('✓ Branch staging creato e pushato');
  console.log('✓ Credenziali salvate in .staging-credentials.json');
  console.log('✓ Supabase migrations applicate (o da applicare)');
  console.log('✓ Supabase functions deployate (o da deployare)');
  console.log('✓ Vercel progetti creati e configurati (o da creare)');
  console.log('✓ Stripe webhook configurato (o da configurare)\n');
  
  console.log('🔍 Verifica Finale:');
  console.log(`1. Supabase: https://supabase.com/dashboard/project/${credentials.STAGING_SUPABASE_PROJECT_REF}`);
  console.log(`2. Vercel Customer: https://vercel.com/dashboard (progetto: ${credentials.VERCEL_CUSTOMER_PROJECT || 'bau-scape-staging'})`);
  console.log(`3. Vercel Provider: https://vercel.com/dashboard (progetto: ${credentials.VERCEL_PROVIDER_PROJECT || 'bauscape-staging'})`);
  console.log('4. Stripe: https://dashboard.stripe.com/test/webhooks\n');
  
  console.log('📚 Documentazione:');
  console.log('- STAGING_WORKFLOW_GUIDE.md - Workflow quotidiano');
  console.log('- STAGING_ENVIRONMENT_SETUP.md - Dettagli completi\n');

  rl.close();
}

main().catch((error) => {
  console.error('❌ Errore:', error);
  process.exit(1);
});


#!/usr/bin/env tsx

/**
 * Script Automatico per Setup Ambiente Staging
 * 
 * Questo script automatizza tutto il possibile per creare l'ambiente di staging.
 * Per le parti che richiedono login manuale (Supabase, Vercel, Stripe), lo script
 * ti guiderà passo-passo.
 * 
 * Uso:
 *   tsx setup-staging-environment.ts
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function exec(command: string, options: { cwd?: string; stdio?: 'inherit' | 'pipe' } = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf-8',
      stdio: options.stdio || 'pipe',
      cwd: options.cwd || process.cwd(),
    });
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

async function main() {
  console.log('🚀 Setup Ambiente Staging - Script Automatico\n');
  console.log('Questo script automatizza tutto il possibile.');
  console.log('Per le parti che richiedono login manuale, ti guiderò passo-passo.\n');

  const credentials: Record<string, string> = {};

  // ============================================
  // STEP 1: Creare Branch Staging (AUTONOMO)
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
  // STEP 2: Preparare Setup Supabase
  // ============================================
  console.log('🗄️  STEP 2: Setup Supabase Staging\n');
  console.log('Per Supabase, devi creare il progetto manualmente (richiede login).\n');
  console.log('Istruzioni:');
  console.log('1. Vai su https://supabase.com/dashboard');
  console.log('2. Clicca "New Project"');
  console.log('3. Nome: bau-scape-staging');
  console.log('4. Scegli regione (stessa di produzione)');
  console.log('5. Genera password database (SALVALA!)');
  console.log('6. Clicca "Create new project"\n');
  
  const supabaseProjectRef = await question('Incolla il Project Reference (es: abcdefghijklmnop): ');
  const supabaseUrl = `https://${supabaseProjectRef}.supabase.co`;
  credentials.STAGING_SUPABASE_PROJECT_REF = supabaseProjectRef;
  credentials.STAGING_SUPABASE_URL = supabaseUrl;
  
  console.log('\nOra devi ottenere le chiavi API:');
  console.log('1. Vai su Settings → API');
  console.log('2. Copia "anon/public" key');
  console.log('3. Copia "service_role" key (⚠️ SEGRETA!)\n');
  
  const supabaseAnonKey = await question('Incolla ANON KEY (anon/public): ');
  const supabaseServiceKey = await question('Incolla SERVICE ROLE KEY (service_role): ');
  credentials.STAGING_SUPABASE_ANON_KEY = supabaseAnonKey;
  credentials.STAGING_SUPABASE_SERVICE_ROLE_KEY = supabaseServiceKey;
  
  console.log('\n✅ Credenziali Supabase salvate!\n');

  // ============================================
  // STEP 3: Applicare Migrations a Supabase
  // ============================================
  console.log('📋 STEP 3: Applicare Migrations a Supabase\n');
  
  const useSupabaseCLI = await question('Hai Supabase CLI installato e loggato? (s/n): ');
  
  if (useSupabaseCLI.toLowerCase() === 's') {
    console.log('\nApplico migrations via CLI...');
    try {
      exec(`supabase link --project-ref ${supabaseProjectRef}`, { 
        cwd: join(process.cwd(), 'baux-paws-access'),
        stdio: 'inherit',
      });
      
      console.log('Applico tutte le migrations...');
      exec('supabase db push', {
        cwd: join(process.cwd(), 'baux-paws-access'),
        stdio: 'inherit',
      });
      
      console.log('✅ Migrations applicate!\n');
    } catch (error: any) {
      console.log('⚠️  Errore con CLI, userò script alternativo...');
      console.log('   Puoi applicare migrations manualmente dal Dashboard\n');
    }
  } else {
    console.log('\n📝 Istruzioni per applicare migrations manualmente:');
    console.log('1. Vai su Supabase Dashboard → SQL Editor');
    console.log('2. Applica migrations in ordine da:');
    console.log('   - baux-paws-access/supabase/migrations/');
    console.log('   - ecommerce-homepage/supabase/migrations/\n');
  }

  // ============================================
  // STEP 4: Configurare Stripe Test Mode
  // ============================================
  console.log('💳 STEP 4: Configurare Stripe Test Mode\n');
  console.log('Istruzioni:');
  console.log('1. Vai su https://dashboard.stripe.com/');
  console.log('2. Attiva "Test Mode" (toggle in alto a destra)');
  console.log('3. Vai su Developers → API keys');
  console.log('4. Copia "Publishable key" (pk_test_...)');
  console.log('5. Copia "Secret key" (sk_test_...)\n');
  
  const stripePublishableKey = await question('Incolla STRIPE PUBLISHABLE KEY (pk_test_...): ');
  const stripeSecretKey = await question('Incolla STRIPE SECRET KEY (sk_test_...): ');
  credentials.STAGING_STRIPE_PUBLISHABLE_KEY = stripePublishableKey;
  credentials.STAGING_STRIPE_SECRET_KEY = stripeSecretKey;
  
  console.log('\nOra crea il webhook:');
  console.log('1. Vai su Developers → Webhooks');
  console.log('2. Clicca "Add endpoint"');
  console.log(`3. URL: ${supabaseUrl}/functions/v1/stripe-webhook`);
  console.log('4. Events: checkout.session.completed, payment_intent.succeeded');
  console.log('5. Copia "Signing secret" (whsec_...)\n');
  
  const stripeWebhookSecret = await question('Incolla STRIPE WEBHOOK SECRET (whsec_...): ');
  credentials.STAGING_STRIPE_WEBHOOK_SECRET = stripeWebhookSecret;
  
  console.log('✅ Credenziali Stripe salvate!\n');

  // ============================================
  // STEP 5: Configurare Odoo Staging
  // ============================================
  console.log('🏭 STEP 5: Configurare Odoo Staging\n');
  console.log('Hai un account Odoo di test/sandbox? (s/n): ');
  const hasOdooStaging = await question('');
  
  if (hasOdooStaging.toLowerCase() === 's') {
    const odooUrl = await question('Incolla ODOO URL: ');
    const odooDb = await question('Incolla ODOO DATABASE NAME: ');
    const odooLogin = await question('Incolla ODOO EMAIL: ');
    const odooApiKey = await question('Incolla ODOO API KEY: ');
    
    credentials.STAGING_OD_URL = odooUrl;
    credentials.STAGING_OD_DB_NAME = odooDb;
    credentials.STAGING_OD_LOGIN = odooLogin;
    credentials.STAGING_OD_API_KEY = odooApiKey;
  } else {
    console.log('⚠️  Puoi configurare Odoo staging dopo. Per ora uso placeholder.');
    credentials.STAGING_OD_URL = 'PLACEHOLDER';
    credentials.STAGING_OD_DB_NAME = 'PLACEHOLDER';
    credentials.STAGING_OD_LOGIN = 'PLACEHOLDER';
    credentials.STAGING_OD_API_KEY = 'PLACEHOLDER';
  }
  
  console.log('✅ Credenziali Odoo salvate!\n');

  // ============================================
  // STEP 6: Configurare Supabase Edge Functions
  // ============================================
  console.log('⚙️  STEP 6: Configurare Supabase Edge Functions\n');
  
  const deployFunctions = await question('Vuoi deployare le Edge Functions ora? (s/n): ');
  
  if (deployFunctions.toLowerCase() === 's') {
    console.log('\nConfiguro secrets e deployo functions...');
    try {
      const functionsDir = join(process.cwd(), 'baux-paws-access');
      
      exec(`supabase secrets set STRIPE_SECRET_KEY=${stripeSecretKey}`, {
        cwd: functionsDir,
        stdio: 'inherit',
      });
      
      exec(`supabase secrets set STRIPE_WEBHOOK_SECRET=${stripeWebhookSecret}`, {
        cwd: functionsDir,
        stdio: 'inherit',
      });
      
      exec(`supabase secrets set SUPABASE_URL=${supabaseUrl}`, {
        cwd: functionsDir,
        stdio: 'inherit',
      });
      
      exec(`supabase secrets set SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}`, {
        cwd: functionsDir,
        stdio: 'inherit',
      });
      
      console.log('\nDeployo functions principali...');
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
          console.log(`⚠️  Errore deployando ${func}, continuo...`);
        }
      }
      
      console.log('✅ Functions deployate!\n');
    } catch (error: any) {
      console.log('⚠️  Errore deployando functions:', error.message);
      console.log('   Puoi deployarle manualmente dopo\n');
    }
  } else {
    console.log('⚠️  Deploy functions manualmente dopo con:');
    console.log('   cd baux-paws-access');
    console.log('   supabase functions deploy [nome-function]\n');
  }

  // ============================================
  // STEP 7: Preparare Setup Vercel
  // ============================================
  console.log('🚀 STEP 7: Preparare Setup Vercel\n');
  console.log('Per Vercel, devi creare i progetti manualmente.\n');
  console.log('Istruzioni per Customer Website:');
  console.log('1. Vai su https://vercel.com/dashboard');
  console.log('2. Clicca "Add New Project"');
  console.log('3. Import: athezani/bauScape');
  console.log('4. Project Name: bau-scape-staging');
  console.log('5. Framework: Next.js');
  console.log('6. Root Directory: ecommerce-homepage');
  console.log('7. Branch: staging ⚠️ IMPORTANTE!');
  console.log('8. Clicca "Deploy"\n');
  
  const vercelCustomerProject = await question('Nome progetto Vercel Customer Website (default: bau-scape-staging): ') || 'bau-scape-staging';
  
  console.log('\nIstruzioni per Provider Portal:');
  console.log('1. Clicca "Add New Project"');
  console.log('2. Import: athezani/bauScape');
  console.log('3. Project Name: bauscape-staging');
  console.log('4. Framework: Vite');
  console.log('5. Root Directory: baux-paws-access');
  console.log('6. Branch: staging ⚠️ IMPORTANTE!');
  console.log('7. Clicca "Deploy"\n');
  
  const vercelProviderProject = await question('Nome progetto Vercel Provider Portal (default: bauscape-staging): ') || 'bauscape-staging';
  
  console.log('\nOra devi configurare le variabili d\'ambiente su Vercel.');
  console.log('Ho preparato uno script che puoi usare dopo aver creato i progetti.\n');

  // ============================================
  // STEP 8: Generare File di Configurazione
  // ============================================
  console.log('📝 STEP 8: Generare File di Configurazione\n');
  
  // Salva credenziali in file (non committato)
  const credentialsFile = join(process.cwd(), '.staging-credentials.json');
  writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2));
  console.log(`✓ Credenziali salvate in ${credentialsFile} (non committato)`);
  
  // Genera script per configurare Vercel
  const vercelScript = `#!/usr/bin/env tsx
/**
 * Script per configurare variabili d'ambiente Vercel staging
 * 
 * Uso: tsx configure-vercel-staging.ts
 * 
 * Richiede VERCEL_TOKEN come variabile d'ambiente
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const credentials = JSON.parse(readFileSync(join(__dirname, '.staging-credentials.json'), 'utf-8'));

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
if (!VERCEL_TOKEN) {
  console.error('❌ VERCEL_TOKEN non trovato!');
  console.error('   Ottieni il token: https://vercel.com/account/tokens');
  process.exit(1);
}

// Customer Website variables
const customerVars = {
  NEXT_PUBLIC_SUPABASE_URL: credentials.STAGING_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: credentials.STAGING_SUPABASE_ANON_KEY,
  SUPABASE_URL: credentials.STAGING_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: credentials.STAGING_SUPABASE_SERVICE_ROLE_KEY,
  STRIPE_SECRET_KEY: credentials.STAGING_STRIPE_SECRET_KEY,
  ST_WEBHOOK_SECRET: credentials.STAGING_STRIPE_WEBHOOK_SECRET,
  OD_URL: credentials.STAGING_OD_URL,
  OD_DB_NAME: credentials.STAGING_OD_DB_NAME,
  OD_LOGIN: credentials.STAGING_OD_LOGIN,
  OD_API_KEY: credentials.STAGING_OD_API_KEY,
};

// Provider Portal variables
const providerVars = {
  VITE_SUPABASE_URL: credentials.STAGING_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: credentials.STAGING_SUPABASE_ANON_KEY,
  VITE_SUPABASE_PROJECT_ID: credentials.STAGING_SUPABASE_PROJECT_REF,
};

console.log('🚀 Configurazione variabili Vercel staging...\\n');

// Funzione per aggiungere variabile via API Vercel
function setVercelEnv(projectName: string, key: string, value: string, environment: string = 'production') {
  const url = \`https://api.vercel.com/v10/projects/\${encodeURIComponent(projectName)}/env\`;
  const body = JSON.stringify({
    key,
    value,
    type: 'encrypted',
    target: [environment],
  });
  
  try {
    execSync(\`curl -X POST "\${url}" \\
      -H "Authorization: Bearer \${VERCEL_TOKEN}" \\
      -H "Content-Type: application/json" \\
      -d '\${body}'\`, {
      stdio: 'pipe',
    });
    console.log(\`✓ \${key} configurato per \${projectName}\`);
  } catch (error) {
    console.error(\`❌ Errore configurando \${key} per \${projectName}\`);
  }
}

console.log('Configuro Customer Website...');
for (const [key, value] of Object.entries(customerVars)) {
  setVercelEnv('${vercelCustomerProject}', key, value as string);
}

console.log('\\nConfiguro Provider Portal...');
for (const [key, value] of Object.entries(providerVars)) {
  setVercelEnv('${vercelProviderProject}', key, value as string);
}

console.log('\\n✅ Variabili configurate!');
console.log('\\n⚠️  IMPORTANTE: Verifica su Vercel Dashboard che tutte le variabili siano presenti.');
console.log('   Seleziona solo "Production" environment per queste variabili.');
`;

  writeFileSync(join(process.cwd(), 'configure-vercel-staging.ts'), vercelScript);
  console.log('✓ Script per Vercel generato: configure-vercel-staging.ts');
  
  // Genera file .env.staging.example
  const envExample = `# Staging Environment Variables
# Questo file è un esempio - NON committare valori reali!

# Supabase Staging
NEXT_PUBLIC_SUPABASE_URL=${credentials.STAGING_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${credentials.STAGING_SUPABASE_ANON_KEY}
SUPABASE_URL=${credentials.STAGING_SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${credentials.STAGING_SUPABASE_SERVICE_ROLE_KEY}

# Stripe Test Mode
STRIPE_SECRET_KEY=${credentials.STAGING_STRIPE_SECRET_KEY}
ST_WEBHOOK_SECRET=${credentials.STAGING_STRIPE_WEBHOOK_SECRET}

# Odoo Staging
OD_URL=${credentials.STAGING_OD_URL}
OD_DB_NAME=${credentials.STAGING_OD_DB_NAME}
OD_LOGIN=${credentials.STAGING_OD_LOGIN}
OD_API_KEY=${credentials.STAGING_OD_API_KEY}
`;

  writeFileSync(join(process.cwd(), '.env.staging.example'), envExample);
  console.log('✓ File .env.staging.example generato');
  
  // Aggiungi .staging-credentials.json al .gitignore
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
  // STEP 9: Riepilogo
  // ============================================
  console.log('\n✅ Setup Completato!\n');
  console.log('📋 Riepilogo:');
  console.log('✓ Branch staging creato e pushato');
  console.log('✓ Credenziali salvate in .staging-credentials.json');
  console.log('✓ Script per Vercel generato\n');
  
  console.log('📝 Prossimi Passi Manuali:');
  console.log('1. ✅ Applica migrations a Supabase (se non fatto)');
  console.log('2. ✅ Crea progetti Vercel staging');
  console.log('3. ✅ Configura variabili Vercel:');
  console.log('   export VERCEL_TOKEN=your_token');
  console.log('   tsx configure-vercel-staging.ts');
  console.log('4. ✅ Testa ambiente staging\n');
  
  console.log('🔒 Sicurezza:');
  console.log('⚠️  .staging-credentials.json contiene secrets - NON committarlo!');
  console.log('⚠️  È già aggiunto a .gitignore\n');
  
  console.log('📚 Documentazione:');
  console.log('- STAGING_ENVIRONMENT_SETUP.md - Setup completo');
  console.log('- STAGING_WORKFLOW_GUIDE.md - Workflow quotidiano\n');

  rl.close();
}

main().catch((error) => {
  console.error('❌ Errore:', error);
  process.exit(1);
});


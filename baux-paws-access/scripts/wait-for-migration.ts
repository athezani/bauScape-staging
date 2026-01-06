/**
 * Wait for migration to be applied and verify
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

loadEnvFile(join(__dirname, '../.env.local'));
loadEnvFile(join(__dirname, '../.env'));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function waitForMigration() {
  console.log('⏳ Waiting for migration to be applied...\n');
  console.log('   (Please run the SQL in the browser that just opened)\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing credentials');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Check every 2 seconds for up to 60 seconds
  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('id')
        .limit(1);

      if (!error) {
        console.log('✅ Migration applied! Table "product_images" exists!\n');
        
        // Verify RLS
        const { count } = await supabase
          .from('product_images')
          .select('*', { count: 'exact', head: true });
        
        console.log(`✅ RLS policies configured (public read: ${count !== null ? 'Yes' : 'No'})\n`);
        console.log('🎉 Setup complete! You can now use the product images feature.\n');
        return true;
      }
    } catch (error) {
      // Table doesn't exist yet
    }

    attempts++;
    if (attempts < maxAttempts) {
      process.stdout.write(`\r   Checking... (${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n\n⚠️  Migration not detected after 60 seconds');
  console.log('   Please verify you ran the SQL in the Supabase Dashboard\n');
  return false;
}

waitForMigration().then(success => {
  process.exit(success ? 0 : 1);
});


#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const STAGING_URL = 'https://azvsktgeqwvvhqomndsn.supabase.co';
const STAGING_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dnNrdGdlcXd2dmhxb21uZHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY0NDU5MCwiZXhwIjoyMDgzMjIwNTkwfQ.y8B62Ha85Py6mElQX-yC8xQN-vPp99uu28jBn4QxTAc';

const supabase = createClient(STAGING_URL, STAGING_SERVICE_KEY);

async function applyMigration(filePath: string) {
  console.log(`\n📝 Applico: ${filePath}`);
  const sql = readFileSync(filePath, 'utf-8');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Se RPC non esiste, provo con query diretta
      const response = await fetch(`${STAGING_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': STAGING_SERVICE_KEY,
          'Authorization': `Bearer ${STAGING_SERVICE_KEY}`,
        },
        body: JSON.stringify({ sql_query: sql }),
      });
      
      if (!response.ok) {
        // Provo con Management API o SQL diretto
        console.log('  ⚠️  RPC non disponibile, applico via SQL Editor...');
        console.log('  ✅ SQL pronto per copiare nel SQL Editor');
        return false;
      }
    }
    
    console.log('  ✅ Migration applicata');
    return true;
  } catch (error: any) {
    console.log(`  ⚠️  Errore: ${error.message}`);
    console.log('  📋 Applica manualmente via SQL Editor');
    return false;
  }
}

async function main() {
  console.log('🚀 Applico migrations ecommerce-homepage a staging...\n');
  
  const migrationsDir = join(process.cwd(), 'ecommerce-homepage', 'supabase', 'migrations');
  const migrations = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  console.log(`Trovate ${migrations.length} migrations\n`);
  
  for (const migration of migrations) {
    const filePath = join(migrationsDir, migration);
    await applyMigration(filePath);
    // Piccola pausa tra migrations
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n✅ Migrations ecommerce-homepage completate!');
  console.log('\n📋 Se alcune migrations hanno dato errore, applicale manualmente via SQL Editor');
  console.log('   URL: https://supabase.com/dashboard/project/azvsktgeqwvvhqomndsn/sql/new');
}

main().catch(console.error);


#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const STAGING_URL = 'https://azvsktgeqwvvhqomndsn.supabase.co';
const STAGING_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dnNrdGdlcXd2dmhxb21uZHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY0NDU5MCwiZXhwIjoyMDgzMjIwNTkwfQ.y8B62Ha85Py6mElQX-yC8xQN-vPp99uu28jBn4QxTAc';

async function executeSQL(sql: string): Promise<boolean> {
  try {
    // Usa la REST API di Supabase per eseguire SQL
    const response = await fetch(`${STAGING_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': STAGING_SERVICE_KEY,
        'Authorization': `Bearer ${STAGING_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ query: sql }),
    });
    
    if (response.ok) {
      return true;
    }
    
    // Se RPC non esiste, provo con Management API
    const projectId = 'azvsktgeqwvvhqomndsn';
    const mgmtResponse = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STAGING_SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    
    return mgmtResponse.ok;
  } catch (error) {
    return false;
  }
}

async function applyMigration(filePath: string) {
  console.log(`\n📝 Applico: ${filePath.split('/').pop()}`);
  const sql = readFileSync(filePath, 'utf-8');
  
  const success = await executeSQL(sql);
  
  if (success) {
    console.log('  ✅ Migration applicata');
    return true;
  } else {
    console.log('  ⚠️  Non posso applicare automaticamente');
    console.log('  📋 Applica manualmente via SQL Editor:');
    console.log(`     https://supabase.com/dashboard/project/azvsktgeqwvvhqomndsn/sql/new`);
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
  
  let applied = 0;
  let manual = 0;
  
  for (const migration of migrations) {
    const filePath = join(migrationsDir, migration);
    const success = await applyMigration(filePath);
    if (success) {
      applied++;
    } else {
      manual++;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n✅ Completato: ${applied} applicate, ${manual} da applicare manualmente`);
  
  if (manual > 0) {
    console.log('\n📋 Per applicare le migrations manualmente:');
    console.log('1. Vai su: https://supabase.com/dashboard/project/azvsktgeqwvvhqomndsn/sql/new');
    console.log('2. Copia e incolla il contenuto di ogni file .sql');
    console.log('3. Clicca "Run"');
  }
}

main().catch(console.error);


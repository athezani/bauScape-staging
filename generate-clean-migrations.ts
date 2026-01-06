#!/usr/bin/env tsx

/**
 * Genera migrations pulite basate sullo schema attuale di produzione
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const PROD_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const PROD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTg0NDU5MCwiZXhwIjoyMDgzMjIwNTkwfQ.REPLACE_WITH_ACTUAL_KEY';

const supabase = createClient(PROD_URL, PROD_SERVICE_KEY);

async function executeSQL(sql: string): Promise<any> {
  try {
    // Provo con REST API
    const response = await fetch(`${PROD_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': PROD_SERVICE_KEY,
        'Authorization': `Bearer ${PROD_SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    // Ignora
  }
  
  return null;
}

async function getTables(): Promise<string[]> {
  const sql = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  
  const result = await executeSQL(sql);
  
  if (result && Array.isArray(result)) {
    return result.map((r: any) => r.table_name);
  }
  
  // Fallback: ritorna lista hardcoded basata su quello che sappiamo
  return [
    'experience',
    'class', 
    'trip',
    'booking',
    'cancellation_request',
    'user_roles',
    'signup_codes',
    'product_faq',
    'quotation',
    'trip_program_day',
    'trip_program_item',
    'availability_slot',
    'product_images',
    'rate_limits',
  ];
}

async function getTableColumns(tableName: string): Promise<any[]> {
  const sql = `
    SELECT 
      column_name,
      data_type,
      udt_name,
      character_maximum_length,
      is_nullable,
      column_default,
      ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = '${tableName}'
    ORDER BY ordinal_position;
  `;
  
  const result = await executeSQL(sql);
  return result || [];
}

async function generateTableDDL(tableName: string, columns: any[]): Promise<string> {
  if (columns.length === 0) {
    return `-- Table ${tableName} (no columns found)`;
  }
  
  let ddl = `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;
  
  const columnDefs = columns.map(col => {
    let def = `  ${col.column_name} `;
    
    // Data type
    if (col.data_type === 'USER-DEFINED') {
      def += col.udt_name;
    } else if (col.data_type === 'ARRAY') {
      def += col.udt_name.replace('_', '') + '[]';
    } else {
      def += col.data_type;
      if (col.character_maximum_length) {
        def += `(${col.character_maximum_length})`;
      }
    }
    
    // NOT NULL
    if (col.is_nullable === 'NO') {
      def += ' NOT NULL';
    }
    
    // DEFAULT
    if (col.column_default) {
      def += ` DEFAULT ${col.column_default}`;
    }
    
    return def;
  });
  
  ddl += columnDefs.join(',\n');
  ddl += '\n);';
  
  return ddl;
}

async function main() {
  console.log('🚀 Generazione migrations pulite da schema produzione...\n');
  
  const tables = await getTables();
  console.log(`📋 Trovate ${tables.length} tabelle\n`);
  
  const migrationsDir = join(process.cwd(), 'baux-paws-access', 'supabase', 'migrations-clean');
  if (!existsSync(migrationsDir)) {
    mkdirSync(migrationsDir, { recursive: true });
  }
  
  // Genera migration principale con tutte le tabelle
  const migrationFile = join(migrationsDir, '00000000000000_complete_schema.sql');
  let migrationContent = `-- ============================================
-- Complete Schema Migration
-- Generated from production database
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

`;

  for (const table of tables) {
    console.log(`📝 Processando tabella: ${table}`);
    const columns = await getTableColumns(table);
    
    if (columns.length > 0) {
      const ddl = await generateTableDDL(table, columns);
      migrationContent += `\n-- Table: ${table}\n${ddl}\n\n`;
    } else {
      migrationContent += `\n-- Table: ${table} (columns not found, check manually)\n\n`;
    }
    
    // Piccola pausa
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  writeFileSync(migrationFile, migrationContent);
  console.log(`\n✅ Migration generata: ${migrationFile}`);
  console.log(`\n⚠️  NOTA: Questo è uno schema base. Potrebbero mancare:`);
  console.log(`   - Indexes`);
  console.log(`   - Foreign keys`);
  console.log(`   - Constraints`);
  console.log(`   - Triggers`);
  console.log(`   - RLS policies`);
  console.log(`   - Functions`);
  console.log(`\n📋 Verifica e completa manualmente se necessario.`);
}

main().catch(console.error);


#!/usr/bin/env tsx

/**
 * Genera migrations complete usando Management API di Supabase
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const PROD_PROJECT_ID = 'zyonwzilijgnnnmhxvbo';
const PROD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI';

async function executeSQL(sql: string): Promise<any> {
  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROD_PROJECT_ID}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROD_SERVICE_KEY}`,
        'apikey': PROD_SERVICE_KEY,
      },
      body: JSON.stringify({ query: sql }),
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    const text = await response.text();
    console.log(`⚠️  Errore Management API: ${response.status}`);
    console.log(`   ${text.substring(0, 300)}`);
  } catch (error: any) {
    console.log(`⚠️  Errore: ${error.message}`);
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
    return result.map((r: any) => r.table_name || Object.values(r)[0] as string);
  }
  
  return [];
}

async function getTableStructure(tableName: string): Promise<any[]> {
  const sql = `
    SELECT 
      column_name,
      data_type,
      udt_name,
      character_maximum_length,
      numeric_precision,
      numeric_scale,
      is_nullable,
      column_default,
      ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = '${tableName}'
    ORDER BY ordinal_position;
  `;
  
  return await executeSQL(sql) || [];
}

async function getPrimaryKeys(tableName: string): Promise<string[]> {
  const sql = `
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'public.${tableName}'::regclass
    AND i.indisprimary;
  `;
  
  const result = await executeSQL(sql);
  return result && Array.isArray(result) ? result.map((r: any) => r.attname || Object.values(r)[0] as string) : [];
}

async function getForeignKeys(tableName: string): Promise<any[]> {
  const sql = `
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = '${tableName}';
  `;
  
  return await executeSQL(sql) || [];
}

async function generateTableDDL(tableName: string, columns: any[], primaryKeys: string[], foreignKeys: any[]): Promise<string> {
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
      def += col.udt_name?.replace('_', '') + '[]';
    } else {
      def += col.data_type;
      if (col.character_maximum_length) {
        def += `(${col.character_maximum_length})`;
      } else if (col.numeric_precision) {
        def += `(${col.numeric_precision}${col.numeric_scale ? ',' + col.numeric_scale : ''})`;
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
  
  // Primary key
  if (primaryKeys.length > 0) {
    ddl += `,\n  PRIMARY KEY (${primaryKeys.join(', ')})`;
  }
  
  ddl += '\n);';
  
  // Foreign keys
  if (foreignKeys.length > 0) {
    ddl += '\n\n';
    for (const fk of foreignKeys) {
      ddl += `ALTER TABLE public.${tableName}\n`;
      ddl += `  ADD CONSTRAINT ${fk.constraint_name}\n`;
      ddl += `  FOREIGN KEY (${fk.column_name})\n`;
      ddl += `  REFERENCES public.${fk.foreign_table_name}(${fk.foreign_column_name});\n\n`;
    }
  }
  
  return ddl;
}

async function getAllEnums(): Promise<string> {
  const sql = `
    SELECT 
      t.typname as enum_name,
      array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname;
  `;
  
  const result = await executeSQL(sql);
  
  if (result && Array.isArray(result)) {
    return result.map((r: any) => {
      const name = r.enum_name || Object.values(r)[0];
      const values = Array.isArray(r.enum_values) ? r.enum_values : [];
      return `CREATE TYPE IF NOT EXISTS public.${name} AS ENUM (${values.map((v: string) => `'${v}'`).join(', ')});`;
    }).join('\n\n');
  }
  
  return '-- Enums (could not generate)';
}

async function main() {
  console.log('🚀 Generazione migrations complete da produzione...\n');
  
  const migrationsDir = join(process.cwd(), 'baux-paws-access', 'supabase', 'migrations-clean');
  if (!existsSync(migrationsDir)) {
    mkdirSync(migrationsDir, { recursive: true });
  }
  
  let migrationContent = `-- ============================================
-- Complete Schema Migration from Production
-- Generated: ${new Date().toISOString()}
-- Source: ${PROD_PROJECT_ID} (production)
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

`;

  // Step 1: Enums
  console.log('📝 Generando ENUMs...');
  const enums = await getAllEnums();
  migrationContent += `-- ============================================
-- ENUMS
-- ============================================

${enums}

`;

  // Step 2: Helper Functions
  console.log('📝 Aggiungendo helper functions...');
  migrationContent += `-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

`;

  // Step 3: Tables
  console.log('📝 Generando tabelle...');
  const tables = await getTables();
  console.log(`   Trovate ${tables.length} tabelle\n`);
  
  migrationContent += `-- ============================================
-- TABLES
-- ============================================

`;
  
  for (const table of tables) {
    console.log(`   Processando: ${table}`);
    const columns = await getTableStructure(table);
    const primaryKeys = await getPrimaryKeys(table);
    const foreignKeys = await getForeignKeys(table);
    
    const ddl = await generateTableDDL(table, columns, primaryKeys, foreignKeys);
    migrationContent += `-- Table: ${table}\n${ddl}\n\n`;
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Salva migration
  const migrationFile = join(migrationsDir, '00000000000000_complete_schema_from_production.sql');
  writeFileSync(migrationFile, migrationContent);
  
  console.log(`\n✅ Migration completa generata: ${migrationFile}`);
  console.log(`\n📋 Prossimi passi:`);
  console.log(`1. Verifica il file generato`);
  console.log(`2. Applica a staging`);
}

main().catch(console.error);


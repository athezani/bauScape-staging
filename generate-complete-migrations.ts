#!/usr/bin/env tsx

/**
 * Genera migrations complete e pulite basate sullo schema attuale di produzione
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const PROD_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const PROD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI';

const supabase = createClient(PROD_URL, PROD_SERVICE_KEY);

async function executeSQL(sql: string): Promise<any> {
  try {
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
    
    const text = await response.text();
    console.log(`⚠️  Errore API: ${response.status} - ${text.substring(0, 200)}`);
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
  
  if (result && Array.isArray(result) && result.length > 0) {
    return result.map((r: any) => r.table_name || Object.values(r)[0]);
  }
  
  console.log('⚠️  Non posso ottenere tabelle via API, uso lista hardcoded');
  return [];
}

async function getTableDDL(tableName: string): Promise<string> {
  // Usa pg_get_tabledef se disponibile, altrimenti costruisci manualmente
  const sql = `
    SELECT 
      'CREATE TABLE ' || quote_ident(schemaname) || '.' || quote_ident(tablename) || ' (' ||
      string_agg(
        quote_ident(attname) || ' ' ||
        pg_catalog.format_type(atttypid, attnum) ||
        CASE WHEN attnotnull THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN atthasdef THEN ' DEFAULT ' || pg_get_expr(adbin, adrelid) ELSE '' END,
        E',\n  ' ORDER BY attnum
      ) ||
      ');' as ddl
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    LEFT JOIN pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
    WHERE n.nspname = 'public'
    AND c.relname = '${tableName}'
    AND a.attnum > 0
    AND NOT a.attisdropped
    GROUP BY schemaname, tablename;
  `;
  
  const result = await executeSQL(sql);
  
  if (result && result.length > 0) {
    return result[0].ddl || '';
  }
  
  return `-- Table ${tableName} (could not generate DDL automatically)`;
}

async function getAllEnums(): Promise<string> {
  const sql = `
    SELECT 
      'CREATE TYPE ' || quote_ident(n.nspname) || '.' || quote_ident(t.typname) || ' AS ENUM (' ||
      string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) ||
      ');' as ddl
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    GROUP BY n.nspname, t.typname
    ORDER BY t.typname;
  `;
  
  const result = await executeSQL(sql);
  
  if (result && Array.isArray(result)) {
    return result.map((r: any) => r.ddl || Object.values(r)[0]).join('\n\n');
  }
  
  return '-- Enums (could not generate automatically)';
}

async function getAllFunctions(): Promise<string> {
  const sql = `
    SELECT 
      pg_get_functiondef(p.oid) as ddl
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY p.proname;
  `;
  
  const result = await executeSQL(sql);
  
  if (result && Array.isArray(result)) {
    return result.map((r: any) => r.ddl || Object.values(r)[0]).join('\n\n');
  }
  
  return '-- Functions (could not generate automatically)';
}

async function getAllIndexes(): Promise<string> {
  const sql = `
    SELECT 
      indexdef as ddl
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey'
    ORDER BY tablename, indexname;
  `;
  
  const result = await executeSQL(sql);
  
  if (result && Array.isArray(result)) {
    return result.map((r: any) => r.ddl || Object.values(r)[0]).join(';\n') + ';';
  }
  
  return '-- Indexes (could not generate automatically)';
}

async function getAllRLSPolicies(): Promise<string> {
  const sql = `
    SELECT 
      'CREATE POLICY ' || quote_ident(p.policyname) || ' ON ' || 
      quote_ident(p.schemaname) || '.' || quote_ident(p.tablename) ||
      ' FOR ' || p.cmd ||
      CASE WHEN p.qual IS NOT NULL THEN ' USING (' || p.qual || ')' ELSE '' END ||
      CASE WHEN p.with_check IS NOT NULL THEN ' WITH CHECK (' || p.with_check || ')' ELSE '' END ||
      ';' as ddl
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    ORDER BY p.tablename, p.policyname;
  `;
  
  const result = await executeSQL(sql);
  
  if (result && Array.isArray(result)) {
    return result.map((r: any) => r.ddl || Object.values(r)[0]).join('\n\n');
  }
  
  return '-- RLS Policies (could not generate automatically)';
}

async function main() {
  console.log('🚀 Generazione migrations complete da schema produzione...\n');
  
  const migrationsDir = join(process.cwd(), 'baux-paws-access', 'supabase', 'migrations-clean');
  if (!existsSync(migrationsDir)) {
    mkdirSync(migrationsDir, { recursive: true });
  }
  
  let migrationContent = `-- ============================================
-- Complete Schema Migration from Production
-- Generated: ${new Date().toISOString()}
-- Source: zyonwzilijgnnnmhxvbo (production)
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
  console.log('📝 Generando helper functions...');
  migrationContent += `-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function: set_updated_at
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
  console.log(`   Trovate ${tables.length} tabelle`);
  
  migrationContent += `-- ============================================
-- TABLES
-- ============================================

`;
  
  for (const table of tables) {
    console.log(`   Processando: ${table}`);
    const ddl = await getTableDDL(table);
    migrationContent += `-- Table: ${table}\n${ddl}\n\n`;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Step 4: Indexes
  console.log('📝 Generando indexes...');
  const indexes = await getAllIndexes();
  migrationContent += `-- ============================================
-- INDEXES
-- ============================================

${indexes}

`;

  // Step 5: Foreign Keys (se necessario, aggiungi qui)
  migrationContent += `-- ============================================
-- FOREIGN KEYS
-- ============================================
-- (Add foreign key constraints here if needed)

`;

  // Step 6: Functions
  console.log('📝 Generando functions...');
  const functions = await getAllFunctions();
  migrationContent += `-- ============================================
-- FUNCTIONS
-- ============================================

${functions}

`;

  // Step 7: Triggers
  migrationContent += `-- ============================================
-- TRIGGERS
-- ============================================
-- (Add triggers here if needed)

`;

  // Step 8: RLS Policies
  console.log('📝 Generando RLS policies...');
  const policies = await getAllRLSPolicies();
  migrationContent += `-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE IF EXISTS public.experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trip ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cancellation_request ENABLE ROW LEVEL SECURITY;

${policies}

`;

  // Salva migration
  const migrationFile = join(migrationsDir, '00000000000000_complete_schema_from_production.sql');
  writeFileSync(migrationFile, migrationContent);
  
  console.log(`\n✅ Migration completa generata: ${migrationFile}`);
  console.log(`\n📋 Prossimi passi:`);
  console.log(`1. Verifica il file generato`);
  console.log(`2. Applica a staging via SQL Editor o supabase db push`);
}

main().catch(console.error);


#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const PROD_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const PROD_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!PROD_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trovata!');
  console.error('   Export SUPABASE_SERVICE_ROLE_KEY=your_key');
  process.exit(1);
}

const supabase = createClient(PROD_URL, PROD_SERVICE_KEY);

async function getTables() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `,
  });
  
  if (error) {
    // Fallback: usa query diretta
    const response = await fetch(`${PROD_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': PROD_SERVICE_KEY,
        'Authorization': `Bearer ${PROD_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        sql_query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `,
      }),
    });
    
    if (!response.ok) {
      console.log('⚠️  Non posso eseguire query direttamente');
      console.log('📋 Usa questo SQL nel SQL Editor di produzione:');
      console.log(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
      return null;
    }
  }
  
  return data;
}

async function getTableDDL(tableName: string) {
  const sql = `
    SELECT 
      'CREATE TABLE ' || quote_ident(table_name) || ' (' ||
      string_agg(
        quote_ident(column_name) || ' ' || 
        CASE 
          WHEN data_type = 'USER-DEFINED' THEN udt_name
          WHEN data_type = 'ARRAY' THEN udt_name || '[]'
          ELSE data_type
        END ||
        CASE WHEN character_maximum_length IS NOT NULL 
          THEN '(' || character_maximum_length || ')'
          ELSE ''
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL 
          THEN ' DEFAULT ' || column_default
          ELSE ''
        END,
        ', '
        ORDER BY ordinal_position
      ) ||
      ');' as ddl
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = $1
    GROUP BY table_name;
  `;
  
  // Non posso eseguire query parametrizzate facilmente
  // Uso un approccio diverso
  return null;
}

async function main() {
  console.log('🚀 Esportazione schema produzione...\n');
  console.log('⚠️  Questo richiede accesso diretto al database.');
  console.log('📋 Approccio alternativo: usa pg_dump o SQL Editor\n');
  
  console.log('Opzione 1: Via Supabase Dashboard');
  console.log('1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new');
  console.log('2. Esegui questo SQL per vedere tutte le tabelle:');
  console.log(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  console.log('\nOpzione 2: Via pg_dump (se hai accesso)');
  console.log('   pg_dump -h db.zyonwzilijgnnnmhxvbo.supabase.co -U postgres -d postgres --schema-only > production-schema.sql');
}

main();


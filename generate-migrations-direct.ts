#!/usr/bin/env tsx

/**
 * Genera migrations complete interrogando direttamente il database
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const PROD_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const PROD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI';

const supabase = createClient(PROD_URL, PROD_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function querySQL(sql: string): Promise<any> {
  // Usa PostgREST per query semplici, altrimenti fallback
  try {
    // Per query SELECT semplici, posso usare direttamente le tabelle
    // Ma per query complesse, devo usare un altro metodo
    
    // Provo con una query diretta usando fetch
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

async function getTablesViaClient(): Promise<string[]> {
  // Provo a leggere da una tabella di sistema se disponibile
  // Altrimenti uso lista hardcoded basata su quello che sappiamo
  
  const knownTables = [
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
  
  return knownTables;
}

async function getTableColumns(tableName: string): Promise<any[]> {
  // Non posso interrogare information_schema direttamente via REST API
  // Devo usare un approccio diverso
  
  // Provo a leggere la tabella stessa per vedere le colonne
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);
    
    if (!error && data) {
      // Posso dedurre le colonne dal tipo di risposta
      // Ma questo non mi dà i tipi esatti
      return [];
    }
  } catch (error) {
    // Ignora
  }
  
  return [];
}

async function main() {
  console.log('🚀 Generazione migrations da produzione...\n');
  console.log('⚠️  L\'API REST non permette query SQL arbitrarie.');
  console.log('📋 Uso approccio alternativo:\n');
  
  console.log('Opzione 1: Forniscimi la CONNECTION STRING di produzione');
  console.log('   Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/settings/database');
  console.log('   Copia "Connection string" (URI format)');
  console.log('   Poi esegui: ./generate-migration-from-dump.sh "<connection-string>"\n');
  
  console.log('Opzione 2: Esporta manualmente via SQL Editor');
  console.log('   1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new');
  console.log('   2. Esegui: SELECT * FROM information_schema.tables WHERE table_schema = \'public\';');
  console.log('   3. Copia i risultati\n');
  
  console.log('Opzione 3: Usa Supabase CLI (se hai Docker)');
  console.log('   cd baux-paws-access');
  console.log('   supabase link --project-ref zyonwzilijgnnnmhxvbo');
  console.log('   supabase db dump --schema public -f production-schema.sql\n');
}

main();


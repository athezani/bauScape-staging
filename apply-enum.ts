#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://azvsktgeqwvvhqomndsn.supabase.co';
const STAGING_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dnNrdGdlcXd2dmhxb21uZHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY0NDU5MCwiZXhwIjoyMDgzMjIwNTkwfQ.y8B62Ha85Py6mElQX-yC8xQN-vPp99uu28jBn4QxTAc';

const supabase = createClient(STAGING_URL, STAGING_SERVICE_KEY);

async function main() {
  console.log('🚀 Applico product_type enum...\n');
  
  const sql = `CREATE TYPE IF NOT EXISTS public.product_type AS ENUM ('experience', 'trip', 'class');`;
  
  try {
    // Provo con query diretta
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.log('⚠️  Non posso applicare automaticamente');
      console.log('📋 Applica manualmente nel SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/azvsktgeqwvvhqomndsn/sql/new\n');
      console.log('SQL:');
      console.log(sql);
      return;
    }
    
    console.log('✅ Enum creato!');
  } catch (error: any) {
    console.log('⚠️  Errore:', error.message);
    console.log('📋 Applica manualmente nel SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/azvsktgeqwvvhqomndsn/sql/new\n');
    console.log('SQL:');
    console.log(sql);
  }
}

main();


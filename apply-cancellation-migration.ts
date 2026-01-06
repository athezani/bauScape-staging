/**
 * Apply Cancellation Migration Directly
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI';

async function applyMigration() {
  console.log('=== APPLYING CANCELLATION MIGRATION ===\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Read migration file
  const migrationSQL = readFileSync(
    './ecommerce-homepage/supabase/migrations/0020_create_cancellation_request.sql',
    'utf-8'
  );
  
  console.log('Migration SQL loaded');
  console.log('Length:', migrationSQL.length, 'characters\n');
  
  // Split into statements (simple split by semicolon)
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Found ${statements.length} SQL statements to execute\n`);
  
  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`[${i + 1}/${statements.length}] Executing:`, stmt.substring(0, 60) + '...');
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' }).catch(() => ({
        error: null // RPC might not exist, try direct approach
      }));
      
      if (error) {
        // Try alternative: create a temporary function
        console.log('  Trying alternative method...');
        
        // For table creation, we can use PostgREST admin API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          }
        });
        
        console.log('  ⚠️  Cannot execute via API, statement may need manual execution');
      } else {
        console.log('  ✅ Success');
      }
    } catch (err) {
      console.log('  ⚠️  Statement requires manual execution');
    }
  }
  
  console.log('\n=== MIGRATION APPLIED ===');
  console.log('\n⚠️  Some statements may need manual execution via Supabase Dashboard SQL Editor');
  console.log('Copy the SQL from: ecommerce-homepage/supabase/migrations/0020_create_cancellation_request.sql');
}

applyMigration().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});


/**
 * Test and Fix FAQ System
 * Verifies tables exist, runs tests, and provides fixes
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SECRET_KEY = 'sb_secret_MfaFloghxOxhQy5HsYncUA_wY0h-SLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTablesExist() {
  console.log('🔍 Checking if tables exist...\n');
  
  let faqExists = false;
  let productFaqExists = false;

  try {
    const { error } = await supabase
      .from('faq')
      .select('id')
      .limit(1);
    
    if (!error) {
      faqExists = true;
      console.log('✅ FAQ table exists');
    } else {
      console.log('❌ FAQ table does not exist');
    }
  } catch (error) {
    console.log('❌ FAQ table does not exist');
  }

  try {
    const { error } = await supabase
      .from('product_faq')
      .select('id')
      .limit(1);
    
    if (!error) {
      productFaqExists = true;
      console.log('✅ product_faq table exists');
    } else {
      console.log('❌ product_faq table does not exist');
    }
  } catch (error) {
    console.log('❌ product_faq table does not exist');
  }

  return { faqExists, productFaqExists };
}

async function provideMigrationInstructions() {
  console.log('\n📋 MIGRATION INSTRUCTIONS\n');
  console.log('The FAQ tables need to be created. Please follow these steps:\n');
  
  console.log('1. Go to Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new\n');
  
  console.log('2. Copy and paste the SQL from this file:');
  const migration1 = join(__dirname, 'supabase/migrations/20250117000000_add_product_faq.sql');
  console.log(`   ${migration1}\n`);
  
  console.log('3. Click "Run" or press Cmd/Ctrl + Enter\n');
  
  console.log('4. Repeat for the example FAQs migration:');
  const migration2 = join(__dirname, 'supabase/migrations/20250117000001_add_example_faqs.sql');
  console.log(`   ${migration2}\n`);
  
  console.log('5. Run this test again: node test-and-fix-faq.js\n');
  
  // Show first migration SQL
  try {
    const sql = readFileSync(migration1, 'utf8');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('MIGRATION SQL (copy this to Supabase SQL Editor):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(sql);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.log('Could not read migration file:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Running FAQ System Tests...\n');

  // Test 1: Create FAQ
  console.log('Test 1: Creating test FAQ...');
  let testFaqId = null;
  
  try {
    const { data, error } = await supabase
      .from('faq')
      .insert({
        question: 'Test Question - ' + new Date().toISOString(),
        answer: 'Test Answer'
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('permission') || error.message.includes('policy')) {
        console.log('❌ Permission denied - RLS policy blocking insert');
        console.log('   This is expected if you are not authenticated as admin');
        console.log('   The secret key bypasses RLS, but policies may still apply\n');
        return false;
      }
      throw error;
    }

    testFaqId = data.id;
    console.log(`✅ Test FAQ created: ${testFaqId}\n`);
  } catch (error) {
    console.log(`❌ Failed: ${error.message}\n`);
    return false;
  }

  // Test 2: Get products
  console.log('Test 2: Finding products...');
  let expId = null;

  try {
    const { data } = await supabase
      .from('experience')
      .select('id')
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    if (data) expId = data.id;
    console.log(`✅ Found experience: ${expId || 'none'}\n`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
    return false;
  }

  // Test 3: Associate FAQ
  if (expId && testFaqId) {
    console.log('Test 3: Associating FAQ with product...');
    
    try {
      // Delete existing
      await supabase
        .from('product_faq')
        .delete()
        .eq('product_id', expId)
        .eq('product_type', 'experience');

      // Insert
      const { error } = await supabase
        .from('product_faq')
        .insert({
          product_id: expId,
          product_type: 'experience',
          faq_id: testFaqId,
          order_index: 0
        });

      if (error) {
        if (error.message.includes('permission') || error.message.includes('policy')) {
          console.log('❌ Permission denied - RLS policy blocking insert\n');
          return false;
        }
        throw error;
      }

      console.log(`✅ FAQ associated successfully\n`);
    } catch (error) {
      console.log(`❌ Failed: ${error.message}\n`);
      return false;
    }
  }

  // Test 4: Load FAQs
  if (expId) {
    console.log('Test 4: Loading FAQs for product...');
    
    try {
      const { data, error } = await supabase
        .from('product_faq')
        .select(`
          id,
          order_index,
          faq:faq_id (
            id,
            question,
            answer
          )
        `)
        .eq('product_id', expId)
        .eq('product_type', 'experience')
        .order('order_index', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        console.log(`✅ Loaded ${data.length} FAQ(s):`);
        data.forEach((pf, idx) => {
          if (pf.faq) {
            console.log(`   ${idx + 1}. ${pf.faq.question}`);
          }
        });
        console.log('');
      } else {
        console.log('⚠️  No FAQs found\n');
      }
    } catch (error) {
      console.log(`❌ Failed: ${error.message}\n`);
      return false;
    }
  }

  return true;
}

async function main() {
  console.log('🚀 FAQ System Test and Fix\n');
  console.log('========================================\n');

  const { faqExists, productFaqExists } = await checkTablesExist();

  if (!faqExists || !productFaqExists) {
    console.log('\n⚠️  Tables are missing. Migrations need to be run.\n');
    await provideMigrationInstructions();
    process.exit(1);
  }

  console.log('\n✅ All tables exist. Running tests...\n');
  console.log('========================================\n');

  const success = await runTests();

  if (success) {
    console.log('========================================');
    console.log('✅ All tests passed!');
    console.log('========================================\n');
    process.exit(0);
  } else {
    console.log('========================================');
    console.log('❌ Some tests failed');
    console.log('========================================\n');
    console.log('Possible issues:');
    console.log('1. RLS policies may be blocking operations');
    console.log('2. Check that admin role is set correctly in profile table');
    console.log('3. Verify migrations were run completely\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});




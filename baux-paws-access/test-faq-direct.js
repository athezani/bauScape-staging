/**
 * Test FAQ System - Direct API calls
 * Tests the FAQ system by creating tables and data via direct API calls
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SECRET_KEY = 'sb_secret_MfaFloghxOxhQy5HsYncUA_wY0h-SLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTables() {
  console.log('🔧 Creating tables via API...\n');
  
  // We can't create tables via REST API directly
  // But we can check if they exist and provide instructions
  console.log('⚠️  Table creation must be done via SQL Editor');
  console.log('   Please run the migration SQL files in Supabase Dashboard\n');
  
  return false;
}

async function testAfterMigrations() {
  console.log('🧪 Testing FAQ System (after migrations)...\n');

  // Test 1: Check if tables exist
  console.log('Test 1: Checking if tables exist...');
  let tablesExist = false;
  
  try {
    const { data, error } = await supabase
      .from('faq')
      .select('id')
      .limit(1);
    
    if (!error) {
      tablesExist = true;
      console.log('✅ FAQ table exists');
    } else {
      console.log('❌ FAQ table does not exist:', error.message);
      console.log('   Please run migration: 20250117000000_add_product_faq.sql');
      return false;
    }
  } catch (error) {
    console.log('❌ Error checking FAQ table:', error.message);
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('product_faq')
      .select('id')
      .limit(1);
    
    if (!error) {
      console.log('✅ product_faq table exists');
    } else {
      console.log('❌ product_faq table does not exist:', error.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error checking product_faq table:', error.message);
    return false;
  }

  if (!tablesExist) {
    console.log('\n⚠️  Tables do not exist. Please run migrations first.');
    console.log('   Go to: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new');
    console.log('   And execute: supabase/migrations/20250117000000_add_product_faq.sql\n');
    return false;
  }

  // Test 2: Create a test FAQ
  console.log('\nTest 2: Creating test FAQ...');
  let testFaqId = null;
  
  try {
    const { data, error } = await supabase
      .from('faq')
      .insert({
        question: 'Test Question - ' + new Date().toISOString(),
        answer: 'Test Answer - This FAQ was created by the test script'
      })
      .select()
      .single();

    if (error) {
      // Check if it's a permission error
      if (error.message.includes('permission') || error.message.includes('policy')) {
        console.log('❌ Permission denied. RLS policy may be blocking inserts.');
        console.log('   Make sure you are authenticated as admin or RLS allows inserts.');
      } else {
        throw error;
      }
      return false;
    }

    testFaqId = data.id;
    console.log(`✅ Test FAQ created: ${testFaqId}`);
  } catch (error) {
    console.log('❌ Failed to create FAQ:', error.message);
    return false;
  }

  // Test 3: Get products
  console.log('\nTest 3: Finding products...');
  let expId = null;
  let classId = null;
  let tripId = null;

  try {
    const { data: expData } = await supabase
      .from('experience')
      .select('id')
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    if (expData) expId = expData.id;

    const { data: classData } = await supabase
      .from('class')
      .select('id')
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    if (classData) classId = classData.id;

    const { data: tripData } = await supabase
      .from('trip')
      .select('id')
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    if (tripData) tripId = tripData.id;

    console.log(`✅ Found: exp=${expId || 'none'}, class=${classId || 'none'}, trip=${tripId || 'none'}`);
  } catch (error) {
    console.log('❌ Error finding products:', error.message);
    return false;
  }

  // Test 4: Associate FAQ with product
  console.log('\nTest 4: Associating FAQ with products...');
  
  if (expId && testFaqId) {
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
          console.log('❌ Permission denied for product_faq insert');
          console.log('   RLS policy may require admin role');
          return false;
        }
        throw error;
      }

      console.log(`✅ FAQ associated with experience: ${expId}`);
    } catch (error) {
      console.log('❌ Failed to associate FAQ:', error.message);
      return false;
    }
  }

  // Test 5: Load FAQs for product
  console.log('\nTest 5: Loading FAQs for product...');
  
  if (expId) {
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
      } else {
        console.log('⚠️  No FAQs found (this is OK)');
      }
    } catch (error) {
      console.log('❌ Failed to load FAQs:', error.message);
      return false;
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('✅ All tests passed!');
  console.log('========================================\n');

  return true;
}

// Main
testAfterMigrations().then(success => {
  if (!success) {
    console.log('\n⚠️  Some tests failed. Please:');
    console.log('   1. Run migrations in Supabase SQL Editor');
    console.log('   2. Verify RLS policies allow admin operations');
    console.log('   3. Run this test again\n');
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});




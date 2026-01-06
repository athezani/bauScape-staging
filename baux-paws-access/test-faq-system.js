/**
 * Test FAQ System End-to-End
 * Uses Supabase secret key to test all FAQ functionality
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

async function testFAQSystem() {
  console.log('🧪 Starting FAQ System Tests...\n');

  let allTestsPassed = true;

  // Test 1: Verify tables exist
  console.log('Test 1: Verifying tables exist...');
  try {
    const { data: faqData, error: faqError } = await supabase
      .from('faq')
      .select('id')
      .limit(1);

    if (faqError) {
      throw new Error(`FAQ table error: ${faqError.message}`);
    }

    const { data: productFaqData, error: productFaqError } = await supabase
      .from('product_faq')
      .select('id')
      .limit(1);

    if (productFaqError) {
      throw new Error(`Product FAQ table error: ${productFaqError.message}`);
    }

    console.log('✅ Tables exist\n');
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
    allTestsPassed = false;
  }

  // Test 2: Create a test FAQ
  console.log('Test 2: Creating test FAQ...');
  let testFaqId = null;
  try {
    const { data, error } = await supabase
      .from('faq')
      .insert({
        question: 'Test Question - ' + new Date().toISOString(),
        answer: 'Test Answer - This is a test FAQ created by the test script'
      })
      .select()
      .single();

    if (error) throw error;
    testFaqId = data.id;
    console.log(`✅ Test FAQ created with ID: ${testFaqId}\n`);
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    allTestsPassed = false;
  }

  // Test 3: Get existing products
  console.log('Test 3: Finding products to associate FAQs...');
  let expId = null;
  let classId = null;
  let tripId = null;

  try {
    const { data: expData } = await supabase
      .from('experience')
      .select('id')
      .eq('active', true)
      .limit(1)
      .single();

    if (expData) expId = expData.id;

    const { data: classData } = await supabase
      .from('class')
      .select('id')
      .eq('active', true)
      .limit(1)
      .single();

    if (classData) classId = classData.id;

    const { data: tripData } = await supabase
      .from('trip')
      .select('id')
      .eq('active', true)
      .limit(1)
      .single();

    if (tripData) tripId = tripData.id;

    console.log(`✅ Found products: experience=${expId || 'none'}, class=${classId || 'none'}, trip=${tripId || 'none'}\n`);
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
    allTestsPassed = false;
  }

  // Test 4: Associate FAQ with products
  console.log('Test 4: Associating FAQ with products...');
  try {
    if (testFaqId) {
      if (expId) {
        // Delete existing associations
        await supabase
          .from('product_faq')
          .delete()
          .eq('product_id', expId)
          .eq('product_type', 'experience');

        // Insert new association
        const { error } = await supabase
          .from('product_faq')
          .insert({
            product_id: expId,
            product_type: 'experience',
            faq_id: testFaqId,
            order_index: 0
          });

        if (error) throw error;
        console.log(`✅ FAQ associated with experience: ${expId}`);
      }

      if (classId) {
        await supabase
          .from('product_faq')
          .delete()
          .eq('product_id', classId)
          .eq('product_type', 'class');

        const { error } = await supabase
          .from('product_faq')
          .insert({
            product_id: classId,
            product_type: 'class',
            faq_id: testFaqId,
            order_index: 0
          });

        if (error) throw error;
        console.log(`✅ FAQ associated with class: ${classId}`);
      }

      if (tripId) {
        await supabase
          .from('product_faq')
          .delete()
          .eq('product_id', tripId)
          .eq('product_type', 'trip');

        const { error } = await supabase
          .from('product_faq')
          .insert({
            product_id: tripId,
            product_type: 'trip',
            faq_id: testFaqId,
            order_index: 0
          });

        if (error) throw error;
        console.log(`✅ FAQ associated with trip: ${tripId}`);
      }

      if (!expId && !classId && !tripId) {
        console.log('⚠️  No products found to associate FAQs with');
      } else {
        console.log('');
      }
    } else {
      console.log('⚠️  No test FAQ created, skipping association');
    }
  } catch (error) {
    console.error('❌ Test 4 failed:', error.message);
    allTestsPassed = false;
  }

  // Test 5: Verify FAQ loading with product
  console.log('Test 5: Verifying FAQ loading...');
  try {
    if (expId) {
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
        console.log(`✅ Loaded ${data.length} FAQ(s) for experience:`);
        data.forEach((pf, idx) => {
          if (pf.faq) {
            console.log(`   ${idx + 1}. ${pf.faq.question}`);
          }
        });
      } else {
        console.log('⚠️  No FAQs found for experience (this is OK if none were associated)');
      }
      console.log('');
    } else {
      console.log('⚠️  No experience found to test loading\n');
    }
  } catch (error) {
    console.error('❌ Test 5 failed:', error.message);
    allTestsPassed = false;
  }

  // Test 6: Test ordering
  console.log('Test 6: Testing FAQ ordering...');
  try {
    if (expId && testFaqId) {
      // Get another FAQ
      const { data: faqs } = await supabase
        .from('faq')
        .select('id')
        .neq('id', testFaqId)
        .limit(1);

      if (faqs && faqs.length > 0) {
        const secondFaqId = faqs[0].id;

        // Delete existing
        await supabase
          .from('product_faq')
          .delete()
          .eq('product_id', expId)
          .eq('product_type', 'experience');

        // Insert with order
        const { error } = await supabase
          .from('product_faq')
          .insert([
            {
              product_id: expId,
              product_type: 'experience',
              faq_id: testFaqId,
              order_index: 0
            },
            {
              product_id: expId,
              product_type: 'experience',
              faq_id: secondFaqId,
              order_index: 1
            }
          ]);

        if (error) throw error;

        // Verify order
        const { data: ordered } = await supabase
          .from('product_faq')
          .select('faq_id, order_index')
          .eq('product_id', expId)
          .eq('product_type', 'experience')
          .order('order_index', { ascending: true });

        if (ordered && ordered.length === 2) {
          if (ordered[0].order_index === 0 && ordered[0].faq_id === testFaqId &&
              ordered[1].order_index === 1 && ordered[1].faq_id === secondFaqId) {
            console.log('✅ FAQ ordering works correctly\n');
          } else {
            throw new Error('Order verification failed');
          }
        } else {
          throw new Error('Expected 2 FAQs, got ' + (ordered?.length || 0));
        }
      } else {
        console.log('⚠️  Not enough FAQs to test ordering\n');
      }
    } else {
      console.log('⚠️  Cannot test ordering (missing product or FAQ)\n');
    }
  } catch (error) {
    console.error('❌ Test 6 failed:', error.message);
    allTestsPassed = false;
  }

  // Summary
  console.log('========================================');
  console.log('Test Summary');
  console.log('========================================');
  
  const { count: totalFaqs } = await supabase
    .from('faq')
    .select('*', { count: 'exact', head: true });

  const { count: totalProductFaqs } = await supabase
    .from('product_faq')
    .select('*', { count: 'exact', head: true });

  console.log(`Total FAQs: ${totalFaqs || 0}`);
  console.log(`Total Product-FAQ associations: ${totalProductFaqs || 0}`);
  console.log('========================================');

  if (allTestsPassed) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

testFAQSystem().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});




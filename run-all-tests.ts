import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNTk3NDcsImV4cCI6MjA0OTkzNTc0N30.TwqxlB3nZAmO2ZW7lKw_k6c0A7rV5M_s1KfbVVMApTE';
const ADMIN_EMAIL = 'a.thezani@gmail.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function addResult(name: string, passed: boolean, details?: any, error?: string) {
  results.push({ name, passed, error, details });
  const icon = passed ? '✅' : '❌';
  log(`${icon} ${name}`);
  if (error) log(`   Error: ${error}`);
  if (details) log(`   Details: ${JSON.stringify(details)}`);
}

async function createTestBooking(orderNumber: string, email: string, name: string, daysFromNow: number = 7) {
  const bookingDate = new Date();
  bookingDate.setDate(bookingDate.getDate() + daysFromNow);

  const { data: product } = await supabase
    .from('experience')
    .select('id, name, provider_id')
    .not('provider_id', 'is', null)
    .limit(1)
    .single();

  if (!product) throw new Error('No product found');

  const { data: booking, error } = await supabase
    .from('booking')
    .insert({
      order_number: orderNumber,
      customer_email: email,
      customer_name: name,
      product_type: 'experience',
      product_id: product.id,
      product_name: product.name,
      provider_id: product.provider_id,
      booking_date: bookingDate.toISOString().split('T')[0],
      number_of_adults: 2,
      number_of_dogs: 1,
      total_amount_paid: 100.00,
      currency: 'EUR',
      status: 'confirmed',
      stripe_checkout_session_id: `cs_test_${Date.now()}_${orderNumber}`,
      confirmation_email_sent: true,
    })
    .select()
    .single();

  if (error) throw error;
  return booking;
}

async function test1_ManualCancellationRequest() {
  log('\n=== TEST 1: Manual Cancellation Request ===');
  try {
    const timestamp = Date.now();
    const orderNumber = `TEST${timestamp}`;
    const booking = await createTestBooking(orderNumber, ADMIN_EMAIL, 'Test User');
    log(`Created booking: ${booking.id}, order: ${orderNumber}`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-cancellation-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        orderNumber: orderNumber,
        customerEmail: ADMIN_EMAIL,
        customerName: 'Test User',
        reason: 'Test manual cancellation request',
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      const { data: request } = await supabase
        .from('cancellation_request')
        .select('*')
        .eq('id', data.requestId)
        .single();

      if (request?.status === 'pending') {
        addResult('Test 1: Manual cancellation request', true, { requestId: data.requestId });
        return { booking, request };
      } else {
        addResult('Test 1: Manual cancellation request', false, null, 'Request not found or wrong status');
        return null;
      }
    } else {
      addResult('Test 1: Manual cancellation request', false, data, data.message || JSON.stringify(data));
      return null;
    }
  } catch (error) {
    addResult('Test 1: Manual cancellation request', false, null, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function test2_ApproveCancellation(requestId: string, bookingId: string) {
  log('\n=== TEST 2: Approve Cancellation ===');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-process-cancellation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        requestId,
        action: 'approve',
        adminEmail: ADMIN_EMAIL,
        adminNotes: 'Test approval',
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      const { data: request } = await supabase
        .from('cancellation_request')
        .select('*')
        .eq('id', requestId)
        .single();

      const { data: booking } = await supabase
        .from('booking')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (request?.status === 'approved' && booking?.status === 'cancelled') {
        addResult('Test 2: Approve cancellation', true, {
          requestStatus: request.status,
          bookingStatus: booking.status,
        });
        return true;
      } else {
        addResult('Test 2: Approve cancellation', false, null, `Request status: ${request?.status}, Booking status: ${booking?.status}`);
        return false;
      }
    } else {
      addResult('Test 2: Approve cancellation', false, data, data.message || JSON.stringify(data));
      return false;
    }
  } catch (error) {
    addResult('Test 2: Approve cancellation', false, null, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function test3_RejectCancellation() {
  log('\n=== TEST 3: Reject Cancellation ===');
  try {
    const timestamp = Date.now();
    const orderNumber = `TEST${timestamp}`;
    const booking = await createTestBooking(orderNumber, ADMIN_EMAIL, 'Test User 2');
    log(`Created booking: ${booking.id}`);

    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/create-cancellation-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        orderNumber: orderNumber,
        customerEmail: ADMIN_EMAIL,
        customerName: 'Test User 2',
        reason: 'Test rejection',
      }),
    });

    const data1 = await response1.json();
    if (!response1.ok || !data1.success) {
      addResult('Test 3: Reject cancellation', false, null, 'Failed to create request');
      return false;
    }

    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/admin-process-cancellation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        requestId: data1.requestId,
        action: 'reject',
        adminEmail: ADMIN_EMAIL,
        adminNotes: 'Test rejection - outside policy',
      }),
    });

    const data2 = await response2.json();
    
    if (response2.ok && data2.success) {
      const { data: request } = await supabase
        .from('cancellation_request')
        .select('*')
        .eq('id', data1.requestId)
        .single();

      const { data: bookingCheck } = await supabase
        .from('booking')
        .select('*')
        .eq('id', booking.id)
        .single();

      if (request?.status === 'rejected' && bookingCheck?.status === 'confirmed') {
        addResult('Test 3: Reject cancellation', true, {
          requestStatus: request.status,
          bookingStatus: bookingCheck.status,
        });
        return true;
      } else {
        addResult('Test 3: Reject cancellation', false, null, `Request: ${request?.status}, Booking: ${bookingCheck?.status}`);
        return false;
      }
    } else {
      addResult('Test 3: Reject cancellation', false, data2, data2.message || JSON.stringify(data2));
      return false;
    }
  } catch (error) {
    addResult('Test 3: Reject cancellation', false, null, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function test4_PreventDuplicates() {
  log('\n=== TEST 4: Prevent Duplicate Requests ===');
  try {
    const timestamp = Date.now();
    const orderNumber = `TEST${timestamp}`;
    const booking = await createTestBooking(orderNumber, ADMIN_EMAIL, 'Test User 3');
    log(`Created booking: ${booking.id}`);

    // First request
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/create-cancellation-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        orderNumber: orderNumber,
        customerEmail: ADMIN_EMAIL,
        customerName: 'Test User 3',
        reason: 'First request',
      }),
    });

    const data1 = await response1.json();
    if (!response1.ok || !data1.success) {
      addResult('Test 4: Prevent duplicates', false, null, 'First request failed');
      return false;
    }

    // Second request (should be prevented)
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/create-cancellation-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        orderNumber: orderNumber,
        customerEmail: ADMIN_EMAIL,
        customerName: 'Test User 3',
        reason: 'Duplicate request',
      }),
    });

    const data2 = await response2.json();
    
    if (response2.ok && data2.alreadyExists) {
      addResult('Test 4: Prevent duplicates', true, {
        firstRequestId: data1.requestId,
        duplicatePrevented: true,
      });
      return true;
    } else {
      addResult('Test 4: Prevent duplicates', false, data2, 'Duplicate was not prevented');
      return false;
    }
  } catch (error) {
    addResult('Test 4: Prevent duplicates', false, null, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function test5_ExpiredBooking() {
  log('\n=== TEST 5: Reject Expired Booking ===');
  try {
    const timestamp = Date.now();
    const orderNumber = `TEST${timestamp}`;
    const booking = await createTestBooking(orderNumber, ADMIN_EMAIL, 'Test User 4', -10); // 10 days ago
    log(`Created expired booking: ${booking.id}`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-cancellation-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        orderNumber: orderNumber,
        customerEmail: ADMIN_EMAIL,
        customerName: 'Test User 4',
        reason: 'Should be rejected - expired',
      }),
    });

    const data = await response.json();
    
    if (!response.ok && (data.error === 'request_expired' || data.error === 'token_expired')) {
      addResult('Test 5: Reject expired booking', true, { errorType: data.error });
      return true;
    } else {
      addResult('Test 5: Reject expired booking', false, data, 'Expired booking was accepted');
      return false;
    }
  } catch (error) {
    addResult('Test 5: Reject expired booking', false, null, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function test6_CheckPendingReminder() {
  log('\n=== TEST 6: Pending Cancellations Reminder ===');
  try {
    // Create an old pending request
    const timestamp = Date.now();
    const orderNumber = `TEST${timestamp}`;
    const booking = await createTestBooking(orderNumber, ADMIN_EMAIL, 'Test User 5');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-cancellation-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        orderNumber: orderNumber,
        customerEmail: ADMIN_EMAIL,
        customerName: 'Test User 5',
        reason: 'Test reminder',
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      addResult('Test 6: Pending reminder', false, null, 'Failed to create request');
      return false;
    }

    // Backdate the request to 4 days ago
    await supabase
      .from('cancellation_request')
      .update({ requested_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() })
      .eq('id', data.requestId);

    // Call reminder function
    const reminderResponse = await fetch(`${SUPABASE_URL}/functions/v1/check-pending-cancellations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
    });

    const reminderData = await reminderResponse.json();
    
    if (reminderResponse.ok) {
      addResult('Test 6: Pending reminder', true, { 
        pendingCount: reminderData.pendingCount,
        emailSent: reminderData.emailSent
      });
      return true;
    } else {
      addResult('Test 6: Pending reminder', false, reminderData, 'Reminder check failed');
      return false;
    }
  } catch (error) {
    addResult('Test 6: Pending reminder', false, null, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function test7_AlreadyCancelled() {
  log('\n=== TEST 7: Reject Already Cancelled Booking ===');
  try {
    const timestamp = Date.now();
    const orderNumber = `TEST${timestamp}`;
    const booking = await createTestBooking(orderNumber, ADMIN_EMAIL, 'Test User 6');
    
    // Cancel the booking first
    await supabase
      .from('booking')
      .update({ status: 'cancelled' })
      .eq('id', booking.id);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-cancellation-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        orderNumber: orderNumber,
        customerEmail: ADMIN_EMAIL,
        customerName: 'Test User 6',
        reason: 'Should be rejected - already cancelled',
      }),
    });

    const data = await response.json();
    
    if (!response.ok && data.error === 'already_cancelled') {
      addResult('Test 7: Reject already cancelled', true, { errorType: data.error });
      return true;
    } else {
      addResult('Test 7: Reject already cancelled', false, data, 'Already cancelled booking was accepted');
      return false;
    }
  } catch (error) {
    addResult('Test 7: Reject already cancelled', false, null, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function cleanup() {
  log('\n=== CLEANUP: Removing test data ===');
  try {
    const { error: cancelError } = await supabase
      .from('cancellation_request')
      .delete()
      .like('order_number', 'TEST%');

    const { error: bookingError } = await supabase
      .from('booking')
      .delete()
      .like('order_number', 'TEST%');

    if (cancelError || bookingError) {
      log(`⚠️  Cleanup warnings: ${cancelError?.message || ''} ${bookingError?.message || ''}`);
    } else {
      log('✅ Test data cleaned up');
    }
  } catch (error) {
    log(`⚠️  Cleanup error: ${error}`);
  }
}

async function runAllTests() {
  log('\n🚀 === STARTING COMPLETE CANCELLATION SYSTEM TESTS ===\n');
  
  try {
    // Test 1: Manual request + approval
    const test1Result = await test1_ManualCancellationRequest();
    if (test1Result) {
      await test2_ApproveCancellation(test1Result.request.id, test1Result.booking.id);
    }
    
    // Test 3: Rejection
    await test3_RejectCancellation();
    
    // Test 4: Prevent duplicates
    await test4_PreventDuplicates();
    
    // Test 5: Expired booking
    await test5_ExpiredBooking();
    
    // Test 6: Reminder
    await test6_CheckPendingReminder();
    
    // Test 7: Already cancelled
    await test7_AlreadyCancelled();
    
    // Summary
    log('\n' + '='.repeat(60));
    log('📊 TEST SUMMARY');
    log('='.repeat(60));
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;
    
    log(`\nTotal: ${total} | ✅ Passed: ${passed} | ❌ Failed: ${failed}\n`);
    
    if (failed > 0) {
      log('Failed tests:');
      results.filter(r => !r.passed).forEach(r => {
        log(`  ❌ ${r.name}: ${r.error}`);
      });
    }
    
    log('\n📧 EMAIL VERIFICATION:');
    log(`Check ${ADMIN_EMAIL} for:`);
    log('  1. Cancellation request notification (Test 1)');
    log('  2. Cancellation approved to customer (Test 2)');
    log('  3. Cancellation rejected to customer (Test 3)');
    log('  4. Cancellation request notification (Test 3)');
    log('  5. Pending cancellations reminder (Test 6)');
    log('  6. Provider notification (Test 2)');
    
    log('\n✨ All tests completed!');
    
    if (passed === total) {
      log('\n🎉 SUCCESS! All tests passed! Sistema completamente funzionante!');
    } else {
      log(`\n⚠️  ${failed} test(s) failed - review errors above`);
    }
    
  } catch (error) {
    log(`\n💥 Fatal error: ${error}`);
  }
  
  // Cleanup
  await cleanup();
}

runAllTests();


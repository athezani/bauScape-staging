/**
 * End-to-End Cancellation Flow Tests
 * 
 * Tests the complete cancellation flow:
 * 1. Create test bookings
 * 2. Generate cancellation tokens
 * 3. Submit cancellation requests (magic link + manual)
 * 4. Approve/reject requests
 * 5. Verify emails sent
 * 6. Check database state
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = 'a.thezani@gmail.com';
const TOKEN_SECRET = 'test-secret-key-for-cancellation-tokens'; // Will use SUPABASE_JWT_SECRET on server

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Helper function to generate cancellation token (Node.js compatible)
async function generateTestToken(bookingId: string, orderNumber: string, email: string): Promise<string> {
  const dataToSign = `${bookingId}:${orderNumber}:${email}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
  hmac.update(dataToSign);
  const signature = hmac.digest('hex');
  const token = Buffer.from(dataToSign).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '') + '.' + signature;
  return token;
}

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function logTest(testName: string, passed: boolean, details?: any, error?: string) {
  results.push({ testName, passed, error, details });
  const icon = passed ? '✅' : '❌';
  log(`${icon} ${testName}`);
  if (details) {
    console.log('  Details:', JSON.stringify(details, null, 2));
  }
  if (error) {
    console.log('  Error:', error);
  }
}

async function createTestBooking(orderNumber: string, customerEmail: string, customerName: string, daysFromNow: number = 7) {
  const bookingDate = new Date();
  bookingDate.setDate(bookingDate.getDate() + daysFromNow);
  
  // Get first available product with provider
  const { data: product, error: productError } = await supabase
    .from('experience')
    .select('id, name, provider_id, cancellation_policy')
    .not('provider_id', 'is', null)
    .limit(1)
    .single();
  
  if (productError || !product) {
    throw new Error(`No products with provider found for testing: ${productError?.message || 'No data'}`);
  }

  const { data: booking, error } = await supabase
    .from('booking')
    .insert({
      order_number: orderNumber,
      customer_email: customerEmail,
      customer_name: customerName,
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
      stripe_checkout_session_id: `cs_test_${orderNumber}`,
      confirmation_email_sent: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create booking: ${error.message}`);
  }

  return booking;
}

async function test1_CreateCancellationRequest_MagicLink() {
  log('\n=== TEST 1: Create cancellation request via magic link ===');
  
  try {
    // Create test booking with unique order number
    const timestamp = Date.now();
    const orderNumber = `TEST${timestamp}_1`;
    const booking = await createTestBooking(orderNumber, 'test1@example.com', 'Test User 1');
    log(`Created test booking: ${booking.id}`);

    // Generate token for magic link
    const token = await generateTestToken(booking.id, orderNumber, 'test1@example.com');
    log(`Generated token: ${token.substring(0, 20)}...`);

    // Call create-cancellation-request with token (magic link mode)
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-cancellation-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        token: token,
        reason: 'Test cancellation via magic link',
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      // Verify request in database
      const { data: request } = await supabase
        .from('cancellation_request')
        .select('*')
        .eq('id', data.requestId)
        .single();

      if (request && request.status === 'pending') {
        logTest('Test 1: Create cancellation request (magic link)', true, {
          requestId: data.requestId,
          status: request.status,
        });
        return { booking, request };
      } else {
        logTest('Test 1: Create cancellation request (magic link)', false, null, 'Request not found or wrong status');
        return null;
      }
    } else {
      logTest('Test 1: Create cancellation request (magic link)', false, null, data.message || 'Request failed');
      return null;
    }
  } catch (error) {
    logTest('Test 1: Create cancellation request (magic link)', false, null, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function test2_CreateCancellationRequest_Manual() {
  log('\n=== TEST 2: Create cancellation request via manual form ===');
  
  try {
    const timestamp = Date.now();
    const orderNumber = `TEST${timestamp}_2`;
    const booking = await createTestBooking(orderNumber, 'test2@example.com', 'Test User 2');
    log(`Created test booking: ${booking.id}`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-cancellation-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        orderNumber: orderNumber,
        customerEmail: 'test2@example.com',
        customerName: 'Test User 2',
        reason: 'Test cancellation via manual form',
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      const { data: request } = await supabase
        .from('cancellation_request')
        .select('*')
        .eq('id', data.requestId)
        .single();

      if (request && request.status === 'pending') {
        logTest('Test 2: Create cancellation request (manual)', true, {
          requestId: data.requestId,
        });
        return { booking, request };
      } else {
        logTest('Test 2: Create cancellation request (manual)', false, null, 'Request not found');
        return null;
      }
    } else {
      logTest('Test 2: Create cancellation request (manual)', false, null, data.message);
      return null;
    }
  } catch (error) {
    logTest('Test 2: Create cancellation request (manual)', false, null, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function test3_ApproveCancellation(requestId: string, bookingId: string) {
  log('\n=== TEST 3: Approve cancellation request ===');
  
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
      // Verify request status
      const { data: request } = await supabase
        .from('cancellation_request')
        .select('*')
        .eq('id', requestId)
        .single();

      // Verify booking status
      const { data: booking } = await supabase
        .from('booking')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (request?.status === 'approved' && booking?.status === 'cancelled') {
        logTest('Test 3: Approve cancellation', true, {
          requestStatus: request.status,
          bookingStatus: booking.status,
        });
        return true;
      } else {
        logTest('Test 3: Approve cancellation', false, null, 'Status not updated correctly');
        return false;
      }
    } else {
      logTest('Test 3: Approve cancellation', false, null, data.message);
      return false;
    }
  } catch (error) {
    logTest('Test 3: Approve cancellation', false, null, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function test4_RejectCancellation(requestId: string, bookingId: string) {
  log('\n=== TEST 4: Reject cancellation request ===');
  
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
        action: 'reject',
        adminEmail: ADMIN_EMAIL,
        adminNotes: 'Test rejection - outside cancellation policy',
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

      if (request?.status === 'rejected' && booking?.status === 'confirmed') {
        logTest('Test 4: Reject cancellation', true, {
          requestStatus: request.status,
          bookingStatus: booking.status,
        });
        return true;
      } else {
        logTest('Test 4: Reject cancellation', false, null, 'Status not updated correctly');
        return false;
      }
    } else {
      logTest('Test 4: Reject cancellation', false, null, data.message);
      return false;
    }
  } catch (error) {
    logTest('Test 4: Reject cancellation', false, null, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function test5_DuplicateRequest() {
  log('\n=== TEST 5: Prevent duplicate cancellation requests ===');
  
  try {
    const timestamp = Date.now();
    const orderNumber = `TEST${timestamp}_5`;
    const booking = await createTestBooking(orderNumber, 'test5@example.com', 'Test User 5');
    
    // First request
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/create-cancellation-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        orderNumber,
        customerEmail: 'test5@example.com',
        customerName: 'Test User 5',
        reason: 'First request',
      }),
    });

    const data1 = await response1.json();
    
    if (!response1.ok || !data1.success) {
      logTest('Test 5: Prevent duplicate requests', false, null, 'First request failed');
      return false;
    }

    // Second request (should be prevented)
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/create-cancellation-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        orderNumber,
        customerEmail: 'test5@example.com',
        customerName: 'Test User 5',
        reason: 'Second request (duplicate)',
      }),
    });

    const data2 = await response2.json();
    
    if (response2.ok && data2.alreadyExists) {
      logTest('Test 5: Prevent duplicate requests', true, {
        firstRequestId: data1.requestId,
        duplicatePrevented: true,
      });
      return true;
    } else {
      logTest('Test 5: Prevent duplicate requests', false, null, 'Duplicate was not prevented');
      return false;
    }
  } catch (error) {
    logTest('Test 5: Prevent duplicate requests', false, null, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function test6_ExpiredToken() {
  log('\n=== TEST 6: Reject expired token (past booking date) ===');
  
  try {
    const timestamp = Date.now();
    const orderNumber = `TEST${timestamp}_6`;
    const booking = await createTestBooking(orderNumber, 'test6@example.com', 'Test User 6', -10); // 10 days ago
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-cancellation-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        orderNumber,
        customerEmail: 'test6@example.com',
        customerName: 'Test User 6',
        reason: 'Request for expired booking',
      }),
    });

    const data = await response.json();
    
    if (!response.ok && data.error === 'request_expired') {
      logTest('Test 6: Reject expired token', true, {
        errorType: data.error,
      });
      return true;
    } else {
      logTest('Test 6: Reject expired token', false, null, 'Expired booking was accepted');
      return false;
    }
  } catch (error) {
    logTest('Test 6: Reject expired token', false, null, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function test7_CheckPendingReminder() {
  log('\n=== TEST 7: Check pending cancellations reminder ===');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/check-pending-cancellations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      logTest('Test 7: Check pending cancellations reminder', true, {
        totalCount: data.totalCount,
        urgentCount: data.urgentCount,
        recentCount: data.recentCount,
      });
      return true;
    } else {
      logTest('Test 7: Check pending cancellations reminder', false, null, 'Reminder check failed');
      return false;
    }
  } catch (error) {
    logTest('Test 7: Check pending cancellations reminder', false, null, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function runAllTests() {
  log('=== STARTING END-TO-END CANCELLATION TESTS ===\n');
  log(`Supabase URL: ${SUPABASE_URL}`);
  log(`Admin Email: ${ADMIN_EMAIL}\n`);

  // Test 1: Magic link request
  const test1Result = await test1_CreateCancellationRequest_MagicLink();
  
  // Test 2: Manual form request
  const test2Result = await test2_CreateCancellationRequest_Manual();
  
  // Test 3: Approve cancellation (use test1 result)
  if (test1Result) {
    await test3_ApproveCancellation(test1Result.request.id, test1Result.booking.id);
  }
  
  // Test 4: Reject cancellation (use test2 result)
  if (test2Result) {
    await test4_RejectCancellation(test2Result.request.id, test2Result.booking.id);
  }
  
  // Test 5: Duplicate prevention
  await test5_DuplicateRequest();
  
  // Test 6: Expired token
  await test6_ExpiredToken();
  
  // Test 7: Pending reminder
  await test7_CheckPendingReminder();

  // Summary
  log('\n=== TEST SUMMARY ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  log(`Total tests: ${results.length}`);
  log(`✅ Passed: ${passed}`);
  log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      log(`  - ${r.testName}: ${r.error}`);
    });
  }

  log('\n=== EMAIL VERIFICATION ===');
  log(`Check ${ADMIN_EMAIL} for the following emails:`);
  log('1. Cancellation request notification (Test 1)');
  log('2. Cancellation request notification (Test 2)');
  log('3. Cancellation approved to customer (Test 1)');
  log('4. Cancellation rejected to customer (Test 2)');
  log('5. Pending cancellations reminder (Test 7)');
  
  if (failed === 0) {
    log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});


/**
 * Unit Tests for Cancellation Token Utilities
 * 
 * Tests token generation, validation, and expiry logic
 */

import { generateCancellationToken, validateCancellationToken, isTokenExpired } from './baux-paws-access/supabase/functions/_shared/cancellation-token.ts';

const TEST_SECRET = 'test-secret-key-for-hmac-signature';

async function runTests() {
  console.log('=== CANCELLATION TOKEN UTILITY TESTS ===\n');

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Generate valid token
  console.log('Test 1: Generate valid token');
  try {
    const token = await generateCancellationToken(
      'booking-123',
      'A0GWPTWH',
      'test@example.com',
      TEST_SECRET
    );
    
    if (token && token.length > 0) {
      console.log('✅ PASSED - Token generated:', token.substring(0, 20) + '...');
      passedTests++;
    } else {
      console.log('❌ FAILED - Token is empty');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAILED -', error);
    failedTests++;
  }
  console.log('');

  // Test 2: Validate valid token
  console.log('Test 2: Validate valid token');
  try {
    const token = await generateCancellationToken(
      'booking-456',
      'B1XYZABC',
      'valid@example.com',
      TEST_SECRET
    );
    
    const validation = await validateCancellationToken(token, TEST_SECRET);
    
    if (validation.valid && validation.payload) {
      if (
        validation.payload.bookingId === 'booking-456' &&
        validation.payload.orderNumber === 'B1XYZABC' &&
        validation.payload.email === 'valid@example.com'
      ) {
        console.log('✅ PASSED - Token validated successfully');
        console.log('  Payload:', validation.payload);
        passedTests++;
      } else {
        console.log('❌ FAILED - Payload data mismatch');
        console.log('  Expected: booking-456, B1XYZABC, valid@example.com');
        console.log('  Got:', validation.payload);
        failedTests++;
      }
    } else {
      console.log('❌ FAILED - Token validation failed:', validation.error);
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAILED -', error);
    failedTests++;
  }
  console.log('');

  // Test 3: Reject tampered token
  console.log('Test 3: Reject tampered token');
  try {
    const token = await generateCancellationToken(
      'booking-789',
      'C2DEFGHI',
      'tamper@example.com',
      TEST_SECRET
    );
    
    // Tamper with token (change one character)
    const tamperedToken = token.substring(0, 10) + 'X' + token.substring(11);
    
    const validation = await validateCancellationToken(tamperedToken, TEST_SECRET);
    
    if (!validation.valid) {
      console.log('✅ PASSED - Tampered token rejected');
      console.log('  Error:', validation.error);
      passedTests++;
    } else {
      console.log('❌ FAILED - Tampered token was accepted (security issue!)');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAILED -', error);
    failedTests++;
  }
  console.log('');

  // Test 4: Reject token with wrong secret
  console.log('Test 4: Reject token with wrong secret');
  try {
    const token = await generateCancellationToken(
      'booking-101',
      'D3JKLMNO',
      'secret@example.com',
      TEST_SECRET
    );
    
    const validation = await validateCancellationToken(token, 'wrong-secret');
    
    if (!validation.valid) {
      console.log('✅ PASSED - Token with wrong secret rejected');
      console.log('  Error:', validation.error);
      passedTests++;
    } else {
      console.log('❌ FAILED - Token with wrong secret was accepted (security issue!)');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAILED -', error);
    failedTests++;
  }
  console.log('');

  // Test 5: Check token expiry - NOT expired (future date)
  console.log('Test 5: Check token expiry - NOT expired (future date)');
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    const expired = isTokenExpired(futureDateStr, null);
    
    if (!expired) {
      console.log('✅ PASSED - Future booking is not expired');
      passedTests++;
    } else {
      console.log('❌ FAILED - Future booking marked as expired');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAILED -', error);
    failedTests++;
  }
  console.log('');

  // Test 6: Check token expiry - expired (past date)
  console.log('Test 6: Check token expiry - expired (past date)');
  try {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10); // 10 days ago
    const pastDateStr = pastDate.toISOString().split('T')[0];
    
    const expired = isTokenExpired(pastDateStr, null);
    
    if (expired) {
      console.log('✅ PASSED - Past booking is expired');
      passedTests++;
    } else {
      console.log('❌ FAILED - Past booking not marked as expired');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAILED -', error);
    failedTests++;
  }
  console.log('');

  // Test 7: Check token expiry - within 24h grace period
  console.log('Test 7: Check token expiry - within 24h grace period');
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const expired = isTokenExpired(todayStr, null);
    
    if (!expired) {
      console.log('✅ PASSED - Booking today + 24h grace period is not expired');
      passedTests++;
    } else {
      console.log('❌ FAILED - Booking today should have 24h grace period');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAILED -', error);
    failedTests++;
  }
  console.log('');

  // Test 8: Check token expiry with end_date (multi-day trip)
  console.log('Test 8: Check token expiry with end_date (multi-day trip)');
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 5); // Started 5 days ago
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 2); // Ends in 2 days
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const expired = isTokenExpired(startDateStr, endDateStr);
    
    if (!expired) {
      console.log('✅ PASSED - Multi-day trip uses end_date for expiry');
      passedTests++;
    } else {
      console.log('❌ FAILED - Multi-day trip should use end_date, not start_date');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAILED -', error);
    failedTests++;
  }
  console.log('');

  // Test 9: Token uniqueness
  console.log('Test 9: Token uniqueness (same data, different timestamps)');
  try {
    const token1 = await generateCancellationToken(
      'booking-same',
      'SAMEDATA',
      'same@example.com',
      TEST_SECRET
    );
    
    // Wait a tiny bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const token2 = await generateCancellationToken(
      'booking-same',
      'SAMEDATA',
      'same@example.com',
      TEST_SECRET
    );
    
    if (token1 !== token2) {
      console.log('✅ PASSED - Tokens are unique even with same data');
      passedTests++;
    } else {
      console.log('❌ FAILED - Tokens should be unique (different timestamps)');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAILED -', error);
    failedTests++;
  }
  console.log('');

  // Test 10: Invalid token format
  console.log('Test 10: Reject invalid token format');
  try {
    const validation = await validateCancellationToken('invalid-token-format', TEST_SECRET);
    
    if (!validation.valid) {
      console.log('✅ PASSED - Invalid format rejected');
      console.log('  Error:', validation.error);
      passedTests++;
    } else {
      console.log('❌ FAILED - Invalid format was accepted');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAILED -', error);
    failedTests++;
  }
  console.log('');

  // Summary
  console.log('=== TEST SUMMARY ===');
  console.log(`Total tests: ${passedTests + failedTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log('');

  if (failedTests === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});


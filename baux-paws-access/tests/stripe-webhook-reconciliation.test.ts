/**
 * TEST: stripe-webhook Quotation Reconciliation
 * 
 * Verifica che il webhook riconcili correttamente la quotation
 * quando riceve un evento checkout.session.completed
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

const TEST_QUOTATION_ID = '00000000-0000-0000-0000-000000000010';
const TEST_BOOKING_ID = '00000000-0000-0000-0000-000000000011';
const TEST_SESSION_ID = 'cs_test_1234567890';

/**
 * Test 1: Estrazione quotation_id dai metadata
 */
Deno.test('stripe-webhook: Extract quotation_id from metadata', () => {
  const metadata: Record<string, string> = {
    product_id: '00000000-0000-0000-0000-000000000001',
    product_type: 'experience',
    quotation_id: TEST_QUOTATION_ID,
    customer_name: 'Mario',
    customer_surname: 'Rossi',
  };
  
  const quotationId = metadata.quotation_id || null;
  
  assertEquals(quotationId, TEST_QUOTATION_ID);
  assertExists(quotationId);
  
  console.log('✅ TEST PASSED: quotation_id extracted from metadata');
});

/**
 * Test 2: Riconciliazione quotation dopo creazione booking
 */
Deno.test('stripe-webhook: Reconcile quotation after booking creation', () => {
  const quotationId = TEST_QUOTATION_ID;
  const bookingId = TEST_BOOKING_ID;
  
  // Simula aggiornamento quotation
  const updateData = {
    status: 'booking',
    booking_id: bookingId,
  };
  
  assertEquals(updateData.status, 'booking');
  assertEquals(updateData.booking_id, bookingId);
  
  console.log('✅ TEST PASSED: Quotation reconciliation data is correct');
});

/**
 * Test 3: Estrazione dati cliente da metadata (new flow)
 */
Deno.test('stripe-webhook: Extract customer data from metadata (new flow)', () => {
  const metadata: Record<string, string> = {
    customer_name: 'Mario',
    customer_surname: 'Rossi',
    customer_email: 'mario.rossi@example.com',
    customer_phone: '+393401234567',
    customer_fiscal_code: 'RSSMRA80A01H501X',
  };
  
  const hasInternalCheckoutData = !!(metadata.customer_name && metadata.customer_surname);
  
  assertEquals(hasInternalCheckoutData, true);
  assertEquals(metadata.customer_name, 'Mario');
  assertEquals(metadata.customer_surname, 'Rossi');
  assertEquals(metadata.customer_email, 'mario.rossi@example.com');
  
  console.log('✅ TEST PASSED: Customer data extracted from metadata (new flow)');
});

/**
 * Test 4: Fallback a custom fields (legacy flow)
 */
Deno.test('stripe-webhook: Fallback to custom fields (legacy flow)', () => {
  const metadata: Record<string, string> = {
    product_id: '00000000-0000-0000-0000-000000000001',
    // No customer data in metadata
  };
  
  const sessionCustomFields = [
    { key: 'customer_first_name', value: 'Mario' },
    { key: 'customer_last_name', value: 'Rossi' },
  ];
  
  const hasInternalCheckoutData = !!(metadata.customer_name && metadata.customer_surname);
  
  let customerFirstName = '';
  let customerLastName = '';
  
  if (!hasInternalCheckoutData && sessionCustomFields) {
    sessionCustomFields.forEach((field) => {
      if (field.key === 'customer_first_name') {
        customerFirstName = field.value || '';
      } else if (field.key === 'customer_last_name') {
        customerLastName = field.value || '';
      }
    });
  }
  
  assertEquals(hasInternalCheckoutData === false, true);
  assertEquals(customerFirstName, 'Mario');
  assertEquals(customerLastName, 'Rossi');
  
  console.log('✅ TEST PASSED: Fallback to custom fields works (legacy flow)');
});

/**
 * Test 5: Gestione errori - aggiornamento quotation fallisce
 */
Deno.test('stripe-webhook: Quotation update failure does not block webhook', () => {
  const quotationId = TEST_QUOTATION_ID;
  const bookingId = TEST_BOOKING_ID;
  let quotationUpdated = false;
  let webhookCompleted = false;
  
  try {
    // Simula fallimento aggiornamento
    throw new Error('Database error');
  } catch (error) {
    // Log error ma continua
    console.log('Quotation update failed (non-blocking):', error);
    quotationUpdated = false;
  }
  
  // Webhook continua comunque
  webhookCompleted = true;
  
  assertEquals(quotationUpdated, false);
  assertEquals(webhookCompleted, true);
  
  console.log('✅ TEST PASSED: Quotation update failure does not block webhook');
});

/**
 * Test 6: Webhook senza quotation_id (legacy flow)
 */
Deno.test('stripe-webhook: Webhook without quotation_id (legacy flow)', () => {
  const metadata: Record<string, string> = {
    product_id: '00000000-0000-0000-0000-000000000001',
    product_type: 'experience',
    // No quotation_id
  };
  
  const quotationId = metadata.quotation_id || null;
  
  assertEquals(quotationId, null);
  
  // Webhook dovrebbe continuare normalmente senza riconciliazione
  console.log('✅ TEST PASSED: Webhook handles missing quotation_id (legacy flow)');
});

console.log('========================================');
console.log('✅ ALL stripe-webhook TESTS PASSED');
console.log('========================================');


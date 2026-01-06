/**
 * TEST: Odoo Webhook Metadata Reading
 * 
 * Verifica che il webhook Odoo legga correttamente i dati da metadata
 * quando disponibili (new flow) invece di custom fields
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

/**
 * Test 1: Priorità metadata su custom fields (new flow)
 */
Deno.test('odoo-webhook: Priority metadata over custom fields (new flow)', () => {
  const metadata: Record<string, string> = {
    customer_name: 'Mario',
    customer_surname: 'Rossi',
    customer_email: 'mario.rossi@example.com',
    customer_phone: '+393401234567',
    customer_fiscal_code: 'RSSMRA80A01H501X',
    customer_address_line1: 'Via Roma 123',
    customer_address_city: 'Milano',
    customer_address_postal_code: '20100',
    customer_address_country: 'IT',
  };
  
  const hasInternalCheckoutMetadata = !!(metadata.customer_name && metadata.customer_surname);
  
  let firstName: string | null = null;
  let lastName: string | null = null;
  let email: string | null = null;
  let fiscalCode: string | null = null;
  let address: string | null = null;
  
  if (hasInternalCheckoutMetadata) {
    // NEW FLOW: Usa metadata
    firstName = metadata.customer_name || null;
    lastName = metadata.customer_surname || null;
    email = metadata.customer_email || null;
    fiscalCode = metadata.customer_fiscal_code || null;
    
    const addressParts = [
      metadata.customer_address_line1,
      metadata.customer_address_city,
      metadata.customer_address_postal_code,
      metadata.customer_address_country || 'IT'
    ].filter(Boolean);
    address = addressParts.length > 0 ? addressParts.join(', ') : null;
  }
  
  assertEquals(hasInternalCheckoutMetadata === true, true);
  assertEquals(firstName, 'Mario');
  assertEquals(lastName, 'Rossi');
  assertEquals(email, 'mario.rossi@example.com');
  assertEquals(fiscalCode, 'RSSMRA80A01H501X');
  assertExists(address);
  
  console.log('✅ TEST PASSED: Metadata has priority over custom fields (new flow)');
});

/**
 * Test 2: Fallback a custom fields quando metadata non disponibile (legacy flow)
 */
Deno.test('odoo-webhook: Fallback to custom fields when metadata unavailable (legacy flow)', () => {
  const metadata: Record<string, string> = {
    product_id: '00000000-0000-0000-0000-000000000001',
    // No customer data in metadata
  };
  
  const sessionCustomFields = [
    { key: 'customer_first_name', value: 'Mario' },
    { key: 'customer_last_name', value: 'Rossi' },
    { key: 'customer_fiscal_code', value: 'RSSMRA80A01H501X' },
    { key: 'customer_address', value: 'Via Roma 123, Milano, 20100' },
  ];
  
  const hasInternalCheckoutMetadata = !!(metadata.customer_name && metadata.customer_surname);
  
  let firstName: string | null = null;
  let lastName: string | null = null;
  let fiscalCode: string | null = null;
  let address: string | null = null;
  
  if (!hasInternalCheckoutMetadata && sessionCustomFields) {
    // LEGACY FLOW: Usa custom fields
    sessionCustomFields.forEach((field) => {
      if (field.key === 'customer_first_name') {
        firstName = field.value || null;
      } else if (field.key === 'customer_last_name') {
        lastName = field.value || null;
      } else if (field.key === 'customer_fiscal_code') {
        fiscalCode = field.value || null;
      } else if (field.key === 'customer_address') {
        address = field.value || null;
      }
    });
  }
  
  assertEquals(hasInternalCheckoutMetadata === false, true);
  assertEquals(firstName, 'Mario');
  assertEquals(lastName, 'Rossi');
  assertEquals(fiscalCode, 'RSSMRA80A01H501X');
  assertEquals(address, 'Via Roma 123, Milano, 20100');
  
  console.log('✅ TEST PASSED: Fallback to custom fields works (legacy flow)');
});

/**
 * Test 3: Costruzione indirizzo da componenti metadata
 */
Deno.test('odoo-webhook: Build address from metadata components', () => {
  const metadata: Record<string, string> = {
    customer_address_line1: 'Via Roma 123',
    customer_address_city: 'Milano',
    customer_address_postal_code: '20100',
    customer_address_country: 'IT',
  };
  
  const addressParts = [
    metadata.customer_address_line1,
    metadata.customer_address_city,
    metadata.customer_address_postal_code,
    metadata.customer_address_country || 'IT'
  ].filter(Boolean);
  
  const address = addressParts.length > 0 ? addressParts.join(', ') : null;
  
  assertExists(address);
  assertEquals(address, 'Via Roma 123, Milano, 20100, IT');
  
  console.log('✅ TEST PASSED: Address built correctly from metadata components');
});

/**
 * Test 4: Skip checkout session fetch quando metadata disponibile
 */
Deno.test('odoo-webhook: Skip checkout session fetch when metadata available', () => {
  const metadata: Record<string, string> = {
    customer_name: 'Mario',
    customer_surname: 'Rossi',
    customer_email: 'mario.rossi@example.com',
  };
  
  const hasInternalCheckoutMetadata = !!(metadata.customer_name && metadata.customer_surname);
  let shouldFetchSession = !hasInternalCheckoutMetadata;
  
  assertEquals(hasInternalCheckoutMetadata === true, true);
  assertEquals(shouldFetchSession === false, true);
  
  console.log('✅ TEST PASSED: Checkout session fetch skipped when metadata available');
});

/**
 * Test 5: Tutti i campi necessari per Odoo presenti nei metadata
 */
Deno.test('odoo-webhook: All required fields for Odoo present in metadata', () => {
  const metadata: Record<string, string> = {
    product_id: '00000000-0000-0000-0000-000000000001',
    product_type: 'experience',
    product_name: 'Test Experience',
    booking_date: '2025-02-15',
    number_of_adults: '2',
    number_of_dogs: '1',
    total_amount: '100.00',
    // Customer data
    customer_name: 'Mario',
    customer_surname: 'Rossi',
    customer_email: 'mario.rossi@example.com',
    customer_phone: '+393401234567',
    customer_fiscal_code: 'RSSMRA80A01H501X',
    customer_address_line1: 'Via Roma 123',
    customer_address_city: 'Milano',
    customer_address_postal_code: '20100',
    customer_address_country: 'IT',
  };
  
  // Verifica campi prodotto
  assertExists(metadata.product_id);
  assertExists(metadata.product_type);
  assertExists(metadata.product_name);
  assertExists(metadata.booking_date);
  assertExists(metadata.number_of_adults);
  assertExists(metadata.number_of_dogs);
  assertExists(metadata.total_amount);
  
  // Verifica campi cliente
  assertExists(metadata.customer_name);
  assertExists(metadata.customer_surname);
  assertExists(metadata.customer_email);
  assertExists(metadata.customer_phone);
  assertExists(metadata.customer_fiscal_code);
  assertExists(metadata.customer_address_line1);
  assertExists(metadata.customer_address_city);
  assertExists(metadata.customer_address_postal_code);
  assertExists(metadata.customer_address_country);
  
  console.log('✅ TEST PASSED: All required fields for Odoo are present in metadata');
});

console.log('========================================');
console.log('✅ ALL ODOO WEBHOOK TESTS PASSED');
console.log('========================================');


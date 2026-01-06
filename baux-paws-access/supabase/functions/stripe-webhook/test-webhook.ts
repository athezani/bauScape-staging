/**
 * Test script to manually trigger webhook and verify booking creation
 * This can be used to test if the webhook is working correctly
 */

// Example test payload for checkout.session.completed event
const testEvent = {
  id: 'evt_test_webhook',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_1234567890',
      payment_intent: 'pi_test_1234567890',
      customer_email: 'test@example.com',
      customer_details: {
        email: 'test@example.com',
        name: 'Test User',
        phone: '+39123456789',
      },
      custom_fields: [
        {
          key: 'customer_first_name',
          value: 'Test',
        },
        {
          key: 'customer_last_name',
          value: 'User',
        },
      ],
      amount_total: 5000, // 50.00 EUR in cents
      currency: 'eur',
      metadata: {
        product_id: 'YOUR_PRODUCT_ID_HERE',
        product_type: 'experience',
        availability_slot_id: 'YOUR_SLOT_ID_HERE',
        booking_date: '2026-06-15',
        booking_time: '10:00',
        number_of_adults: '2',
        number_of_dogs: '1',
        product_name: 'Test Experience',
        total_amount: '50.00',
      },
    },
  },
};

console.log('Test webhook payload:');
console.log(JSON.stringify(testEvent, null, 2));
console.log('\nTo test:');
console.log('1. Replace YOUR_PRODUCT_ID_HERE and YOUR_SLOT_ID_HERE with real IDs');
console.log('2. Use Stripe CLI: stripe listen --forward-to https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/stripe-webhook');
console.log('3. Or use Stripe Dashboard → Webhooks → Send test webhook');




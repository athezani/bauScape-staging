/**
 * Check and update product no_adults flag
 */

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkwMiwiZXhwIjoyMDgwMTU1OTAyfQ.4Bt1W3c9RZpMK4X4eqD51Qq03KzqHF4yP9tnOwHRJXI';

async function checkAndUpdateProduct() {
  try {
    // Step 1: Get booking
    console.log('Step 1: Getting booking...');
    const bookingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/booking?order_number=eq.BHWY3TJS&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (!bookingResponse.ok) {
      const error = await bookingResponse.json();
      throw new Error(`Failed to fetch booking: ${JSON.stringify(error)}`);
    }

    const bookings = await bookingResponse.json();
    if (!bookings || bookings.length === 0) {
      throw new Error('Booking not found');
    }

    const booking = bookings[0];
    console.log('✅ Booking found');
    console.log('   Availability Slot ID:', booking.availability_slot_id);
    console.log('   Product Type:', booking.product_type);
    console.log('');

    // Step 2: Get product via availability_slot
    console.log('Step 2: Getting product via availability_slot...');
    let productId = null;
    let productType = booking.product_type;
    
    if (booking.availability_slot_id) {
      const slotResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/availability_slot?id=eq.${booking.availability_slot_id}&select=product_id,product_type`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      
      if (slotResponse.ok) {
        const slots = await slotResponse.json();
        if (slots && slots.length > 0 && slots[0].product_id) {
          productId = slots[0].product_id;
          productType = slots[0].product_type || booking.product_type;
          console.log('✅ Found product_id from slot:', productId);
        }
      }
    }
    
    if (!productId) {
      throw new Error('Could not find product_id from booking or availability_slot');
    }

    // Step 3: Get product
    console.log('Step 3: Getting product...');
    const productResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/${productType}?id=eq.${productId}&select=id,name,no_adults`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    const products = await productResponse.json();
    if (!products || products.length === 0) {
      throw new Error('Product not found');
    }

    const product = products[0];
    console.log('✅ Product found');
    console.log('   Name:', product.name);
    console.log('   Current no_adults:', product.no_adults, '(type:', typeof product.no_adults + ')');
    console.log('');

    // Step 4: Check if needs update
    const needsUpdate = !(product.no_adults === true || product.no_adults === 1);
    
    if (needsUpdate) {
      console.log('⚠️  Product needs update: no_adults should be true');
      console.log('');
      console.log('Step 4: Updating product...');
      
      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/${productType}?id=eq.${productId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({ no_adults: true }),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(`Update failed: ${JSON.stringify(error)}`);
      }

      const updated = await updateResponse.json();
      console.log('✅ Product updated successfully');
      console.log('   New no_adults:', updated[0].no_adults);
    } else {
      console.log('✅ Product already has no_adults = true');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAndUpdateProduct();


/**
 * Test script to send email for a specific order
 * Usage: SUPABASE_SERVICE_ROLE_KEY=your_key deno run --allow-net --allow-env test-email-order.ts 9GLVYRLD
 */

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  Deno.exit(1);
}

const orderNumber = Deno.args[0] || 'BHWY3TJS';
if (!orderNumber) {
  console.error('❌ Order number is required');
  console.log('Usage: SUPABASE_SERVICE_ROLE_KEY=your_key deno run --allow-net --allow-env test-email-order.ts <ORDER_NUMBER>');
  Deno.exit(1);
}

async function testEmailForOrder() {
  try {
    console.log('=== TESTING EMAIL FOR ORDER ===');
    console.log('Order Number:', orderNumber);
    console.log('');

    // Step 1: Find booking by order number
    console.log('Step 1: Finding booking by order number...');
    const bookingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/booking?order_number=eq.${orderNumber}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (!bookingResponse.ok) {
      throw new Error(`Failed to fetch booking: ${bookingResponse.status} ${bookingResponse.statusText}`);
    }

    const bookings = await bookingResponse.json();
    
    if (!bookings || bookings.length === 0) {
      console.error('❌ No booking found with order number:', orderNumber);
      console.log('');
      console.log('Trying to find by checkout session ID...');
      
      // Try to find by checkout session ID (last 8 chars might match)
      const sessionIdResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/booking?stripe_checkout_session_id=ilike.%${orderNumber}%&select=*`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      
      if (sessionIdResponse.ok) {
        const sessionBookings = await sessionIdResponse.json();
        if (sessionBookings && sessionBookings.length > 0) {
          console.log('✅ Found booking by session ID:', sessionBookings[0].id);
          bookings.push(...sessionBookings);
        }
      }
      
      if (!bookings || bookings.length === 0) {
        throw new Error('No booking found with order number or session ID');
      }
    }

    const booking = bookings[0];
    console.log('✅ Booking found:', booking.id);
    console.log('   Product:', booking.product_name);
    console.log('   Customer:', booking.customer_email);
    console.log('   Adults:', booking.number_of_adults);
    console.log('   Dogs:', booking.number_of_dogs);
    console.log('');

    // Step 2: Fetch product details to get no_adults flag
    console.log('Step 2: Fetching product details...');
    let product: any = null;
    let productType: 'experience' | 'class' | 'trip' = booking.product_type as any;
    
    const productResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/${productType}?id=eq.${booking.product_id}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (productResponse.ok) {
      const products = await productResponse.json();
      if (products && products.length > 0) {
        product = products[0];
        console.log('✅ Product found:', product.name);
        console.log('   no_adults:', product.no_adults);
        console.log('');
      }
    }

    // Step 3: Prepare email payload
    console.log('Step 3: Preparing email payload...');
    const emailPayload = {
      type: 'order_confirmation' as const,
      bookingId: booking.id,
      customerEmail: booking.customer_email,
      customerName: booking.customer_name || booking.customer_first_name || 'Cliente',
      customerSurname: booking.customer_surname || booking.customer_last_name || undefined,
      customerPhone: booking.customer_phone || undefined,
      productName: booking.product_name,
      productDescription: booking.product_description || undefined,
      productType: productType,
      noAdults: product?.no_adults || false,
      bookingDate: booking.booking_date,
      bookingTime: booking.booking_time || undefined,
      numberOfAdults: booking.number_of_adults || 0,
      numberOfDogs: booking.number_of_dogs || 0,
      totalAmount: parseFloat(booking.total_amount_paid) || 0,
      currency: booking.currency || 'EUR',
      orderNumber: booking.order_number || orderNumber,
    };

    console.log('Email payload:', JSON.stringify(emailPayload, null, 2));
    console.log('');

    // Step 4: Send email
    console.log('Step 4: Sending email via send-transactional-email function...');
    const emailResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/send-transactional-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify(emailPayload),
      }
    );

    const emailResult = await emailResponse.json();
    
    console.log('');
    if (emailResponse.ok) {
      console.log('✅ EMAIL SENT SUCCESSFULLY!');
      console.log('   Response:', JSON.stringify(emailResult, null, 2));
      console.log('');
      console.log('📧 Please check your inbox at:', booking.customer_email);
      console.log('   (Also check spam folder if not found)');
    } else {
      console.error('❌ EMAIL SENDING FAILED');
      console.error('   Status:', emailResponse.status);
      console.error('   Status Text:', emailResponse.statusText);
      console.error('   Error:', JSON.stringify(emailResult, null, 2));
    }
  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    Deno.exit(1);
  }
}

testEmailForOrder();


/**
 * Script per inviare manualmente l'email di conferma per un booking
 * 
 * Usage: deno run --allow-net --allow-env fix-booking-email.ts UGYSLY3J
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface Booking {
  id: string;
  order_number: string | null;
  stripe_checkout_session_id: string | null;
  customer_email: string;
  customer_name: string;
  customer_surname: string | null;
  customer_phone: string | null;
  confirmation_email_sent: boolean;
  product_name: string;
  product_description: string | null;
  product_type: string;
  booking_date: string;
  booking_time: string | null;
  number_of_adults: number;
  number_of_dogs: number;
  total_amount_paid: number;
  currency: string;
  availability_slot_id: string | null;
}

const orderNumber = Deno.args[0];

if (!orderNumber) {
  console.error('❌ Order number richiesto');
  console.log('Usage: deno run --allow-net --allow-env fix-booking-email.ts <ORDER_NUMBER>');
  Deno.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non configurato');
  console.log('\nConfigura con:');
  console.log('export SUPABASE_SERVICE_ROLE_KEY=your_key');
  Deno.exit(1);
}

async function findBooking(): Promise<Booking | null> {
  console.log(`\n🔍 Cercando booking con order_number = '${orderNumber}'...\n`);
  
  const supabase = await import('https://esm.sh/@supabase/supabase-js@2').then(m => 
    m.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  );

  // Try by order_number
  const { data: booking, error: bookingError } = await supabase
    .from('booking')
    .select('*')
    .eq('order_number', orderNumber)
    .single();

  if (booking) {
    console.log('✅ Booking trovato per order_number!');
    return booking as Booking;
  }

  // Try by session ID ending
  console.log('⚠️  Booking non trovato per order_number, cercando per session ID...\n');
  
  const { data: bookings, error: searchError } = await supabase
    .from('booking')
    .select('*')
    .ilike('stripe_checkout_session_id', `%${orderNumber}%`)
    .limit(10);

  if (searchError || !bookings || bookings.length === 0) {
    console.error('❌ Booking non trovato');
    return null;
  }

  // Find exact match
  const foundBooking = bookings.find(b => 
    b.stripe_checkout_session_id?.toUpperCase().endsWith(orderNumber.toUpperCase())
  );

  if (foundBooking) {
    console.log('✅ Booking trovato per session ID!');
    return foundBooking as Booking;
  }

  console.error('❌ Booking non trovato');
  console.log('\nBooking trovati con session ID simile:');
  bookings.forEach(b => {
    console.log(`  - ${b.order_number || 'N/A'} (${b.stripe_checkout_session_id?.slice(-8) || 'N/A'})`);
  });

  return null;
}

async function sendConfirmationEmail(booking: Booking): Promise<boolean> {
  console.log(`\n📧 Invio email di conferma per booking ${booking.id}...\n`);
  
  try {
    const supabase = await import('https://esm.sh/@supabase/supabase-js@2').then(m => 
      m.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    );

    // Load activity time range from availability slot if available
    let activityTimeRange: string | null = null;
    
    if (booking.availability_slot_id) {
      const { data: slot, error: slotError } = await supabase
        .from('availability_slot')
        .select('time_slot, end_time')
        .eq('id', booking.availability_slot_id)
        .single();
      
      if (!slotError && slot?.time_slot) {
        // Format time range: "HH:MM - HH:MM" or just "HH:MM" if no end_time
        const formatTimeForDisplay = (timeStr: string | null): string => {
          if (!timeStr) return '';
          const timeParts = timeStr.split(':');
          if (timeParts.length >= 2) {
            const hours = timeParts[0].padStart(2, '0');
            const minutes = timeParts[1].padStart(2, '0');
            return `${hours}:${minutes}`;
          }
          return timeStr;
        };
        
        const startTime = formatTimeForDisplay(slot.time_slot);
        const endTime = formatTimeForDisplay(slot.end_time);
        
        if (endTime) {
          activityTimeRange = `${startTime} - ${endTime}`;
        } else {
          activityTimeRange = startTime;
        }
        
        console.log('   ⏰ Activity time range caricato:', activityTimeRange);
      }
    }

    // Get product to check no_adults flag
    const { data: product } = await supabase
      .from('product')
      .select('no_adults')
      .eq('name', booking.product_name)
      .single();

    const productNoAdults = booking.product_type !== 'trip' && product
      ? ((product as any).no_adults === true || (product as any).no_adults === 1)
      : false;

    const formatOrderNumber = (sessionId: string | null): string => {
      if (!sessionId) return booking.order_number || booking.id.slice(-8).toUpperCase();
      return sessionId.slice(-8).toUpperCase();
    };
    
    const emailPayload = {
      type: 'order_confirmation',
      bookingId: booking.id,
      customerEmail: booking.customer_email,
      customerName: booking.customer_name,
      customerSurname: booking.customer_surname || undefined,
      customerPhone: booking.customer_phone || undefined,
      productName: booking.product_name,
      productDescription: booking.product_description || undefined,
      productType: booking.product_type,
      bookingDate: booking.booking_date,
      bookingTime: activityTimeRange || booking.booking_time || undefined,
      numberOfAdults: booking.number_of_adults,
      numberOfDogs: booking.number_of_dogs,
      totalAmount: booking.total_amount_paid,
      currency: booking.currency,
      orderNumber: formatOrderNumber(booking.stripe_checkout_session_id),
      noAdults: productNoAdults,
    };
    
    console.log('   📤 Invio email con payload:');
    console.log('      - Customer:', emailPayload.customerEmail);
    console.log('      - Product:', emailPayload.productName);
    console.log('      - Date:', emailPayload.bookingDate);
    console.log('      - Time:', emailPayload.bookingTime || 'N/A');
    console.log('      - Order Number:', emailPayload.orderNumber);
    console.log('');
    
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
    
    if (emailResponse.ok) {
      const responseData = await emailResponse.json();
      console.log('   ✅ Email inviata con successo!');
      console.log('   📧 Response:', JSON.stringify(responseData, null, 2));
      
      // Mark as sent
      const { error: updateError } = await supabase
        .from('booking')
        .update({ confirmation_email_sent: true })
        .eq('id', booking.id);
      
      if (updateError) {
        console.error('   ⚠️  Errore nell\'aggiornamento del flag:', updateError);
        return false;
      }
      
      console.log('   ✅ Flag confirmation_email_sent aggiornato a true');
      return true;
    } else {
      const errorText = await emailResponse.text();
      console.error('   ❌ Errore nell\'invio email:');
      console.error('      Status:', emailResponse.status);
      console.error('      Response:', errorText);
      return false;
    }
  } catch (error) {
    console.error('   ❌ Errore:', error);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('📧 Fix Email Booking');
  console.log('========================================\n');
  
  try {
    const booking = await findBooking();
    
    if (!booking) {
      console.error('\n❌ Impossibile procedere: booking non trovato');
      Deno.exit(1);
    }

    console.log('\n📋 Dettagli Booking:');
    console.log('   ID:', booking.id);
    console.log('   Order Number:', booking.order_number || 'N/A');
    console.log('   Customer:', `${booking.customer_name} ${booking.customer_surname || ''}`.trim());
    console.log('   Email:', booking.customer_email);
    console.log('   Product:', booking.product_name);
    console.log('   Status Email:', booking.confirmation_email_sent ? '✅ Inviata' : '❌ Non inviata');
    console.log('');

    if (booking.confirmation_email_sent) {
      console.log('⚠️  Email già inviata. Vuoi inviarla comunque? (y/n)');
      // In modalità non interattiva, procediamo comunque
      console.log('   Procedendo con l\'invio...\n');
    }

    const success = await sendConfirmationEmail(booking);
    
    if (success) {
      console.log('\n✅ Email inviata con successo!');
    } else {
      console.log('\n❌ Errore nell\'invio email. Controlla i log sopra per dettagli.');
      Deno.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Errore:', error);
    Deno.exit(1);
  }
}

main();




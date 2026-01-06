/**
 * Script di test per verificare che le funzionalità di booking funzionino correttamente
 * 
 * Questo script:
 * 1. Trova i booking recenti (ultimi 10)
 * 2. Verifica che le email siano state inviate
 * 3. Verifica che i booking abbiano tutti i dati necessari
 * 4. Identifica booking con problemi
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface Booking {
  id: string;
  order_number: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  customer_email: string;
  customer_name: string;
  customer_surname: string | null;
  confirmation_email_sent: boolean;
  status: string;
  created_at: string;
  product_name: string;
  product_type: string;
  total_amount_paid: number;
  currency: string;
  booking_date: string;
  number_of_adults: number;
  number_of_dogs: number;
  provider_id: string | null;
}

interface BookingIssue {
  booking: Booking;
  issues: string[];
}

async function getRecentBookings(limit: number = 10): Promise<Booking[]> {
  console.log(`\n🔍 Recuperando ultimi ${limit} booking...\n`);
  
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/booking?select=*&order=created_at.desc&limit=${limit}`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to query bookings: ${response.status} - ${errorText}`);
  }

  const bookings: Booking[] = await response.json();
  return bookings;
}

function checkBookingIssues(booking: Booking): string[] {
  const issues: string[] = [];
  
  // Check email sent
  if (!booking.confirmation_email_sent) {
    issues.push('Email di conferma non inviata');
  }
  
  // Check required fields
  if (!booking.stripe_checkout_session_id) {
    issues.push('Stripe checkout session ID mancante');
  }
  
  if (!booking.stripe_payment_intent_id) {
    issues.push('Stripe payment intent ID mancante');
  }
  
  if (!booking.customer_email) {
    issues.push('Email cliente mancante');
  }
  
  if (!booking.customer_name) {
    issues.push('Nome cliente mancante');
  }
  
  if (!booking.provider_id) {
    issues.push('Provider ID mancante');
  }
  
  if (!booking.order_number) {
    issues.push('Order number mancante');
  }
  
  // Check status
  if (booking.status !== 'confirmed') {
    issues.push(`Status non confermato: ${booking.status}`);
  }
  
  return issues;
}

async function fixBookingEmail(booking: Booking): Promise<boolean> {
  console.log(`\n🔧 Invio email per booking ${booking.id}...\n`);
  
  try {
    // Load activity time range from availability slot if available
    let activityTimeRange: string | null = null;
    if (booking.availability_slot_id) {
      const slotResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/availability_slot?id=eq.${booking.availability_slot_id}&select=time_slot,end_time,product_id`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (slotResponse.ok) {
        const slots = await slotResponse.json();
        if (slots.length > 0 && slots[0].time_slot) {
          const formatTime = (timeStr: string | null): string => {
            if (!timeStr) return '';
            const parts = timeStr.split(':');
            if (parts.length >= 2) {
              return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
            }
            return timeStr;
          };
          
          const startTime = formatTime(slots[0].time_slot);
          const endTime = formatTime(slots[0].end_time);
          
          if (endTime) {
            activityTimeRange = `${startTime} - ${endTime}`;
          } else {
            activityTimeRange = startTime;
          }
        }
      }
    }
    
    // Get product to check no_adults flag
    const tableName = booking.product_type === 'class' ? 'class' : booking.product_type === 'experience' ? 'experience' : 'trip';
    let productNoAdults = false;
    
    if (booking.product_type !== 'trip' && booking.availability_slot_id) {
      const slotResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/availability_slot?id=eq.${booking.availability_slot_id}&select=product_id`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (slotResponse.ok) {
        const slots = await slotResponse.json();
        if (slots.length > 0 && slots[0].product_id) {
          const productResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${slots[0].product_id}&select=no_adults`,
            {
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );
          
          if (productResponse.ok) {
            const products = await productResponse.json();
            if (products.length > 0) {
              productNoAdults = products[0].no_adults === true || products[0].no_adults === 1;
            }
          }
        }
      }
    }
    
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
      bookingTime: activityTimeRange || undefined,
      numberOfAdults: booking.number_of_adults,
      numberOfDogs: booking.number_of_dogs,
      totalAmount: booking.total_amount_paid,
      currency: booking.currency,
      orderNumber: formatOrderNumber(booking.stripe_checkout_session_id),
      noAdults: productNoAdults,
    };
    
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
      // Mark as sent
      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/booking?id=eq.${booking.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ confirmation_email_sent: true }),
        }
      );
      
      return updateResponse.ok;
    } else {
      const errorText = await emailResponse.text();
      console.error('   ❌ Errore:', errorText);
      return false;
    }
  } catch (error) {
    console.error('   ❌ Errore:', error);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('🧪 Test Funzionalità Booking');
  console.log('========================================\n');
  
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY non impostata!');
    console.error('   Imposta la variabile d\'ambiente: export SUPABASE_SERVICE_ROLE_KEY=...');
    Deno.exit(1);
  }
  
  try {
    // Get recent bookings
    const bookings = await getRecentBookings(20);
    
    if (bookings.length === 0) {
      console.log('⚠️ Nessun booking trovato');
      return;
    }
    
    console.log(`✅ Trovati ${bookings.length} booking recenti\n`);
    
    // Check each booking for issues
    const bookingsWithIssues: BookingIssue[] = [];
    
    for (const booking of bookings) {
      const issues = checkBookingIssues(booking);
      if (issues.length > 0) {
        bookingsWithIssues.push({ booking, issues });
      }
    }
    
    // Report
    console.log('========================================');
    console.log('📊 Report');
    console.log('========================================\n');
    
    console.log(`Totale booking analizzati: ${bookings.length}`);
    console.log(`Booking senza problemi: ${bookings.length - bookingsWithIssues.length}`);
    console.log(`Booking con problemi: ${bookingsWithIssues.length}\n`);
    
    if (bookingsWithIssues.length > 0) {
      console.log('========================================');
      console.log('⚠️ Booking con Problemi');
      console.log('========================================\n');
      
      for (const { booking, issues } of bookingsWithIssues) {
        console.log(`📋 Booking #${booking.order_number || booking.id.slice(-8).toUpperCase()}`);
        console.log(`   ID: ${booking.id}`);
        console.log(`   Customer: ${booking.customer_name} (${booking.customer_email})`);
        console.log(`   Product: ${booking.product_name}`);
        console.log(`   Created: ${booking.created_at}`);
        console.log(`   Problemi:`);
        for (const issue of issues) {
          console.log(`     - ${issue}`);
        }
        console.log('');
      }
      
      // Ask to fix emails
      const emailIssues = bookingsWithIssues.filter(
        ({ issues }) => issues.includes('Email di conferma non inviata')
      );
      
      if (emailIssues.length > 0) {
        console.log('========================================');
        console.log('🔧 Fix Email Mancanti');
        console.log('========================================\n');
        
        for (const { booking } of emailIssues) {
          console.log(`📧 Invio email per booking #${booking.order_number || booking.id.slice(-8).toUpperCase()}...`);
          const success = await fixBookingEmail(booking);
          if (success) {
            console.log(`   ✅ Email inviata con successo!\n`);
          } else {
            console.log(`   ❌ Invio email fallito!\n`);
          }
        }
      }
    } else {
      console.log('✅ Tutti i booking sono in ordine!\n');
    }
    
    console.log('========================================');
    console.log('✅ Test completato!');
    console.log('========================================\n');
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}


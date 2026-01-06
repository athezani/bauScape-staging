/**
 * Script per eseguire i test Odoo PO
 * 
 * Questo script chiama la Supabase Edge Function test-odoo-po
 * per testare l'integrazione con booking esistenti.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Carica variabili d'ambiente
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL non configurato');
  Deno.exit(1);
}

if (!supabaseServiceKey && !supabaseAnonKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY o SUPABASE_ANON_KEY richiesti');
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

async function runTests() {
  console.log('🧪 ========================================');
  console.log('🧪 Test Odoo Purchase Order Integration');
  console.log('🧪 ========================================\n');

  // 1. Verifica booking disponibili
  console.log('📊 Step 1: Verifica booking disponibili...');
  const { data: bookings, error: bookingsError } = await supabase
    .from('booking')
    .select('id, product_id, provider_id, provider_cost_total, product_name, customer_email')
    .not('provider_cost_total', 'is', null)
    .gt('provider_cost_total', 0)
    .limit(20);

  if (bookingsError) {
    console.error('❌ Errore nel recupero booking:', bookingsError);
    Deno.exit(1);
  }

  if (!bookings || bookings.length === 0) {
    console.log('⚠️  Nessun booking trovato con provider_cost_total > 0');
    console.log('   Crea alcuni booking prima di eseguire i test.');
    Deno.exit(0);
  }

  console.log(`✅ Trovati ${bookings.length} booking con provider_cost_total > 0\n`);

  // 2. Raggruppa per prodotto + provider
  console.log('📊 Step 2: Analisi raggruppamento...');
  const groups = new Map<string, number>();
  for (const booking of bookings) {
    if (booking.product_id && booking.provider_id) {
      const key = `${booking.product_id}::${booking.provider_id}`;
      groups.set(key, (groups.get(key) || 0) + 1);
    }
  }

  console.log(`✅ Trovati ${groups.size} gruppi (prodotto + provider)`);
  console.log(`   Distribuzione:`);
  for (const [key, count] of groups.entries()) {
    const [productId, providerId] = key.split('::');
    console.log(`   - ${count} booking per prodotto ${productId.substring(0, 8)}... + provider ${providerId.substring(0, 8)}...`);
  }
  console.log('');

  // 3. Chiama la funzione di test
  console.log('🚀 Step 3: Esecuzione test (DRY RUN)...');
  console.log('   Questo è un test di simulazione - nessun PO verrà creato\n');

  const testParams = {
    limit: Math.min(bookings.length, 10),
    dryRun: true, // Prima dry-run per sicurezza
  };

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/test-odoo-po`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey || supabaseAnonKey}`,
      },
      body: JSON.stringify(testParams),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    console.log('📊 Risultati Test (DRY RUN):');
    console.log('========================================');
    console.log(JSON.stringify(result, null, 2));
    console.log('========================================\n');

    if (result.success) {
      console.log('✅ Test completato con successo!');
      console.log(`   - Booking processati: ${result.summary?.totalBookings || 0}`);
      console.log(`   - Gruppi trovati: ${result.summary?.totalGroups || 0}`);
      console.log(`   - PO previsti: ${result.summary?.expectedPOs || 0}`);
      
      if (result.summary?.groupingErrors && result.summary.groupingErrors > 0) {
        console.log(`   ⚠️  Errori di raggruppamento: ${result.summary.groupingErrors}`);
      } else {
        console.log('   ✅ Nessun errore di raggruppamento');
      }

      // Chiedi conferma per test reale
      console.log('\n❓ Vuoi eseguire il test REALE (crea PO in Odoo)?');
      console.log('   Modifica dryRun: false nello script e riesegui.');
    } else {
      console.error('❌ Test fallito:', result.error);
      Deno.exit(1);
    }
  } catch (error) {
    console.error('❌ Errore durante l\'esecuzione del test:', error);
    Deno.exit(1);
  }
}

// Esegui i test
runTests().catch((error) => {
  console.error('❌ Errore fatale:', error);
  Deno.exit(1);
});


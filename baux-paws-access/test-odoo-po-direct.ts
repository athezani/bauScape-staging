/**
 * Script diretto per testare Odoo PO Integration
 * 
 * Questo script testa direttamente la logica senza passare per HTTP,
 * importando le funzioni e testandole con booking esistenti.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getActiveOdooConfig,
  validateOdooConfig,
  createOdooPurchaseOrder,
} from './supabase/functions/_shared/odoo/index.ts';
import { mapBookingToOdoo, validateBookingDataForOdoo } from './supabase/functions/_shared/odoo/bookingMapper.ts';

// Carica variabili d'ambiente
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devono essere configurati');
  console.error('   Esporta le variabili o crea un file .env');
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestResult {
  success: boolean;
  bookingId: string;
  productId: string;
  providerId: string;
  poId?: number;
  action: 'created' | 'updated' | 'skipped' | 'error';
  error?: string;
}

interface GroupingResult {
  productId: string;
  providerId: string;
  productName: string;
  providerName: string;
  bookingCount: number;
  poId?: number;
  bookings: Array<{
    bookingId: string;
    customerEmail: string;
    providerCostTotal: number;
  }>;
}

async function runDirectTests() {
  console.log('🧪 ========================================');
  console.log('🧪 Test Diretto Odoo Purchase Order Integration');
  console.log('🧪 ========================================\n');

  // 1. Verifica configurazione Odoo (opzionale per dry run)
  console.log('📊 Step 1: Verifica configurazione Odoo...');
  const config = getActiveOdooConfig();
  const hasOdooConfig = config && validateOdooConfig(config);
  
  if (hasOdooConfig) {
    console.log('✅ Configurazione Odoo OK');
    console.log(`   URL: ${config.url}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   Username: ${config.username || '(not set)'}\n`);
  } else {
    console.log('⚠️  Configurazione Odoo non disponibile (OK per dry run)');
    console.log('   Configura OD_URL, OD_DB_NAME, OD_LOGIN, OD_API_KEY per test reali\n');
  }

  // 2. Verifica booking disponibili
  console.log('📊 Step 2: Verifica booking disponibili...');
  const { data: bookings, error: bookingsError } = await supabase
    .from('booking')
    .select(`
      id,
      order_number,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      customer_email,
      customer_name,
      customer_surname,
      customer_phone,
      customer_fiscal_code,
      customer_address,
      product_type,
      availability_slot_id,
      product_name,
      product_description,
      provider_id,
      booking_date,
      booking_time,
      number_of_adults,
      number_of_dogs,
      total_amount_paid,
      currency,
      provider_cost_total,
      stripe_fee,
      internal_margin,
      net_revenue,
      trip_start_date,
      trip_end_date
    `)
    .not('provider_cost_total', 'is', null)
    .gt('provider_cost_total', 0)
    .order('created_at', { ascending: false })
    .limit(50); // Aumentato per avere più prodotti disponibili

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

  // 3. Recupera product_id da availability_slot per ogni booking
  console.log('📊 Step 3: Recupero product_id da availability_slot...');
  const availabilitySlotIds = bookings
    .map((b: any) => b.availability_slot_id)
    .filter(Boolean) as string[];

  const productIdMap = new Map<string, string>(); // Map: booking_id -> product_id

  if (availabilitySlotIds.length > 0) {
    const { data: slots } = await supabase
      .from('availability_slot')
      .select('id, product_id, product_type')
      .in('id', availabilitySlotIds);

    // Crea mappa: availability_slot_id -> product_id
    const slotToProductMap = new Map(
      (slots || []).map((s: any) => [s.id, s.product_id])
    );

    // Mappa booking_id -> product_id
    for (const booking of bookings) {
      if (booking.availability_slot_id && slotToProductMap.has(booking.availability_slot_id)) {
        productIdMap.set(booking.id, slotToProductMap.get(booking.availability_slot_id)!);
      }
    }
  }

  console.log(`✅ Recuperati ${productIdMap.size} product_id da availability_slot\n`);

  // 4. Raggruppa per prodotto + provider
  console.log('📊 Step 4: Analisi raggruppamento...');
  const groups = new Map<string, GroupingResult>();
  
  for (const booking of bookings) {
    if (!booking.provider_id) {
      console.warn(`⚠️  Booking ${booking.id} senza provider_id, saltato`);
      continue;
    }

    // Recupera product_id da availability_slot o usa product_name come fallback
    const productId = productIdMap.get(booking.id);
    
    if (!productId) {
      console.warn(`⚠️  Booking ${booking.id} senza product_id (non ha availability_slot_id o slot non trovato), saltato`);
      continue;
    }

    const key = `${productId}::${booking.provider_id}`;
    
    if (!groups.has(key)) {
      groups.set(key, {
        productId: productId,
        providerId: booking.provider_id,
        productName: booking.product_name || 'Unknown Product',
        providerName: 'Unknown Provider', // Sarà aggiornato dopo
        bookingCount: 0,
        bookings: [],
      });
    }

    const group = groups.get(key)!;
    group.bookingCount++;
    group.bookings.push({
      bookingId: booking.id,
      customerEmail: booking.customer_email,
      providerCostTotal: booking.provider_cost_total,
    });
  }

  console.log(`✅ Trovati ${groups.size} gruppi (prodotto + provider)`);
  for (const [key, group] of groups.entries()) {
    console.log(`   - ${group.bookingCount} booking per "${group.productName}" + provider ${group.providerId.substring(0, 8)}...`);
  }
  console.log('');

  // 5. Fetch provider e product data
  const providerIds = [...new Set(Array.from(groups.values()).map(g => g.providerId))];
  const productIds = [...new Set(Array.from(groups.values()).map(g => g.productId))];

  console.log(`📊 Step 5: Caricamento dati provider e prodotti...`);
  const { data: providers } = await supabase
    .from('profile')
    .select('id, company_name, contact_name, email, phone')
    .in('id', providerIds);

  const providersMap = new Map((providers || []).map((p: any) => [p.id, p]));

  const productsMap = new Map();
  
  // Raggruppa product_id per tipo per query più efficienti
  const productsByType = new Map<'experience' | 'class' | 'trip', string[]>();
  
  for (const booking of bookings) {
    const productId = productIdMap.get(booking.id);
    if (!productId || !booking.product_type) continue;
    
    if (!productsByType.has(booking.product_type)) {
      productsByType.set(booking.product_type, []);
    }
    const typeProducts = productsByType.get(booking.product_type)!;
    if (!typeProducts.includes(productId)) {
      typeProducts.push(productId);
    }
  }

  // Carica prodotti per tipo
  for (const [productType, productIds] of productsByType.entries()) {
    if (productIds.length === 0) continue;
    
    const tableName = productType === 'experience' ? 'experience' :
                     productType === 'class' ? 'class' : 'trip';
    
    const { data: products } = await supabase
      .from(tableName)
      .select('id, name, description')
      .in('id', productIds);
    
    if (products) {
      for (const product of products) {
        productsMap.set(product.id, product);
      }
    }
  }

  // Aggiorna nomi provider nei gruppi
  for (const group of groups.values()) {
    const provider = providersMap.get(group.providerId);
    if (provider) {
      group.providerName = provider.company_name;
    }
  }

  console.log(`✅ Caricati ${providersMap.size} provider e ${productsMap.size} prodotti\n`);

  // 6. Seleziona gruppi da testare
  // Se ci sono più di 2 gruppi, prendi i primi 2 (anche se già testati, testeremo i duplicati)
  // Altrimenti usa tutti i gruppi disponibili
  const filteredGroups = new Map<string, GroupingResult>();
  let selectedCount = 0;
  const maxGroups = Math.min(2, groups.size);
  
  for (const [key, group] of groups.entries()) {
    filteredGroups.set(key, group);
    selectedCount++;
    if (selectedCount >= maxGroups) break;
  }
  
  console.log(`📊 Selezionati ${filteredGroups.size} prodotti da testare\n`);

  // 7. Processa ogni gruppo - PRIMA ESECUZIONE (crea PO e aggiunge tutte le righe)
  const dryRun = false; // TEST REALE: crea PO in Odoo
  
  console.log('🚀 Step 7: PRIMA ESECUZIONE - Creazione PO e aggiunta righe...\n');
  
  const results: TestResult[] = [];

  for (const [key, group] of filteredGroups.entries()) {
    console.log(`📦 Processando gruppo: ${group.productName} - ${group.providerName}`);
    console.log(`   Booking in questo gruppo: ${group.bookingCount}`);

    // Trova TUTTI i booking di questo gruppo
    const groupBookings = bookings.filter((b: any) => {
      const bookingProductId = productIdMap.get(b.id);
      return bookingProductId === group.productId && b.provider_id === group.providerId;
    });

    if (groupBookings.length === 0) {
      console.warn(`   ⚠️  Nessun booking trovato per questo gruppo, saltato`);
      continue;
    }

    const provider = providersMap.get(group.providerId);
    const product = productsMap.get(group.productId);

    if (!provider || !product) {
      console.warn(`   ⚠️  Provider o prodotto non trovato, saltato`);
      continue;
    }

    if (!config) {
      console.error(`   ❌ Configurazione Odoo non disponibile`);
      continue;
    }

    // Processa TUTTI i booking del gruppo
    let firstPoId: number | undefined;
    for (const booking of groupBookings) {
      const bookingWithProductId = {
        ...booking,
        product_id: group.productId,
      };

      const bookingData = mapBookingToOdoo(bookingWithProductId, provider, product);

      // Valida
      const validationErrors = validateBookingDataForOdoo(bookingData);
      if (validationErrors.length > 0) {
        console.error(`   ❌ Booking ${booking.id}: Errori di validazione: ${validationErrors.join(', ')}`);
        continue;
      }

      try {
        const poResult = await createOdooPurchaseOrder(config, bookingData);
        
        if (poResult.success && poResult.purchaseOrderId) {
          if (!firstPoId) firstPoId = poResult.purchaseOrderId;
          group.poId = poResult.purchaseOrderId;
          
          if (poResult.skipped) {
            console.log(`   ⚠️  Booking ${booking.id.substring(0, 8)}...: Riga già esistente, saltata`);
            results.push({
              success: true,
              bookingId: booking.id,
              productId: group.productId,
              providerId: group.providerId,
              poId: poResult.purchaseOrderId,
              action: 'skipped',
            });
          } else {
            console.log(`   ✅ Booking ${booking.id.substring(0, 8)}...: Riga aggiunta a PO ${poResult.purchaseOrderId}`);
            results.push({
              success: true,
              bookingId: booking.id,
              productId: group.productId,
              providerId: group.providerId,
              poId: poResult.purchaseOrderId,
              action: 'created',
            });
          }
        } else {
          throw new Error(poResult.error || 'PO creation failed');
        }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`   ❌ Booking ${booking.id.substring(0, 8)}...: Errore: ${errorMessage}`);
          results.push({
            success: false,
            bookingId: booking.id,
            productId: group.productId,
            providerId: group.providerId,
            action: 'error',
            error: errorMessage,
          });
        }
    }

    console.log('');
  }

  // 8. SECONDA ESECUZIONE - Test prevenzione duplicati
  console.log('\n🔄 Step 8: SECONDA ESECUZIONE - Test prevenzione duplicati...\n');
  console.log('   Eseguendo di nuovo gli stessi booking per verificare che non vengano create righe duplicate...\n');
  
  const duplicateTestResults: TestResult[] = [];
  let duplicateSkippedCount = 0;
  let duplicateCreatedCount = 0;

  for (const [key, group] of filteredGroups.entries()) {
    console.log(`📦 Test duplicati per: ${group.productName} - ${group.providerName}`);

    const groupBookings = bookings.filter((b: any) => {
      const bookingProductId = productIdMap.get(b.id);
      return bookingProductId === group.productId && b.provider_id === group.providerId;
    });

    if (groupBookings.length === 0) continue;

    const provider = providersMap.get(group.providerId);
    const product = productsMap.get(group.productId);

    if (!provider || !product || !config) continue;

    // Processa di nuovo TUTTI i booking (dovrebbero essere tutti saltati come duplicati)
    for (const booking of groupBookings) {
      const bookingWithProductId = {
        ...booking,
        product_id: group.productId,
      };

      const bookingData = mapBookingToOdoo(bookingWithProductId, provider, product);

      try {
        const poResult = await createOdooPurchaseOrder(config, bookingData);
        
        if (poResult.success) {
          if (poResult.skipped) {
            duplicateSkippedCount++;
            console.log(`   ✅ Booking ${booking.id.substring(0, 8)}...: DUPLICATO RILEVATO E SALTATO (corretto!)`);
            duplicateTestResults.push({
              success: true,
              bookingId: booking.id,
              productId: group.productId,
              providerId: group.providerId,
              poId: poResult.purchaseOrderId,
              action: 'skipped',
            });
          } else {
            duplicateCreatedCount++;
            console.log(`   ⚠️  Booking ${booking.id.substring(0, 8)}...: RIGA CREATA (dovrebbe essere saltata!)`);
            duplicateTestResults.push({
              success: true,
              bookingId: booking.id,
              productId: group.productId,
              providerId: group.providerId,
              poId: poResult.purchaseOrderId,
              action: 'created',
            });
          }
        } else {
          console.error(`   ❌ Booking ${booking.id.substring(0, 8)}...: Errore: ${poResult.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`   ❌ Booking ${booking.id.substring(0, 8)}...: Errore: ${errorMessage}`);
      }
    }
  }

  console.log('\n');

  // 9. Verifica raggruppamento
  console.log('📊 Step 9: Verifica raggruppamento...');
  const poIdByGroup = new Map<string, number>();
  let groupingErrors = 0;

  for (const result of results) {
    if (result.success && result.poId) {
      const key = `${result.productId}::${result.providerId}`;
      if (!poIdByGroup.has(key)) {
        poIdByGroup.set(key, result.poId);
      } else {
        const existingPoId = poIdByGroup.get(key)!;
        if (existingPoId !== result.poId) {
          console.error(`   ❌ ERRORE: Bookings nello stesso gruppo hanno PO ID diversi!`);
          console.error(`      Gruppo: ${key}`);
          console.error(`      PO atteso: ${existingPoId}, Ottenuto: ${result.poId}`);
          groupingErrors++;
        }
      }
    }
  }

  // 10. Riepilogo completo
  console.log('\n📊 ========================================');
  console.log('📊 Riepilogo Test Completo');
  console.log('📊 ========================================');
  console.log(`\n📦 PRIMA ESECUZIONE (Creazione PO):`);
  console.log(`   Prodotti testati: ${filteredGroups.size}`);
  console.log(`   Booking processati: ${results.length}`);
  console.log(`   Booking con successo: ${results.filter(r => r.success && !r.action.includes('skipped')).length}`);
  console.log(`   Booking saltati (duplicati): ${results.filter(r => r.action === 'skipped').length}`);
  console.log(`   Booking falliti: ${results.filter(r => !r.success).length}`);
  console.log(`   PO creati/aggiornati: ${poIdByGroup.size}`);
  console.log(`   Errori raggruppamento: ${groupingErrors}`);
  
  console.log(`\n🔄 SECONDA ESECUZIONE (Test duplicati):`);
  if (duplicateTestResults.length > 0) {
    console.log(`   Booking processati: ${duplicateTestResults.length}`);
    console.log(`   ✅ Duplicati correttamente saltati: ${duplicateSkippedCount}`);
    console.log(`   ⚠️  Duplicati erroneamente creati: ${duplicateCreatedCount}`);
    
    if (duplicateCreatedCount > 0) {
      console.log(`\n   ❌ ERRORE: ${duplicateCreatedCount} righe duplicate sono state create!`);
      console.log(`   Il controllo di idempotenza non funziona correttamente.`);
    } else if (duplicateSkippedCount > 0) {
      console.log(`\n   ✅ SUCCESSO: Tutti i duplicati sono stati correttamente rilevati e saltati!`);
    }
  } else {
    console.log(`   ⚠️  Seconda esecuzione non completata (nessun booking processato)`);
  }
  
  console.log('\n========================================\n');

  if (groupingErrors > 0) {
    console.error('❌ Test FALLITO: Errori di raggruppamento rilevati!');
    Deno.exit(1);
  } else if (results.filter(r => !r.success).length > 0) {
    console.warn('⚠️  Test completato con alcuni errori (vedi dettagli sopra)');
  } else {
    console.log('✅ Test completato con successo!');
    if (dryRun) {
      console.log('\n💡 Per eseguire il test REALE (creare PO in Odoo):');
      console.log('   Cambia dryRun = false nello script e riesegui');
    }
  }
}

// Esegui i test
runDirectTests().catch((error) => {
  console.error('❌ Errore fatale:', error);
  Deno.exit(1);
});


/**
 * Test Script: Verifica Thank You Page Completa
 * 
 * Questo script testa 10 thank you page diverse per verificare che tutte le informazioni
 * vengano visualizzate correttamente (immagini, highlights, included/excluded items,
 * programma, meeting info, cancellation policy, etc.)
 * 
 * Usage:
 *   npx tsx test-thank-you-page-complete.ts
 */

import { createClient } from '@supabase/supabase-js';

interface TestProduct {
  id: string;
  name: string;
  type: 'experience' | 'class' | 'trip';
  hasDescription: boolean;
  hasHighlights: boolean;
  hasIncludedItems: boolean;
  hasExcludedItems: boolean;
  hasMeetingInfo: boolean;
  hasCancellationPolicy: boolean;
  hasProgram: boolean;
  hasLocation: boolean;
  hasDuration: boolean;
  images: string[] | null;
}

interface TestResult {
  product: TestProduct;
  apiResponse: any;
  success: boolean;
  errors: string[];
  warnings: string[];
}

// Configurazione Supabase - Prova a leggere da .env.local o variabili d'ambiente
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                  process.env.VITE_SUPABASE_URL || 
                  process.env.SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                      process.env.VITE_SUPABASE_ANON_KEY || 
                      process.env.SUPABASE_ANON_KEY;

// Se non trovato, prova a leggere da .env.local
if (!supabaseUrl || !supabaseAnonKey) {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const envLines = envContent.split('\n');
      for (const line of envLines) {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=') && !supabaseUrl) {
          supabaseUrl = line.split('=')[1]?.trim().replace(/^["']|["']$/g, '');
        }
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=') && !supabaseAnonKey) {
          supabaseAnonKey = line.split('=')[1]?.trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  } catch (e) {
    // Ignore
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Errore: Variabili d\'ambiente Supabase mancanti');
  console.error('   Assicurati di avere una di queste variabili impostata:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL o VITE_SUPABASE_URL o SUPABASE_URL');
  console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY o VITE_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY');
  console.error('\n   Puoi esportarle come variabili d\'ambiente o aggiungerle a .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Carica 10 prodotti diversi dal database (mix di experience, class, trip)
 */
async function fetchTestProducts(): Promise<TestProduct[]> {
  const products: TestProduct[] = [];
  
  // Carica 4 esperienze
  const { data: experiences, error: expError } = await supabase
    .from('experience')
    .select('id, name, description, highlights, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy, images, duration_hours, location')
    .eq('active', true)
    .limit(4);
  
  if (!expError && experiences) {
    for (const exp of experiences) {
      products.push({
        id: exp.id,
        name: exp.name,
        type: 'experience',
        hasDescription: !!exp.description,
        hasHighlights: Array.isArray(exp.highlights) && exp.highlights.length > 0,
        hasIncludedItems: Array.isArray(exp.included_items) && exp.included_items.length > 0,
        hasExcludedItems: Array.isArray(exp.excluded_items) && exp.excluded_items.length > 0,
        hasMeetingInfo: exp.show_meeting_info === true && !!exp.meeting_info,
        hasCancellationPolicy: !!exp.cancellation_policy,
        hasProgram: false, // Will check separately
        hasLocation: !!exp.location,
        hasDuration: !!exp.duration_hours,
        images: exp.images,
      });
    }
  }
  
  // Carica 3 classi
  const { data: classes, error: classError } = await supabase
    .from('class')
    .select('id, name, description, highlights, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy, images, duration_hours, location')
    .eq('active', true)
    .limit(3);
  
  if (!classError && classes) {
    for (const cls of classes) {
      products.push({
        id: cls.id,
        name: cls.name,
        type: 'class',
        hasDescription: !!cls.description,
        hasHighlights: Array.isArray(cls.highlights) && cls.highlights.length > 0,
        hasIncludedItems: Array.isArray(cls.included_items) && cls.included_items.length > 0,
        hasExcludedItems: Array.isArray(cls.excluded_items) && cls.excluded_items.length > 0,
        hasMeetingInfo: cls.show_meeting_info === true && !!cls.meeting_info,
        hasCancellationPolicy: !!cls.cancellation_policy,
        hasProgram: false, // Will check separately
        hasLocation: !!cls.location,
        hasDuration: !!cls.duration_hours,
        images: cls.images,
      });
    }
  }
  
  // Carica 3 viaggi
  const { data: trips, error: tripError } = await supabase
    .from('trip')
    .select('id, name, description, highlights, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy, images, duration_days, location, start_date')
    .eq('active', true)
    .limit(3);
  
  if (!tripError && trips) {
    for (const trip of trips) {
      products.push({
        id: trip.id,
        name: trip.name,
        type: 'trip',
        hasDescription: !!trip.description,
        hasHighlights: Array.isArray(trip.highlights) && trip.highlights.length > 0,
        hasIncludedItems: Array.isArray(trip.included_items) && trip.included_items.length > 0,
        hasExcludedItems: Array.isArray(trip.excluded_items) && trip.excluded_items.length > 0,
        hasMeetingInfo: trip.show_meeting_info === true && !!trip.meeting_info,
        hasCancellationPolicy: !!trip.cancellation_policy,
        hasProgram: false, // Will check separately
        hasLocation: !!trip.location,
        hasDuration: !!trip.duration_days,
        images: trip.images,
      });
    }
  }
  
  // Verifica programma per tutti i prodotti
  for (const product of products) {
    const { data: programDays, error: programError } = await supabase
      .from('trip_program_day')
      .select('id')
      .eq('product_id', product.id)
      .eq('product_type', product.type)
      .limit(1);
    
    product.hasProgram = !programError && programDays && programDays.length > 0;
  }
  
  return products.slice(0, 10); // Prendi solo i primi 10
}

/**
 * Carica 10 booking esistenti dal database per testare la thank you page
 */
async function fetchTestBookings(): Promise<Array<{ sessionId: string; productId: string; productType: string; productName: string }>> {
  const { data: bookings, error } = await supabase
    .from('booking')
    .select('stripe_checkout_session_id, product_id, product_type, product_name')
    .not('stripe_checkout_session_id', 'is', null)
    .limit(10);
  
  if (error || !bookings) {
    console.warn('⚠️  Impossibile caricare booking dal database, userò prodotti invece');
    return [];
  }
  
  return bookings
    .filter(b => b.stripe_checkout_session_id && b.product_id && b.product_type)
    .map(b => ({
      sessionId: b.stripe_checkout_session_id!,
      productId: b.product_id,
      productType: b.product_type,
      productName: b.product_name || 'Prodotto',
    }));
}

/**
 * Testa l'API get-checkout-session per una sessione esistente
 */
async function testThankYouPageAPI(sessionId: string, productId: string, productType: string): Promise<TestResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Chiama l'API get-checkout-session
    const apiUrl = `${supabaseUrl}/functions/v1/get-checkout-session?session_id=${sessionId}`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      errors.push(`API error: ${response.status} - ${errorText}`);
      return {
        product: {
          id: productId,
          name: 'Unknown',
          type: productType as any,
          hasDescription: false,
          hasHighlights: false,
          hasIncludedItems: false,
          hasExcludedItems: false,
          hasMeetingInfo: false,
          hasCancellationPolicy: false,
          hasProgram: false,
          hasLocation: false,
          hasDuration: false,
          images: null,
        },
        apiResponse: {},
        success: false,
        errors,
        warnings,
      };
    }
    
    const apiData = await response.json();
    
    // Verifica che i dati siano presenti
    const checks = {
      hasDescription: !!apiData.product?.description,
      hasHighlights: Array.isArray(apiData.product?.highlights) && apiData.product.highlights.length > 0,
      hasIncludedItems: Array.isArray(apiData.product?.included_items) && apiData.product.included_items.length > 0,
      hasExcludedItems: Array.isArray(apiData.product?.excluded_items) && apiData.product.excluded_items.length > 0,
      hasMeetingInfo: apiData.product?.show_meeting_info === true && !!apiData.product?.meeting_info,
      hasCancellationPolicy: !!apiData.product?.cancellation_policy,
      hasProgram: !!apiData.product?.program && Array.isArray(apiData.product.program.days) && apiData.product.program.days.length > 0,
      hasLocation: !!apiData.product?.location,
      hasDuration: !!(apiData.product?.duration_hours || apiData.product?.duration_days),
      hasImages: Array.isArray(apiData.product?.images) && apiData.product.images.length > 0,
    };
    
    // Verifica che almeno alcuni dati siano presenti
    const hasAnyData = Object.values(checks).some(v => v === true);
    
    if (!hasAnyData) {
      warnings.push('Prodotto senza dati aggiuntivi (solo informazioni base)');
    }
    
    // Verifica immagini
    if (!checks.hasImages) {
      warnings.push('Prodotto senza immagini personalizzate (userà placeholder)');
    }
    
    // Verifica che il programma sia completo se presente
    if (checks.hasProgram) {
      const program = apiData.product.program;
      if (!program.days || program.days.length === 0) {
        errors.push('Programma presente ma senza giorni');
      } else {
        for (const day of program.days) {
          if (!day.id || !day.day_number) {
            errors.push(`Giorno programma incompleto: ${JSON.stringify(day)}`);
          }
        }
      }
    }
    
    return {
      product: {
        id: productId,
        name: apiData.product?.name || 'Unknown',
        type: productType as any,
        hasDescription: checks.hasDescription,
        hasHighlights: checks.hasHighlights,
        hasIncludedItems: checks.hasIncludedItems,
        hasExcludedItems: checks.hasExcludedItems,
        hasMeetingInfo: checks.hasMeetingInfo,
        hasCancellationPolicy: checks.hasCancellationPolicy,
        hasProgram: checks.hasProgram,
        hasLocation: checks.hasLocation,
        hasDuration: checks.hasDuration,
        images: apiData.product?.images || null,
      },
      apiResponse: checks,
      success: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(`Errore nella chiamata API: ${error instanceof Error ? error.message : String(error)}`);
    return {
      product: {
        id: productId,
        name: 'Unknown',
        type: productType as any,
        hasDescription: false,
        hasHighlights: false,
        hasIncludedItems: false,
        hasExcludedItems: false,
        hasMeetingInfo: false,
        hasCancellationPolicy: false,
        hasProgram: false,
        hasLocation: false,
        hasDuration: false,
        images: null,
      },
      apiResponse: {},
      success: false,
      errors,
      warnings,
    };
  }
}

/**
 * Esegue tutti i test
 */
async function runTests() {
  console.log('🧪 Test Thank You Page Completa');
  console.log('='.repeat(80));
  console.log('');
  
  // Prova prima a caricare booking esistenti
  console.log('📦 Caricamento booking esistenti dal database...');
  let bookings = await fetchTestBookings();
  
  // Se non ci sono booking, usa prodotti
  if (bookings.length === 0) {
    console.log('⚠️  Nessun booking trovato, carico prodotti invece...');
    const products = await fetchTestProducts();
    
    if (products.length === 0) {
      console.error('❌ Nessun prodotto trovato nel database');
      process.exit(1);
    }
    
    // Simula booking per prodotti (non possiamo testare l'API senza session_id validi)
    console.log(`✅ Trovati ${products.length} prodotti, ma per testare l'API servono session_id validi`);
    console.log('   Creare manualmente alcune sessioni di checkout per testare completamente.\n');
    
    // Mostra solo i dati disponibili per i prodotti
    for (let i = 0; i < Math.min(products.length, 10); i++) {
      const product = products[i];
      console.log(`\n[${i + 1}/${Math.min(products.length, 10)}] Prodotto: ${product.name} (${product.type})`);
      
      const dataSummary = [];
      if (product.hasDescription) dataSummary.push('Descrizione');
      if (product.hasHighlights) dataSummary.push('Highlights');
      if (product.hasIncludedItems) dataSummary.push('Inclusi');
      if (product.hasExcludedItems) dataSummary.push('Esclusi');
      if (product.hasMeetingInfo) dataSummary.push('Meeting Info');
      if (product.hasCancellationPolicy) dataSummary.push('Cancellation Policy');
      if (product.hasProgram) dataSummary.push('Programma');
      if (product.hasLocation) dataSummary.push('Location');
      if (product.hasDuration) dataSummary.push('Durata');
      if (product.images && product.images.length > 0) dataSummary.push('Immagini');
      
      console.log(`  ✅ Dati disponibili nel DB: ${dataSummary.length > 0 ? dataSummary.join(', ') : 'Nessuno (solo base)'}`);
    }
    
    console.log('\n⚠️  Per testare completamente la thank you page, servono session_id validi da Stripe.');
    console.log('   Esegui alcuni checkout di test e poi riprova questo script.\n');
    process.exit(0);
  }
  
  console.log(`✅ Trovati ${bookings.length} booking da testare\n`);
  
  const results: TestResult[] = [];
  
  for (let i = 0; i < Math.min(bookings.length, 10); i++) {
    const booking = bookings[i];
    console.log(`\n[${i + 1}/${Math.min(bookings.length, 10)}] Testando: ${booking.productName} (${booking.productType})`);
    console.log(`  Session ID: ${booking.sessionId.substring(0, 20)}...`);
    
    const result = await testThankYouPageAPI(booking.sessionId, booking.productId, booking.productType);
    results.push(result);
    
    if (result.errors.length > 0) {
      console.log(`  ❌ Errori: ${result.errors.join(', ')}`);
    }
    if (result.warnings.length > 0) {
      console.log(`  ⚠️  Avvisi: ${result.warnings.join(', ')}`);
    }
    
    // Mostra riepilogo dati disponibili
    const dataSummary = [];
    if (result.apiResponse.hasDescription) dataSummary.push('Descrizione');
    if (result.apiResponse.hasHighlights) dataSummary.push('Highlights');
    if (result.apiResponse.hasIncludedItems) dataSummary.push('Inclusi');
    if (result.apiResponse.hasExcludedItems) dataSummary.push('Esclusi');
    if (result.apiResponse.hasMeetingInfo) dataSummary.push('Meeting Info');
    if (result.apiResponse.hasCancellationPolicy) dataSummary.push('Cancellation Policy');
    if (result.apiResponse.hasProgram) dataSummary.push('Programma');
    if (result.apiResponse.hasLocation) dataSummary.push('Location');
    if (result.apiResponse.hasDuration) dataSummary.push('Durata');
    if (result.apiResponse.hasImages) dataSummary.push('Immagini');
    
    console.log(`  ✅ Dati disponibili: ${dataSummary.length > 0 ? dataSummary.join(', ') : 'Nessuno (solo base)'}`);
  }
  
  // Genera report finale
  console.log('\n' + '='.repeat(80));
  console.log('📊 REPORT FINALE');
  console.log('='.repeat(80));
  
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const testsWithErrors = results.filter(r => r.errors.length > 0).length;
  const testsWithWarnings = results.filter(r => r.warnings.length > 0).length;
  
  console.log(`\n✅ Test completati: ${successfulTests}/${totalTests}`);
  console.log(`❌ Test con errori: ${testsWithErrors}`);
  console.log(`⚠️  Test con avvisi: ${testsWithWarnings}`);
  
  // Statistiche dati
  const stats = {
    hasDescription: results.filter(r => r.apiResponse.hasDescription).length,
    hasHighlights: results.filter(r => r.apiResponse.hasHighlights).length,
    hasIncludedItems: results.filter(r => r.apiResponse.hasIncludedItems).length,
    hasExcludedItems: results.filter(r => r.apiResponse.hasExcludedItems).length,
    hasMeetingInfo: results.filter(r => r.apiResponse.hasMeetingInfo).length,
    hasCancellationPolicy: results.filter(r => r.apiResponse.hasCancellationPolicy).length,
    hasProgram: results.filter(r => r.apiResponse.hasProgram).length,
    hasLocation: results.filter(r => r.apiResponse.hasLocation).length,
    hasDuration: results.filter(r => r.apiResponse.hasDuration).length,
    hasImages: results.filter(r => r.apiResponse.hasImages).length,
  };
  
  console.log('\n📈 Statistiche Dati Disponibili:');
  console.log(`  Descrizione: ${stats.hasDescription}/${totalTests}`);
  console.log(`  Highlights: ${stats.hasHighlights}/${totalTests}`);
  console.log(`  Included Items: ${stats.hasIncludedItems}/${totalTests}`);
  console.log(`  Excluded Items: ${stats.hasExcludedItems}/${totalTests}`);
  console.log(`  Meeting Info: ${stats.hasMeetingInfo}/${totalTests}`);
  console.log(`  Cancellation Policy: ${stats.hasCancellationPolicy}/${totalTests}`);
  console.log(`  Programma: ${stats.hasProgram}/${totalTests}`);
  console.log(`  Location: ${stats.hasLocation}/${totalTests}`);
  console.log(`  Durata: ${stats.hasDuration}/${totalTests}`);
  console.log(`  Immagini: ${stats.hasImages}/${totalTests}`);
  
  if (successfulTests === totalTests && testsWithErrors === 0) {
    console.log('\n✅ Tutti i test sono passati con successo!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Alcuni test hanno avvisi o errori. Verifica i dettagli sopra.');
    process.exit(1);
  }
}

// Esegui i test
runTests().catch(error => {
  console.error('❌ Errore durante l\'esecuzione dei test:', error);
  process.exit(1);
});


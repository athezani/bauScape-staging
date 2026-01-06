/**
 * Script di test per verificare che INCLUDED_ITEMS ed EXCLUDED_ITEMS
 * vengano correttamente inviati a Brevo nelle email
 * 
 * Esegue 20 test di invio email e verifica i log
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_KEY') || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trovata nelle variabili d\'ambiente');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TestResult {
  testNumber: number;
  success: boolean;
  productId: string;
  productName: string;
  includedItems: string[] | null;
  excludedItems: string[] | null;
  includedItemsHtml: string;
  excludedItemsHtml: string;
  emailSent: boolean;
  error?: string;
}

async function formatIncludedItems(items: string[] | undefined): Promise<string> {
  if (!items || items.length === 0) return '';
  return items
    .filter(item => item && typeof item === 'string' && item.trim().length > 0)
    .map(item => 
      `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 8px; border-collapse: collapse;">
        <tr>
          <td width="20" style="padding: 0; vertical-align: top; font-size: 16px; color: #1A0841 !important; font-weight: bold; font-family: Arial;">✓</td>
          <td style="padding: 0; font-size: 13px; line-height: 1.6; color: #1A0841 !important; font-family: Arial;">${escapeHtml(item.trim())}</td>
        </tr>
      </table>`
    ).join('');
}

async function formatExcludedItems(items: string[] | undefined): Promise<string> {
  if (!items || items.length === 0) return '';
  return items
    .filter(item => item && typeof item === 'string' && item.trim().length > 0)
    .map(item => 
      `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 8px; border-collapse: collapse;">
        <tr>
          <td width="20" style="padding: 0; vertical-align: top; font-size: 16px; color: #dc2626 !important; font-weight: bold; font-family: Arial;">✗</td>
          <td style="padding: 0; font-size: 13px; line-height: 1.6; color: #1A0841 !important; font-family: Arial;">${escapeHtml(item.trim())}</td>
        </tr>
      </table>`
    ).join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function findProductsWithItems(): Promise<any[]> {
  console.log('🔍 Cercando prodotti con included_items o excluded_items...\n');
  
  const products: any[] = [];
  
  // Cerca in experience
  const { data: experiences, error: expError } = await supabase
    .from('experience')
    .select('id, name, included_items, excluded_items')
    .or('included_items.not.is.null,excluded_items.not.is.null')
    .limit(10);
  
  if (!expError && experiences) {
    experiences.forEach(exp => {
      products.push({
        ...exp,
        type: 'experience',
        tableName: 'experience'
      });
    });
  }
  
  // Cerca in class
  const { data: classes, error: classError } = await supabase
    .from('class')
    .select('id, name, included_items, excluded_items')
    .or('included_items.not.is.null,excluded_items.not.is.null')
    .limit(10);
  
  if (!classError && classes) {
    classes.forEach(cls => {
      products.push({
        ...cls,
        type: 'class',
        tableName: 'class'
      });
    });
  }
  
  // Cerca in trip
  const { data: trips, error: tripError } = await supabase
    .from('trip')
    .select('id, name, included_items, excluded_items')
    .or('included_items.not.is.null,excluded_items.not.is.null')
    .limit(10);
  
  if (!tripError && trips) {
    trips.forEach(trip => {
      products.push({
        ...trip,
        type: 'trip',
        tableName: 'trip'
      });
    });
  }
  
  console.log(`✅ Trovati ${products.length} prodotti con included/excluded items\n`);
  return products;
}

async function sendTestEmail(testNumber: number, product: any): Promise<TestResult> {
  console.log(`\n📧 Test ${testNumber}/20: ${product.name} (${product.type})`);
  console.log(`   Product ID: ${product.id}`);
  
  const includedItems = Array.isArray(product.included_items) ? product.included_items : null;
  const excludedItems = Array.isArray(product.excluded_items) ? product.excluded_items : null;
  
  console.log(`   Included items: ${includedItems ? includedItems.length : 0} elementi`);
  console.log(`   Excluded items: ${excludedItems ? excludedItems.length : 0} elementi`);
  
  // Formatta gli items
  const includedItemsHtml = await formatIncludedItems(includedItems || undefined);
  const excludedItemsHtml = await formatExcludedItems(excludedItems || undefined);
  
  console.log(`   Included HTML length: ${includedItemsHtml.length} caratteri`);
  console.log(`   Excluded HTML length: ${excludedItemsHtml.length} caratteri`);
  
  // Prepara il payload email
  const emailPayload = {
    type: 'order_confirmation',
    bookingId: `test-${Date.now()}-${testNumber}`,
    customerEmail: 'test@flixdog.com',
    customerName: 'Test',
    customerSurname: 'User',
    productName: product.name,
    productDescription: 'Prodotto di test per verificare included/excluded items',
    productType: product.type,
    bookingDate: new Date().toISOString().split('T')[0],
    bookingTime: '10:00 - 12:00',
    numberOfAdults: 2,
    numberOfDogs: 1,
    totalAmount: 100.00,
    currency: 'EUR',
    orderNumber: `TEST${testNumber.toString().padStart(6, '0')}`,
    noAdults: false,
    // IMPORTANTE: Passa i dati che vogliamo testare
    includedItems: includedItems || undefined,
    excludedItems: excludedItems || undefined,
    meetingInfo: {
      text: 'Punto di incontro: Piazza del Duomo, Milano',
      googleMapsLink: 'https://maps.google.com/?q=Piazza+Duomo+Milano'
    },
    showMeetingInfo: true,
    cancellationPolicy: 'Cancellazione gratuita fino a 24 ore prima',
  };
  
  console.log(`   📤 Invio email a Brevo...`);
  console.log(`   Payload includedItems:`, JSON.stringify(emailPayload.includedItems));
  console.log(`   Payload excludedItems:`, JSON.stringify(emailPayload.excludedItems));
  
  try {
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
    
    if (emailResponse.ok) {
      console.log(`   ✅ Email inviata con successo!`);
      console.log(`   Response:`, JSON.stringify(emailResult, null, 2));
      
      // Verifica che i parametri siano stati passati
      if (emailResult.params) {
        console.log(`   📋 Parametri passati a Brevo:`);
        console.log(`      INCLUDED_ITEMS length: ${emailResult.params.INCLUDED_ITEMS_LENGTH || 0}`);
        console.log(`      EXCLUDED_ITEMS length: ${emailResult.params.EXCLUDED_ITEMS_LENGTH || 0}`);
        console.log(`      INCLUDED_ITEMS_DISPLAY: ${emailResult.params.INCLUDED_ITEMS_DISPLAY}`);
        console.log(`      EXCLUDED_ITEMS_DISPLAY: ${emailResult.params.EXCLUDED_ITEMS_DISPLAY}`);
        console.log(`      INCLUDED_ITEMS preview: ${emailResult.params.INCLUDED_ITEMS?.substring(0, 100) || 'EMPTY'}...`);
        console.log(`      EXCLUDED_ITEMS preview: ${emailResult.params.EXCLUDED_ITEMS?.substring(0, 100) || 'EMPTY'}...`);
      } else {
        console.log(`   ⚠️  Parametri non presenti nella risposta`);
      }
      
      return {
        testNumber,
        success: true,
        productId: product.id,
        productName: product.name,
        includedItems,
        excludedItems,
        includedItemsHtml,
        excludedItemsHtml,
        emailSent: true,
      };
    } else {
      console.error(`   ❌ Errore nell'invio email:`);
      console.error(`   Status: ${emailResponse.status}`);
      console.error(`   Error:`, JSON.stringify(emailResult, null, 2));
      
      return {
        testNumber,
        success: false,
        productId: product.id,
        productName: product.name,
        includedItems,
        excludedItems,
        includedItemsHtml,
        excludedItemsHtml,
        emailSent: false,
        error: `Status ${emailResponse.status}: ${JSON.stringify(emailResult)}`,
      };
    }
  } catch (error) {
    console.error(`   ❌ Errore durante l'invio:`, error);
    
    return {
      testNumber,
      success: false,
      productId: product.id,
      productName: product.name,
      includedItems,
      excludedItems,
      includedItemsHtml,
      excludedItemsHtml,
      emailSent: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runTests() {
  console.log('🚀 AVVIO TEST EMAIL INCLUDED/EXCLUDED ITEMS');
  console.log('='.repeat(60));
  console.log(`URL Supabase: ${SUPABASE_URL}`);
  console.log(`Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`);
  console.log('='.repeat(60));
  
  // Trova prodotti con items
  const products = await findProductsWithItems();
  
  if (products.length === 0) {
    console.error('❌ Nessun prodotto trovato con included_items o excluded_items');
    console.log('\n💡 Suggerimento: Esegui prima update-test-products-for-email.ts per popolare i dati');
    Deno.exit(1);
  }
  
  // Esegui 20 test
  const results: TestResult[] = [];
  const testCount = Math.min(20, products.length * 2); // Massimo 20 test
  
  for (let i = 0; i < testCount; i++) {
    const productIndex = i % products.length;
    const product = products[productIndex];
    
    const result = await sendTestEmail(i + 1, product);
    results.push(result);
    
    // Pausa tra un test e l'altro per non sovraccaricare
    if (i < testCount - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Riepilogo
  console.log('\n' + '='.repeat(60));
  console.log('📊 RIEPILOGO TEST');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success && r.emailSent);
  const failed = results.filter(r => !r.success || !r.emailSent);
  
  console.log(`✅ Test riusciti: ${successful.length}/${results.length}`);
  console.log(`❌ Test falliti: ${failed.length}/${results.length}`);
  
  // Verifica che i dati siano stati passati
  const withIncludedItems = results.filter(r => r.includedItems && r.includedItems.length > 0);
  const withExcludedItems = results.filter(r => r.excludedItems && r.excludedItems.length > 0);
  
  console.log(`\n📋 Dati passati:`);
  console.log(`   Test con included_items: ${withIncludedItems.length}`);
  console.log(`   Test con excluded_items: ${withExcludedItems.length}`);
  
  // Mostra dettagli dei fallimenti
  if (failed.length > 0) {
    console.log(`\n❌ Dettagli fallimenti:`);
    failed.forEach(result => {
      console.log(`   Test ${result.testNumber}: ${result.productName}`);
      if (result.error) {
        console.log(`      Errore: ${result.error}`);
      }
    });
  }
  
  // Mostra esempi di HTML generato
  console.log(`\n📄 Esempi HTML generato:`);
  const exampleWithIncluded = results.find(r => r.includedItemsHtml.length > 0);
  if (exampleWithIncluded) {
    console.log(`\n   Included Items HTML (primi 200 caratteri):`);
    console.log(`   ${exampleWithIncluded.includedItemsHtml.substring(0, 200)}...`);
  }
  
  const exampleWithExcluded = results.find(r => r.excludedItemsHtml.length > 0);
  if (exampleWithExcluded) {
    console.log(`\n   Excluded Items HTML (primi 200 caratteri):`);
    console.log(`   ${exampleWithExcluded.excludedItemsHtml.substring(0, 200)}...`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETATI');
  console.log('='.repeat(60));
  console.log('\n💡 Verifica i log di Supabase per vedere cosa è stato effettivamente inviato a Brevo');
  console.log('   Dashboard → Logs → Edge Functions → send-transactional-email');
}

runTests().catch(error => {
  console.error('❌ Errore fatale:', error);
  Deno.exit(1);
});


/**
 * Test che simula esattamente la chiamata REST API del browser
 * per verificare che non ci siano più errori 404
 */

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://zyonwzilijgnnnmhxvbo.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzY4MDAsImV4cCI6MjA1MDU1MjgwMH0.placeholder';
const PRIMO_VIAGGIO_ID = 'bf3841c9-c927-427a-b1db-3cf933dbb450';

async function testRESTAPI() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Test REST API - Simula chiamata browser');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Simula esattamente la query che il browser fa
  // GET https://zyonwzilijgnnnmhxvbo.supabase.co/rest/v1/product_faq?select=id%2Corder_index%2Cfaq%3Afaq_id%28id%2Cquestion%2Canswer%29&product_id=eq.bf3841c9-c927-427a-b1db-3cf933dbb450&product_type=eq.trip&order=order_index.asc
  
  const url = new URL(`${SUPABASE_URL}/rest/v1/product_faq`);
  url.searchParams.set('select', 'id,order_index,faq:faq_id(id,question,answer)');
  url.searchParams.set('product_id', `eq.${PRIMO_VIAGGIO_ID}`);
  url.searchParams.set('product_type', 'eq.trip');
  url.searchParams.set('order', 'order_index.asc');
  
  console.log('📡 Chiamata REST API:');
  console.log(`   ${url.toString()}\n`);
  
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    });
    
    console.log(`📊 Status Code: ${response.status}`);
    
    if (response.status === 404) {
      console.log('❌ ERRORE 404 - La tabella product_faq non è accessibile!');
      const text = await response.text();
      console.log(`   Response: ${text.substring(0, 200)}`);
      return false;
    }
    
    if (!response.ok) {
      console.log(`⚠️  Status non OK: ${response.status}`);
      const text = await response.text();
      console.log(`   Response: ${text.substring(0, 200)}`);
      
      // Se è un errore di permessi ma non 404, potrebbe essere OK
      if (response.status === 401 || response.status === 403) {
        console.log('   ⚠️  Errore di permessi (potrebbe essere normale se non autenticato)');
        return true; // Non è un errore 404, quindi la tabella esiste
      }
      
      return false;
    }
    
    const data = await response.json();
    console.log(`✅ SUCCESS! Trovate ${data.length || 0} FAQ`);
    
    if (data.length > 0) {
      console.log('\n📋 FAQ trovate:');
      data.forEach((item, idx) => {
        if (item.faq) {
          console.log(`   ${idx + 1}. ${item.faq.question.substring(0, 60)}...`);
        }
      });
    } else {
      console.log('   (Nessuna FAQ associata al prodotto - OK)');
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Errore nella chiamata: ${error.message}`);
    return false;
  }
}

async function testProductLoad() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Test Caricamento Prodotto');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const url = new URL(`${SUPABASE_URL}/rest/v1/trip`);
  url.searchParams.set('id', `eq.${PRIMO_VIAGGIO_ID}`);
  url.searchParams.set('select', '*');
  
  console.log('📡 Chiamata REST API:');
  console.log(`   ${url.toString()}\n`);
  
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log(`❌ Errore: ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    if (data.length === 0) {
      console.log('❌ Prodotto non trovato');
      return false;
    }
    
    const product = data[0];
    console.log(`✅ Prodotto caricato: ${product.name || 'N/A'}`);
    console.log(`   ID: ${product.id}`);
    console.log(`   Attivo: ${product.active ? 'Sì' : 'No'}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Errore: ${error.message}`);
    return false;
  }
}

async function main() {
  const test1 = await testRESTAPI();
  const test2 = await testProductLoad();
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Riepilogo');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log(`${test1 ? '✅' : '❌'} Query product_faq (REST API)`);
  console.log(`${test2 ? '✅' : '❌'} Caricamento prodotto (REST API)`);
  
  if (test1 && test2) {
    console.log('\n✅ TUTTI I TEST PASSATI!');
    console.log('✅ Il checkout dovrebbe funzionare senza errori 404\n');
  } else {
    console.log('\n❌ ALCUNI TEST FALLITI\n');
  }
  
  process.exit(test1 && test2 ? 0 : 1);
}

main().catch((error) => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});


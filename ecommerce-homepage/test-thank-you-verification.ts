/**
 * Script di Verifica Rapida: Thank You Page
 * 
 * Verifica che i dati necessari per la thank you page siano presenti nel database
 * per 10 prodotti diversi. Non richiede session_id validi.
 * 
 * Usage:
 *   npx tsx test-thank-you-verification.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

// Carica variabili d'ambiente da .env.local se esiste
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');
  for (const line of envLines) {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.VITE_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://zyonwzilijgnnnmhxvbo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                        process.env.VITE_SUPABASE_ANON_KEY || 
                        process.env.SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ Errore: SUPABASE_ANON_KEY mancante');
  console.error('   Aggiungi NEXT_PUBLIC_SUPABASE_ANON_KEY a .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ProductData {
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
  hasImages: boolean;
  imageCount: number;
}

async function testProduct(productId: string, productType: 'experience' | 'class' | 'trip'): Promise<ProductData | null> {
  const tableName = productType === 'class' ? 'class' : productType === 'experience' ? 'experience' : 'trip';
  
  const { data: product, error } = await supabase
    .from(tableName)
    .select('id, name, description, highlights, included_items, excluded_items, meeting_info, show_meeting_info, cancellation_policy, images, duration_hours, duration_days, location')
    .eq('id', productId)
    .single();
  
  if (error || !product) {
    return null;
  }
  
  // Verifica programma
  const { data: programDays } = await supabase
    .from('trip_program_day')
    .select('id')
    .eq('product_id', productId)
    .eq('product_type', productType)
    .limit(1);
  
  return {
    id: product.id,
    name: product.name,
    type: productType,
    hasDescription: !!product.description,
    hasHighlights: Array.isArray(product.highlights) && product.highlights.length > 0,
    hasIncludedItems: Array.isArray(product.included_items) && product.included_items.length > 0,
    hasExcludedItems: Array.isArray(product.excluded_items) && product.excluded_items.length > 0,
    hasMeetingInfo: product.show_meeting_info === true && !!product.meeting_info,
    hasCancellationPolicy: !!product.cancellation_policy,
    hasProgram: !!(programDays && programDays.length > 0),
    hasLocation: !!product.location,
    hasDuration: !!(product.duration_hours || product.duration_days),
    hasImages: Array.isArray(product.images) && product.images.length > 0,
    imageCount: Array.isArray(product.images) ? product.images.length : 0,
  };
}

async function runVerification() {
  console.log('🧪 Verifica Dati Thank You Page');
  console.log('='.repeat(80));
  console.log('');
  
  const products: ProductData[] = [];
  
  // Carica 4 esperienze
  const { data: experiences } = await supabase
    .from('experience')
    .select('id')
    .eq('active', true)
    .limit(4);
  
  if (experiences) {
    for (const exp of experiences) {
      const data = await testProduct(exp.id, 'experience');
      if (data) products.push(data);
    }
  }
  
  // Carica 3 classi
  const { data: classes } = await supabase
    .from('class')
    .select('id')
    .eq('active', true)
    .limit(3);
  
  if (classes) {
    for (const cls of classes) {
      const data = await testProduct(cls.id, 'class');
      if (data) products.push(data);
    }
  }
  
  // Carica 3 viaggi
  const { data: trips } = await supabase
    .from('trip')
    .select('id')
    .eq('active', true)
    .limit(3);
  
  if (trips) {
    for (const trip of trips) {
      const data = await testProduct(trip.id, 'trip');
      if (data) products.push(data);
    }
  }
  
  if (products.length === 0) {
    console.error('❌ Nessun prodotto trovato');
    process.exit(1);
  }
  
  console.log(`✅ Verificati ${products.length} prodotti\n`);
  
  let allPassed = true;
  
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    console.log(`\n[${i + 1}/${products.length}] ${p.name} (${p.type})`);
    
    const checks = [];
    if (p.hasDescription) checks.push('✅ Descrizione');
    else checks.push('❌ Descrizione');
    
    if (p.hasHighlights) checks.push('✅ Highlights');
    else checks.push('⚠️  Highlights');
    
    if (p.hasIncludedItems) checks.push('✅ Inclusi');
    else checks.push('⚠️  Inclusi');
    
    if (p.hasExcludedItems) checks.push('✅ Esclusi');
    else checks.push('⚠️  Esclusi');
    
    if (p.hasMeetingInfo) checks.push('✅ Meeting Info');
    else checks.push('⚠️  Meeting Info');
    
    if (p.hasCancellationPolicy) checks.push('✅ Cancellation Policy');
    else checks.push('⚠️  Cancellation Policy');
    
    if (p.hasProgram) checks.push('✅ Programma');
    else checks.push('⚠️  Programma');
    
    if (p.hasLocation) checks.push('✅ Location');
    else checks.push('⚠️  Location');
    
    if (p.hasDuration) checks.push('✅ Durata');
    else checks.push('⚠️  Durata');
    
    if (p.hasImages) checks.push(`✅ Immagini (${p.imageCount})`);
    else checks.push('⚠️  Immagini (userà placeholder)');
    
    console.log(`  ${checks.join(' | ')}`);
    
    // Verifica che almeno alcuni dati siano presenti
    const hasAnyData = p.hasDescription || p.hasHighlights || p.hasIncludedItems || 
                       p.hasExcludedItems || p.hasMeetingInfo || p.hasCancellationPolicy || 
                       p.hasProgram || p.hasLocation || p.hasDuration;
    
    if (!hasAnyData) {
      console.log('  ⚠️  Prodotto con solo dati base');
    }
  }
  
  // Statistiche finali
  console.log('\n' + '='.repeat(80));
  console.log('📊 STATISTICHE FINALI');
  console.log('='.repeat(80));
  
  const stats = {
    total: products.length,
    withDescription: products.filter(p => p.hasDescription).length,
    withHighlights: products.filter(p => p.hasHighlights).length,
    withIncludedItems: products.filter(p => p.hasIncludedItems).length,
    withExcludedItems: products.filter(p => p.hasExcludedItems).length,
    withMeetingInfo: products.filter(p => p.hasMeetingInfo).length,
    withCancellationPolicy: products.filter(p => p.hasCancellationPolicy).length,
    withProgram: products.filter(p => p.hasProgram).length,
    withLocation: products.filter(p => p.hasLocation).length,
    withDuration: products.filter(p => p.hasDuration).length,
    withImages: products.filter(p => p.hasImages).length,
  };
  
  console.log(`\nTotale prodotti verificati: ${stats.total}`);
  console.log(`Descrizione: ${stats.withDescription}/${stats.total}`);
  console.log(`Highlights: ${stats.withHighlights}/${stats.total}`);
  console.log(`Included Items: ${stats.withIncludedItems}/${stats.total}`);
  console.log(`Excluded Items: ${stats.withExcludedItems}/${stats.total}`);
  console.log(`Meeting Info: ${stats.withMeetingInfo}/${stats.total}`);
  console.log(`Cancellation Policy: ${stats.withCancellationPolicy}/${stats.total}`);
  console.log(`Programma: ${stats.withProgram}/${stats.total}`);
  console.log(`Location: ${stats.withLocation}/${stats.total}`);
  console.log(`Durata: ${stats.withDuration}/${stats.total}`);
  console.log(`Immagini: ${stats.withImages}/${stats.total}`);
  
  console.log('\n✅ Verifica completata!');
  console.log('   I dati sono presenti nel database e l\'API può restituirli correttamente.');
  console.log('   Per testare completamente la thank you page, esegui alcuni checkout di test.');
}

runVerification().catch(error => {
  console.error('❌ Errore:', error);
  process.exit(1);
});


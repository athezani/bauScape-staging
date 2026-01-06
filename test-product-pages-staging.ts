import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Staging Supabase credentials
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://ilbbviadwedumvvwqqon.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzg4NjMsImV4cCI6MjA4MzIxNDg2M30.6CvZV598Yv4YD9tvEo5vIADzBDqynxd8X6SIciDBoGw';
const WEBSITE_URL = Deno.env.get('WEBSITE_URL') || 'https://staging.flixdog.com';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_ANON_KEY devono essere impostati.');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  productType: 'experience' | 'class' | 'trip';
  productId: string;
  productTitle: string;
  url: string;
  status: number;
  success: boolean;
  error?: string;
}

async function testProductPage(productType: 'experience' | 'class' | 'trip', productId: string, productTitle: string): Promise<TestResult> {
  const url = `${WEBSITE_URL}/prodotto/${productType}/${productId}`;
  console.log(`\n🧪 Testing ${productType}: ${productTitle}`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    
    const status = response.status;
    const success = status === 200;
    
    if (!success) {
      const text = await response.text();
      // Estrai il messaggio di errore dalla pagina HTML di Next.js
      let error = text.substring(0, 1000); // Limita la lunghezza dell'errore
      
      // Cerca il messaggio di errore nel body
      const errorMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (errorMatch) {
        const bodyText = errorMatch[1];
        // Cerca pattern comuni di errore
        const errorPatterns = [
          /Cannot find module[^<]*/i,
          /Error:[^<]*/i,
          /TypeError:[^<]*/i,
          /ReferenceError:[^<]*/i,
        ];
        
        for (const pattern of errorPatterns) {
          const match = bodyText.match(pattern);
          if (match) {
            error = match[0].substring(0, 500);
            break;
          }
        }
      }
      
      console.log(`   ❌ Status: ${status}`);
      console.log(`   Error: ${error}`);
      return {
        productType,
        productId,
        productTitle,
        url,
        status,
        success: false,
        error: error,
      };
    }
    
    console.log(`   ✅ Status: ${status}`);
    return {
      productType,
      productId,
      productTitle,
      url,
      status,
      success: true,
    };
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
    return {
      productType,
      productId,
      productTitle,
      url,
      status: 0,
      success: false,
      error: error.message,
    };
  }
}

async function main() {
  console.log('🚀 Testing product pages on staging...');
  console.log(`Website URL: ${WEBSITE_URL}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  
  const results: TestResult[] = [];
  
  // Test experience
  console.log('\n📦 Fetching experiences...');
  const { data: experiences, error: expError } = await supabase
    .from('experience')
    .select('id, name')
    .eq('active', true)
    .limit(3);
  
  if (expError) {
    console.error(`❌ Error fetching experiences: ${expError.message}`);
  } else if (experiences && experiences.length > 0) {
    console.log(`✅ Found ${experiences.length} experiences`);
    for (const exp of experiences) {
      const result = await testProductPage('experience', exp.id, exp.name);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between requests
    }
  } else {
    console.log('⚠️ No active experiences found');
  }
  
  // Test class
  console.log('\n📦 Fetching classes...');
  const { data: classes, error: classError } = await supabase
    .from('class')
    .select('id, name')
    .eq('active', true)
    .limit(3);
  
  if (classError) {
    console.error(`❌ Error fetching classes: ${classError.message}`);
  } else if (classes && classes.length > 0) {
    console.log(`✅ Found ${classes.length} classes`);
    for (const cls of classes) {
      const result = await testProductPage('class', cls.id, cls.name);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between requests
    }
  } else {
    console.log('⚠️ No active classes found');
  }
  
  // Test trip
  console.log('\n📦 Fetching trips...');
  const { data: trips, error: tripError } = await supabase
    .from('trip')
    .select('id, name')
    .eq('active', true)
    .limit(3);
  
  if (tripError) {
    console.error(`❌ Error fetching trips: ${tripError.message}`);
  } else if (trips && trips.length > 0) {
    console.log(`✅ Found ${trips.length} trips`);
    for (const trip of trips) {
      const result = await testProductPage('trip', trip.id, trip.name);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between requests
    }
  } else {
    console.log('⚠️ No active trips found');
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('='.repeat(60));
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    for (const result of failed) {
      console.log(`\n  ${result.productType}: ${result.productTitle}`);
      console.log(`  URL: ${result.url}`);
      console.log(`  Status: ${result.status}`);
      if (result.error) {
        console.log(`  Error: ${result.error.substring(0, 200)}...`);
      }
    }
  }
  
  if (successful.length === results.length && results.length > 0) {
    console.log('\n🎉 All product pages are working correctly!');
    Deno.exit(0);
  } else {
    console.log('\n⚠️ Some product pages are failing. Check the errors above.');
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}


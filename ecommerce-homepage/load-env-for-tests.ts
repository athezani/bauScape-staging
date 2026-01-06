/**
 * Helper script to load environment variables from .env.test file
 * This allows tests to run without manually exporting variables
 * 
 * Usage: deno run --allow-read --allow-env load-env-for-tests.ts test-trip-checkout-always-works.ts
 */

async function loadEnvFile(filePath: string): Promise<Record<string, string>> {
  try {
    const content = await Deno.readTextFile(filePath);
    const env: Record<string, string> = {};
    
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed === '') {
        continue;
      }
      
      // Parse KEY=VALUE format
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        env[key] = value;
      }
    }
    
    return env;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return {};
    }
    throw error;
  }
}

async function main() {
  // Try to load .env.test file
  const envFile = '.env.test';
  const envVars = await loadEnvFile(envFile);
  
  if (Object.keys(envVars).length > 0) {
    console.log(`📋 Caricate ${Object.keys(envVars).length} variabili da ${envFile}`);
    
    // Set environment variables (they will be available to child processes)
    for (const [key, value] of Object.entries(envVars)) {
      Deno.env.set(key, value);
    }
  } else {
    console.log(`⚠️  File ${envFile} non trovato. Usa le variabili d'ambiente esistenti.`);
    console.log(`   Crea ${envFile} copiando da .env.test.example`);
  }
  
  // Get the test script to run
  const testScript = Deno.args[0];
  if (!testScript) {
    console.error('❌ Specifica lo script di test da eseguire');
    console.error('   Esempio: deno run --allow-all load-env-for-tests.ts test-trip-checkout-always-works.ts');
    Deno.exit(1);
  }
  
  // Run the test script
  const command = new Deno.Command(Deno.execPath(), {
    args: ['run', '--allow-net', '--allow-env', testScript],
    stdout: 'inherit',
    stderr: 'inherit',
  });
  
  const { code } = await command.output();
  Deno.exit(code);
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Errore:', error);
    Deno.exit(1);
  });
}


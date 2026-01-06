/**
 * Runtime fix per source-map su Vercel/Lambda
 * Questo file viene eseguito all'avvio del server per assicurarsi che source-map sia disponibile
 */

export {};

if (typeof require !== 'undefined') {
  try {
    // Verifica che source-map sia disponibile
    const sourceMap = require('source-map');
    
    // Crea lo stub se non esiste già
    const path = require('path');
    const fs = require('fs');
    
    const nextCompiledPath = path.join(
      process.cwd(),
      'node_modules',
      'next',
      'dist',
      'compiled',
      'source-map'
    );
    
    // Crea la directory se non esiste
    if (!fs.existsSync(nextCompiledPath)) {
      fs.mkdirSync(nextCompiledPath, { recursive: true });
    }
    
    // Crea index.js se non esiste
    const stubIndexPath = path.join(nextCompiledPath, 'index.js');
    if (!fs.existsSync(stubIndexPath)) {
      const stubContent = `// Runtime stub for source-map
// This fixes the issue where Next.js looks for source-map in next/dist/compiled/ but it doesn't exist there
try {
  module.exports = require('source-map');
} catch (e) {
  // Fallback stub
  module.exports = {
    SourceMapConsumer: class {
      constructor() {}
      then() { return Promise.resolve(this); }
    },
    SourceMapGenerator: class {
      constructor() {}
      addMapping() {}
      setSourceContent() {}
      toString() { return ''; }
    },
    SourceNode: class {
      constructor() {}
      toString() { return ''; }
    }
  };
}
`;
      fs.writeFileSync(stubIndexPath, stubContent);
    }
    
    // Crea package.json se non esiste
    const stubPackagePath = path.join(nextCompiledPath, 'package.json');
    if (!fs.existsSync(stubPackagePath)) {
      const packageContent = JSON.stringify({
        name: 'next/dist/compiled/source-map',
        version: '1.0.0',
        main: 'index.js'
      }, null, 2);
      fs.writeFileSync(stubPackagePath, packageContent);
    }
    
    // Verifica che lo stub funzioni
    try {
      const stub = require('next/dist/compiled/source-map');
      if (stub && (stub.SourceMapConsumer || stub.SourceMapGenerator)) {
        console.log('[source-map-runtime-fix] ✅ Source-map stub verificato e funzionante');
      }
    } catch (e) {
      console.warn('[source-map-runtime-fix] ⚠️ Stub creato ma non verificabile:', e instanceof Error ? e.message : String(e));
    }
  } catch (error) {
    console.warn('[source-map-runtime-fix] ⚠️ Impossibile creare source-map stub:', error instanceof Error ? error.message : String(error));
  }
}


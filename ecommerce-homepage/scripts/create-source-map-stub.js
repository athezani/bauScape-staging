#!/usr/bin/env node

/**
 * Script per creare uno stub di source-map nella posizione che Next.js si aspetta
 * Questo risolve il problema "Cannot find module 'next/dist/compiled/source-map'" su Vercel
 */

const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'compiled', 'source-map');

// Crea la directory se non esiste
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log('Created directory:', targetDir);
} else {
  console.log('Directory already exists:', targetDir);
}

// Crea index.js che re-exporta source-map con fallback completo
// Questo stub deve essere compatibile con Next.js runtime che cerca il modulo
let indexJs;
try {
  // Prova a richiedere source-map
  const sourceMapPath = require.resolve('source-map');
  console.log('Found source-map at:', sourceMapPath);
  
  // Re-export source-map con path assoluto per evitare problemi di risoluzione
  indexJs = `// Re-export source-map from node_modules
// This fixes the issue where Next.js looks for source-map in next/dist/compiled/ but it doesn't exist there
const path = require('path');
const sourceMapPath = path.join(__dirname, '..', '..', '..', '..', 'source-map');

try {
  // Try to require from node_modules
  const sourceMap = require('source-map');
  module.exports = sourceMap;
} catch (e) {
  // Fallback: try relative path
  try {
    module.exports = require(sourceMapPath);
  } catch (e2) {
    // Final fallback: create minimal stub
    console.warn('source-map not found, using minimal stub');
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
}
`;
} catch (e) {
  // Se source-map non esiste, crea uno stub completo con tutte le classi necessarie
  console.log('⚠️ source-map not found, creating complete stub');
  indexJs = `// Complete stub for source-map (source maps are disabled in production)
// This fixes the issue where Next.js looks for source-map in next/dist/compiled/ but it doesn't exist there

// Minimal implementation that satisfies Next.js runtime requirements
class SourceMapConsumer {
  constructor() {}
  then() { return Promise.resolve(this); }
  get originalPositionFor() { return {}; }
  get generatedPositionFor() { return {}; }
  get allGeneratedPositionsFor() { return []; }
  get hasContentsOfAllSources() { return false; }
  get sourceContentFor() { return null; }
  get destroy() { return () => {}; }
}

class SourceMapGenerator {
  constructor() {}
  addMapping() {}
  setSourceContent() {}
  toString() { return ''; }
  toJSON() { return { version: 3, sources: [], mappings: '' }; }
}

class SourceNode {
  constructor() {}
  toString() { return ''; }
  toStringWithSourceMap() { return { code: '', map: null }; }
}

module.exports = {
  SourceMapConsumer,
  SourceMapGenerator,
  SourceNode
};
`;
}

fs.writeFileSync(path.join(targetDir, 'index.js'), indexJs);

// Crea package.json
const packageJson = {
  name: 'next/dist/compiled/source-map',
  version: '1.0.0',
  main: 'index.js'
};

fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(packageJson, null, 2));

console.log('✅ Created source-map stub at:', targetDir);


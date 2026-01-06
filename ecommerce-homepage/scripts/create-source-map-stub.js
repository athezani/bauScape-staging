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
}

// Crea index.js che re-exporta source-map
const indexJs = `// Re-export source-map from node_modules
// This fixes the issue where Next.js looks for source-map in next/dist/compiled/ but it doesn't exist there
module.exports = require('source-map');
`;

fs.writeFileSync(path.join(targetDir, 'index.js'), indexJs);

// Crea package.json
const packageJson = {
  name: 'next/dist/compiled/source-map',
  version: '1.0.0',
  main: 'index.js'
};

fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(packageJson, null, 2));

console.log('✅ Created source-map stub at:', targetDir);


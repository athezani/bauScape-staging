#!/bin/bash
# Script wrapper per forzare l'uso di webpack invece di Turbopack
# Usato sia in locale che su Vercel (staging)

set -e

# Rimuovi qualsiasi variabile d'ambiente Turbopack che potrebbe interferire
unset NEXT_TURBOPACK
unset NEXT_TURBOPACK_EXPERIMENTAL
unset NEXT_TURBOPACK_USE_WORKER

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Se lo script è in ecommerce-homepage, siamo già nella directory corretta
# Se lo script è nella root, dobbiamo entrare in ecommerce-homepage
if [ "$(basename "$SCRIPT_DIR")" = "ecommerce-homepage" ]; then
  # Siamo già in ecommerce-homepage
  ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
  cd "$SCRIPT_DIR"
else
  # Siamo nella root, entriamo in ecommerce-homepage
  ROOT_DIR="$SCRIPT_DIR"
  cd "$ROOT_DIR/ecommerce-homepage"
fi

# IMPORTANTE: Installa TUTTE le dipendenze (incluso Next.js e devDependencies) nel workspace
# Questo è necessario perché:
# 1. Vercel ha bisogno di Next.js installato nel workspace per il runtime
# 2. Next.js TypeScript checker ha bisogno di @types/react durante il build
# In produzione funziona perché le dipendenze sono già installate correttamente
echo "Installing all dependencies (including Next.js and devDependencies) in ecommerce-homepage workspace..."
# Forza l'installazione di devDependencies anche in produzione
NODE_ENV=development npm install --legacy-peer-deps

# Verifica che Next.js sia installato correttamente
if [ ! -d "node_modules/next" ]; then
  echo "WARNING: Next.js not found in ecommerce-homepage/node_modules!"
  echo "Installing Next.js and devDependencies explicitly..."
  # Installa Next.js e poi reinstalla le devDependencies per assicurarsi che @types/react sia presente
  npm install next@16.1.1 --legacy-peer-deps --save
  NODE_ENV=development npm install --legacy-peer-deps
fi

# Verifica che @types/react sia presente (può essere nella root o nella subdirectory)
echo "Checking for @types/react..."

# Controlla prima nella directory corrente (ecommerce-homepage)
if [ -d "node_modules/@types/react" ]; then
  TYPES_REACT_DIR="node_modules/@types/react"
  echo "✅ @types/react found in ecommerce-homepage/node_modules"
elif [ -d "../node_modules/@types/react" ]; then
  TYPES_REACT_DIR="../node_modules/@types/react"
  echo "✅ @types/react found in root node_modules"
else
  echo "ERROR: @types/react not found in either location!"
  echo "This indicates a problem with npm ci installation."
  exit 1
fi

# Verifica che il package sia accessibile a TypeScript
echo "Verifying @types/react accessibility..."
if [ ! -f "$TYPES_REACT_DIR/index.d.ts" ]; then
  echo "ERROR: @types/react/index.d.ts not found! Installation corrupted."
  exit 1
fi
echo "✅ @types/react/index.d.ts exists and is accessible"

# Crea lo stub di source-map nella posizione che Next.js si aspetta
# IMPORTANTE: Questo deve essere fatto PRIMA del build per assicurarsi che lo stub sia disponibile
echo "Creating source-map stub for Next.js..."

# Crea la directory se non esiste
mkdir -p "node_modules/next/dist/compiled/source-map"

# Copia lo stub committato nel repository nella posizione corretta
if [ -f "scripts/source-map-stub/next-compiled-source-map/index.js" ]; then
  echo "Copying committed source-map stub..."
  cp "scripts/source-map-stub/next-compiled-source-map/index.js" "node_modules/next/dist/compiled/source-map/index.js"
  cp "scripts/source-map-stub/next-compiled-source-map/package.json" "node_modules/next/dist/compiled/source-map/package.json"
  echo "✅ Source-map stub copied successfully"
elif [ -f "scripts/create-source-map-stub.js" ]; then
  # Fallback: crea lo stub usando lo script se il file committato non esiste
  echo "Committed stub not found, creating with script..."
  node scripts/create-source-map-stub.js
  if [ $? -eq 0 ]; then
    echo "✅ Source-map stub created successfully"
  else
    echo "❌ ERROR: Failed to create source-map stub - build will likely fail"
    exit 1
  fi
else
  echo "❌ ERROR: Neither committed stub nor create-source-map-stub.js found - build will likely fail"
  exit 1
fi

# Verifica che lo stub sia stato creato correttamente
if [ -f "node_modules/next/dist/compiled/source-map/index.js" ]; then
  echo "✅ Verified: source-map stub exists at node_modules/next/dist/compiled/source-map/index.js"
  # Verifica anche che il contenuto sia valido
  if grep -q "SourceMapConsumer\|module.exports" "node_modules/next/dist/compiled/source-map/index.js"; then
    echo "✅ Verified: source-map stub content is valid"
  else
    echo "❌ WARNING: source-map stub content may be invalid"
  fi
else
  echo "❌ ERROR: source-map stub was not created - build will likely fail"
  exit 1
fi

echo "Verifying source-map is installed..."
if ! npm list source-map >/dev/null 2>&1; then
  echo "⚠️ source-map not found, installing..."
  npm install source-map@^0.7.4 --save --legacy-peer-deps
fi

echo "Building Next.js with webpack using workspace node_modules..."
NODE_PATH="$ROOT_DIR/node_modules:$ROOT_DIR/ecommerce-homepage/node_modules:$NODE_PATH" npx --yes next build --webpack

# IMPORTANTE: Copia lo stub anche dopo il build per assicurarsi che sia nel bundle finale
# Vercel potrebbe pulire node_modules dopo il build, quindi dobbiamo ricreare lo stub
echo "=========================================="
echo "🔍 POST-BUILD: Verificando source-map stub"
echo "=========================================="

if [ -f "scripts/source-map-stub/next-compiled-source-map/index.js" ]; then
  echo "📦 Stub source trovato, copiando..."
  mkdir -p "node_modules/next/dist/compiled/source-map"
  cp "scripts/source-map-stub/next-compiled-source-map/index.js" "node_modules/next/dist/compiled/source-map/index.js"
  cp "scripts/source-map-stub/next-compiled-source-map/package.json" "node_modules/next/dist/compiled/source-map/package.json"
  echo "✅ Source-map stub recreated after build"
  
  # Copia anche nel .next output se esiste (sia server che standalone)
  if [ -d ".next" ]; then
    echo "📁 .next directory trovata, copiando stub..."
    
    # Per build normale
    if [ -d ".next/server" ]; then
      mkdir -p ".next/server/node_modules/next/dist/compiled/source-map" 2>/dev/null || true
      cp "scripts/source-map-stub/next-compiled-source-map/index.js" ".next/server/node_modules/next/dist/compiled/source-map/index.js" 2>/dev/null || true
      cp "scripts/source-map-stub/next-compiled-source-map/package.json" ".next/server/node_modules/next/dist/compiled/source-map/package.json" 2>/dev/null || true
      if [ -f ".next/server/node_modules/next/dist/compiled/source-map/index.js" ]; then
        echo "✅ Source-map stub copied to .next/server output"
      else
        echo "❌ ERRORE: Source-map stub NON copiato in .next/server"
      fi
    else
      echo "⚠️  .next/server non trovato (normale per standalone)"
    fi
    
    # Per build standalone (output: 'standalone' in next.config.js)
    if [ -d ".next/standalone" ]; then
      echo "📦 Build standalone trovata, copiando stub..."
      mkdir -p ".next/standalone/node_modules/next/dist/compiled/source-map" 2>/dev/null || true
      cp "scripts/source-map-stub/next-compiled-source-map/index.js" ".next/standalone/node_modules/next/dist/compiled/source-map/index.js" 2>/dev/null || true
      cp "scripts/source-map-stub/next-compiled-source-map/package.json" ".next/standalone/node_modules/next/dist/compiled/source-map/package.json" 2>/dev/null || true
      
      # Verifica che sia stato copiato
      if [ -f ".next/standalone/node_modules/next/dist/compiled/source-map/index.js" ]; then
        echo "✅ Source-map stub copied to .next/standalone output"
        echo "📄 Verifica contenuto stub:"
        head -5 ".next/standalone/node_modules/next/dist/compiled/source-map/index.js" || true
      else
        echo "❌ ERRORE CRITICO: Source-map stub NON copiato in .next/standalone"
        echo "🔍 Verificando directory:"
        ls -la ".next/standalone/node_modules/next/dist/compiled/" 2>&1 || echo "Directory non esiste"
      fi
      
      # Verifica anche che source-map completo sia presente
      if [ -d ".next/standalone/node_modules/source-map" ]; then
        echo "✅ source-map completo presente in standalone"
      else
        echo "⚠️  source-map completo NON presente in standalone"
      fi
    else
      echo "⚠️  .next/standalone non trovato (build potrebbe non essere standalone)"
    fi
  else
    echo "❌ ERRORE: .next directory non trovata dopo build"
  fi
else
  echo "❌ ERRORE CRITICO: Stub source-map non trovato in scripts/source-map-stub/"
  echo "🔍 Cercando alternative..."
  if [ -f "scripts/create-source-map-stub.js" ]; then
    echo "📝 Trovato create-source-map-stub.js, eseguendo..."
    node scripts/create-source-map-stub.js
  fi
fi

echo "=========================================="
echo "✅ POST-BUILD verifiche completate"
echo "=========================================="


// Re-export source-map from node_modules
// This fixes the issue where Next.js looks for source-map in next/dist/compiled/ but it doesn't exist there
// This file is committed to the repository to ensure it's always available

try {
  // Try to require source-map from node_modules
  const sourceMap = require('source-map');
  module.exports = sourceMap;
} catch (e) {
  // Fallback: create minimal stub if source-map is not available
  // This should not happen in production, but provides a safety net
  console.warn('source-map not found, using minimal stub');
  module.exports = {
    SourceMapConsumer: class {
      constructor() {}
      then() { return Promise.resolve(this); }
      originalPositionFor() { return {}; }
      generatedPositionFor() { return {}; }
      allGeneratedPositionsFor() { return []; }
      hasContentsOfAllSources() { return false; }
      sourceContentFor() { return null; }
      destroy() { return () => {}; }
    },
    SourceMapGenerator: class {
      constructor() {}
      addMapping() {}
      setSourceContent() {}
      toString() { return ''; }
      toJSON() { return { version: 3, sources: [], mappings: '' }; }
    },
    SourceNode: class {
      constructor() {}
      toString() { return ''; }
      toStringWithSourceMap() { return { code: '', map: null }; }
    }
  };
}

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test 1: Verifica che source-map sia risolvibile
    let sourceMapAvailable = false;
    let sourceMapPath = '';
    let errorMessage = '';
    
    try {
      const sourceMap = require('source-map');
      sourceMapAvailable = true;
      sourceMapPath = require.resolve('source-map');
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e);
    }
    
    // Test 2: Verifica che next/dist/compiled/source-map sia risolvibile
    let nextCompiledSourceMapAvailable = false;
    let nextCompiledSourceMapPath = '';
    let nextCompiledErrorMessage = '';
    
    try {
      const nextCompiledSourceMap = require('next/dist/compiled/source-map');
      nextCompiledSourceMapAvailable = true;
      nextCompiledSourceMapPath = require.resolve('next/dist/compiled/source-map');
    } catch (e) {
      nextCompiledErrorMessage = e instanceof Error ? e.message : String(e);
    }
    
    return NextResponse.json({
      success: true,
      tests: {
        sourceMap: {
          available: sourceMapAvailable,
          path: sourceMapPath,
          error: errorMessage || null,
        },
        nextCompiledSourceMap: {
          available: nextCompiledSourceMapAvailable,
          path: nextCompiledSourceMapPath,
          error: nextCompiledErrorMessage || null,
        },
      },
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getSupabaseConfig } from '@/utils/env';

export async function GET() {
  try {
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      success: true,
    };

    // Test 1: Variabili d'ambiente
    debugInfo.env = {
      hasNextPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasNextPublicSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nextPublicSupabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'missing',
      nextPublicSupabaseAnonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      supabaseUrlPrefix: process.env.SUPABASE_URL?.substring(0, 30) || 'missing',
      supabaseServiceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    };

    // Test 2: Configurazione Supabase
    try {
      const supabaseConfig = getSupabaseConfig();
      debugInfo.supabaseConfig = {
        hasUrl: !!supabaseConfig.url,
        hasAnonKey: !!supabaseConfig.anonKey,
        urlPrefix: supabaseConfig.url?.substring(0, 30) || 'missing',
        anonKeyLength: supabaseConfig.anonKey?.length || 0,
      };
    } catch (configError) {
      debugInfo.supabaseConfig = {
        error: configError instanceof Error ? configError.message : String(configError),
      };
    }

    // Test 3: Client Supabase
    try {
      const supabase = getSupabaseServerClient();
      debugInfo.supabaseClient = {
        created: true,
        // Non possiamo accedere a supabaseUrl direttamente (è protected)
      };
    } catch (clientError) {
      debugInfo.supabaseClient = {
        error: clientError instanceof Error ? clientError.message : String(clientError),
        stack: clientError instanceof Error ? clientError.stack : undefined,
      };
    }

    // Test 4: Query di test a Supabase
    try {
      const supabase = getSupabaseServerClient();
      const { data, error, status } = await supabase
        .from('trip')
        .select('id, title')
        .eq('active', true)
        .limit(1);
      
      debugInfo.supabaseQuery = {
        success: !error,
        status,
        error: error ? error.message : null,
        dataCount: data?.length || 0,
        hasData: !!data && data.length > 0,
      };
    } catch (queryError) {
      debugInfo.supabaseQuery = {
        error: queryError instanceof Error ? queryError.message : String(queryError),
        stack: queryError instanceof Error ? queryError.stack : undefined,
      };
    }

    // Test 5: Source-map availability
    try {
      const sourceMap = require('source-map');
      debugInfo.sourceMap = {
        available: true,
        hasSourceMapConsumer: !!sourceMap.SourceMapConsumer,
      };
    } catch (e) {
      debugInfo.sourceMap = {
        available: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }

    // Test 6: Next.js compiled source-map
    try {
      const nextCompiledSourceMap = require('next/dist/compiled/source-map');
      debugInfo.nextCompiledSourceMap = {
        available: true,
        hasSourceMapConsumer: !!nextCompiledSourceMap.SourceMapConsumer,
      };
    } catch (e) {
      debugInfo.nextCompiledSourceMap = {
        available: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
    }, { status: 500 });
  }
}


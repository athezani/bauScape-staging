import { NextResponse } from 'next/server';
import { fetchProduct } from '@/lib/productServer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '5af81c69-6f5a-450d-9646-a8c68be3115a';
    const type = (searchParams.get('type') || 'trip') as 'trip' | 'experience' | 'class';

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      testParams: { id, type },
    };

    // Test fetchProduct
    try {
      console.log('[DEBUG] Starting fetchProduct test', { id, type });
      const result = await fetchProduct(id, type);
      console.log('[DEBUG] fetchProduct result', { 
        hasProduct: !!result.product, 
        hasError: !!result.error,
        error: result.error 
      });

      debugInfo.fetchProduct = {
        success: !!result.product && !result.error,
        hasProduct: !!result.product,
        hasError: !!result.error,
        error: result.error || null,
        productId: result.product?.id || null,
        productTitle: result.product?.title || null,
      };
    } catch (fetchError) {
      console.error('[DEBUG] fetchProduct exception:', fetchError);
      debugInfo.fetchProduct = {
        success: false,
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
      };
    }

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}


import type { Product, ProductType } from '../types/product';
import { getSupabaseServerClient } from './supabaseServer';
import { mapRowToProduct } from './productMapper';
import { logger } from '../utils/logger';

interface FetchProductsOptions {
  types?: ProductType[];
  limit?: number;
}

/**
 * Server-side function to fetch products from Supabase
 * Use this in Next.js Server Components
 */
export async function fetchProducts(options: FetchProductsOptions = {}): Promise<{
  products: Product[];
  error: string | null;
}> {
  const { types = ['experience', 'class', 'trip'], limit } = options;
  
  try {
    const supabase = getSupabaseServerClient();
    const allProducts: Product[] = [];

    for (const type of types) {
      let tableName: 'experience' | 'class' | 'trip';
      if (type === 'experience') {
        tableName = 'experience';
      } else if (type === 'class') {
        tableName = 'class';
      } else if (type === 'trip') {
        tableName = 'trip';
      } else {
        logger.error(`fetchProducts: Unknown type`, undefined, { type });
        continue;
      }
      
      logger.debug(`fetchProducts: Fetching ${type}s`, { tableName });
      
      try {
        const { data, error: supabaseError, status, statusText } = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit ?? 1000);
        
        logger.debug(`fetchProducts: Query response for ${type}s`, {
          status,
          hasData: !!data,
          dataLength: data?.length ?? 0,
          tableName,
        });

        if (supabaseError) {
          logger.error(`fetchProducts: Failed to fetch ${type}s`, supabaseError, {
            status,
            statusText,
            tableName,
          });
          return {
            products: [],
            error: `Errore nel caricamento ${type}s: ${supabaseError.message} (${supabaseError.code || status})`,
          };
        }

        logger.debug(`fetchProducts: Fetched ${type}s`, { count: data?.length ?? 0 });
        
        if (data && data.length > 0) {
          // Filter out inactive products
          const activeData = data.filter((row: any) => row.active !== false);
          const mapped = activeData.map((row) => mapRowToProduct(row, type));
          allProducts.push(...mapped);
          logger.debug(`fetchProducts: Mapped ${type}s`, { 
            mapped: mapped.length, 
            filtered: data.length - activeData.length 
          });
        } else {
          logger.debug(`fetchProducts: No ${type}s found in database`);
        }
      } catch (queryError) {
        logger.error(`fetchProducts: Exception fetching ${type}s`, queryError);
        const errorMsg = queryError instanceof Error ? queryError.message : 'Errore sconosciuto';
        let userMessage = `Errore nel caricamento dei prodotti. Si prega di ricaricare la pagina e riprovare.`;
        if (errorMsg.includes('network') || errorMsg.includes('rete')) {
          userMessage = 'Errore di connessione. Si prega di verificare la connessione internet e riprovare.';
        } else if (errorMsg.includes('timeout') || errorMsg.includes('scaduto')) {
          userMessage = 'Tempo di attesa scaduto. Si prega di ricaricare la pagina e riprovare.';
        }
        return {
          products: [],
          error: userMessage,
        };
      }
    }
    
    logger.debug('fetchProducts: Total products loaded', { count: allProducts.length });

    // Sort all products by created_at (most recent first)
    const sortedProducts = allProducts.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Descending order (most recent first)
    });

    logger.debug('fetchProducts: Products sorted by created_at');

    return {
      products: sortedProducts,
      error: null,
    };
  } catch (fetchError) {
    const errorMessage =
      fetchError instanceof Error
        ? fetchError.message
        : typeof fetchError === 'object' && fetchError !== null && 'message' in fetchError
          ? String(fetchError.message)
          : 'Unknown error';
    logger.error('Unable to load products from Supabase', fetchError);
    
    let userMessage = 'Impossibile caricare i prodotti. Si prega di ricaricare la pagina e riprovare.';
    if (errorMessage.includes('network') || errorMessage.includes('rete')) {
      userMessage = 'Errore di connessione. Si prega di verificare la connessione internet e riprovare.';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('scaduto')) {
      userMessage = 'Tempo di attesa scaduto. Si prega di ricaricare la pagina e riprovare.';
    }
    
    return {
      products: [],
      error: userMessage,
    };
  }
}


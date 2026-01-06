import type { Product, ProductType } from '../types/product';
import { getSupabaseServerClient } from './supabaseServer';
import { mapRowToProduct } from './productMapper';
import { logger } from '../utils/logger';

/**
 * Server-side function to fetch a single product from Supabase
 * Use this in Next.js Server Components
 */
export async function fetchProduct(
  id: string,
  type: ProductType
): Promise<{
  product: Product | null;
  error: string | null;
}> {
  try {
    const supabase = getSupabaseServerClient();
    
    let tableName: 'experience' | 'class' | 'trip';
    if (type === 'experience') {
      tableName = 'experience';
    } else if (type === 'class') {
      tableName = 'class';
    } else if (type === 'trip') {
      tableName = 'trip';
    } else {
      logger.error(`fetchProduct: Unknown type`, undefined, { type, id });
      return {
        product: null,
        error: `Tipo prodotto non valido: ${type}`,
      };
    }
    
    logger.debug(`fetchProduct: Fetching ${type}`, { id, tableName });
    
    const { data, error: supabaseError, status } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .eq('active', true)
      .single();
    
    if (supabaseError) {
      logger.error(`fetchProduct: Failed to fetch ${type}`, supabaseError, {
        status,
        id,
        tableName,
      });
      
      if (status === 404) {
        return {
          product: null,
          error: 'Prodotto non trovato',
        };
      }
      
      return {
        product: null,
        error: `Errore nel caricamento del prodotto: ${supabaseError.message}`,
      };
    }
    
    if (!data) {
      logger.debug(`fetchProduct: No ${type} found`, { id });
      return {
        product: null,
        error: 'Prodotto non trovato',
      };
    }
    
    let product: Product;
    try {
      product = mapRowToProduct(data, type);
      logger.debug(`fetchProduct: Fetched ${type}`, { id, title: product.title });
    } catch (mapError) {
      logger.error(`fetchProduct: Failed to map ${type}`, mapError, { id, dataKeys: Object.keys(data) });
      return {
        product: null,
        error: `Errore nel mapping del prodotto: ${mapError instanceof Error ? mapError.message : String(mapError)}`,
      };
    }
    
    // Load program
    try {
      const { data: days, error: programError } = await supabase
        .from('trip_program_day')
        .select(`
          id,
          day_number,
          introduction,
          trip_program_item (
            id,
            activity_text,
            order_index
          )
        `)
        .eq('product_id', id)
        .eq('product_type', type)
        .order('day_number', { ascending: true });

      if (!programError && days && days.length > 0) {
        const programDays = days.map(day => ({
          id: day.id,
          day_number: day.day_number,
          introduction: day.introduction || null,
          items: (day.trip_program_item as any[] || [])
            .sort((a, b) => a.order_index - b.order_index)
            .map(item => ({
              id: item.id,
              activity_text: item.activity_text,
              order_index: item.order_index,
            })),
        }));

        product.program = { days: programDays };
        logger.debug(`fetchProduct: Loaded program for ${type}`, { 
          id, 
          daysCount: programDays.length 
        });
      }
    } catch (programError) {
      logger.warn('fetchProduct: Failed to load product program', { 
        error: programError instanceof Error ? programError.message : String(programError),
        id,
        type
      });
      // Don't fail the whole product load if program fails
    }

    // Load secondary images
    try {
      const { data: images, error: imagesError } = await supabase
        .from('product_images')
        .select('id, image_url, display_order')
        .eq('product_id', id)
        .eq('product_type', type)
        .order('display_order', { ascending: true });

      if (!imagesError && images && images.length > 0) {
        product.secondaryImages = images.map(img => ({
          id: img.id,
          url: img.image_url,
          display_order: img.display_order,
        }));
        logger.debug(`fetchProduct: Loaded secondary images for ${type}`, { 
          id, 
          imagesCount: images.length 
        });
      }
    } catch (imagesError) {
      logger.warn('fetchProduct: Failed to load secondary images', { 
        error: imagesError instanceof Error ? imagesError.message : String(imagesError),
        id,
        type
      });
      // Don't fail the whole product load if images fail
    }
    
    return {
      product,
      error: null,
    };
  } catch (fetchError) {
    const errorMessage =
      fetchError instanceof Error
        ? fetchError.message
        : typeof fetchError === 'object' && fetchError !== null && 'message' in fetchError
          ? String(fetchError.message)
          : 'Unknown error';
    logger.error('fetchProduct: Exception', fetchError);
    
    return {
      product: null,
      error: `Errore nel caricamento del prodotto: ${errorMessage}`,
    };
  }
}


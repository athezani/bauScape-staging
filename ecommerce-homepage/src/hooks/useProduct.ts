import { useEffect, useState } from 'react';
import type { Product, ProductType, ProductProgram } from '../types/product';
import { getSupabaseClient } from '../lib/supabaseClient';
import { mapRowToProduct } from '../lib/productMapper';
import type { ProductRow } from '../types/product';
import { logger } from '../utils/logger';

export function useProduct(id: string, type: ProductType) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Trim and validate ID
    const trimmedId = id?.trim();
    if (!trimmedId || !type) {
      setLoading(false);
      if (!trimmedId) {
        setError('ID prodotto mancante');
      }
      return;
    }

    let isMounted = true;

    async function fetchProduct() {
      setLoading(true);
      setError(null);

      try {
        const supabase = getSupabaseClient();
        // Forza esplicitamente il nome della tabella come stringa letterale
        let tableName: 'experience' | 'class' | 'trip';
        if (type === 'experience') {
          tableName = 'experience';
        } else if (type === 'class') {
          tableName = 'class';
        } else if (type === 'trip') {
          tableName = 'trip';
        } else {
          throw new Error(`Unknown type: ${type}`);
        }

        // Use trimmed ID for query
        const { data, error: supabaseError } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', trimmedId)
          .single();

        if (supabaseError) {
          throw supabaseError;
        }

        if (!isMounted) return;

        if (data) {
          // Check if product is active (if active field exists and is false, don't show it)
          if (data.active === false) {
            setError('Questo prodotto non è al momento disponibile. Si prega di selezionare un altro prodotto.');
            return;
          }
          
          const mappedProduct = mapRowToProduct(data, type);
          
          // Load program
          try {
            const { data: days, error: programError } = await getSupabaseClient()
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
              .eq('product_id', trimmedId)
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

              mappedProduct.program = { days: programDays };
            }
          } catch (programError) {
            logger.warn('Failed to load product program', { 
              error: programError instanceof Error ? programError.message : String(programError) 
            });
            // Don't fail the whole product load if program fails
          }

          // Load FAQs
          try {
            const { data: productFAQs, error: faqError } = await getSupabaseClient()
              .from('product_faq')
              .select(`
                id,
                order_index,
                faq:faq_id (
                  id,
                  question,
                  answer
                )
              `)
              .eq('product_id', trimmedId)
              .eq('product_type', type)
              .order('order_index', { ascending: true });

            // Handle 404 errors gracefully (table might not exist yet)
            if (faqError) {
              // Check if it's a 404 (table doesn't exist) or other error
              const isTableNotFound = 
                faqError.code === 'PGRST116' || // PostgREST table not found
                faqError.message?.includes('404') ||
                faqError.message?.includes('relation') ||
                faqError.message?.includes('does not exist');
              
              if (isTableNotFound) {
                // Table doesn't exist yet - silently skip FAQs
                logger.debug('product_faq table not found, skipping FAQ load');
              } else {
                // Other error - log as warning but don't fail
                logger.warn('Failed to load product FAQs', { 
                  error: faqError instanceof Error ? faqError.message : String(faqError),
                  code: (faqError as any)?.code
                });
              }
            } else if (productFAQs && productFAQs.length > 0) {
              const faqs = productFAQs
                .filter((pf: any) => pf.faq) // Filter out any null FAQs
                .map((pf: any) => ({
                  id: pf.faq.id,
                  question: pf.faq.question,
                  answer: pf.faq.answer,
                  order_index: pf.order_index,
                }))
                .sort((a, b) => a.order_index - b.order_index);

              if (faqs.length > 0) {
                mappedProduct.faqs = faqs;
              }
            }
          } catch (faqError) {
            // Catch any unexpected errors
            const isTableNotFound = 
              (faqError as any)?.code === 'PGRST116' ||
              (faqError as any)?.message?.includes('404') ||
              (faqError as any)?.message?.includes('relation') ||
              (faqError as any)?.message?.includes('does not exist');
            
            if (!isTableNotFound) {
              logger.warn('Failed to load product FAQs', { 
                error: (faqError as any) instanceof Error ? (faqError as any).message : String(faqError) 
              });
            }
            // Don't fail the whole product load if FAQs fail
          }

          // Load secondary images
          try {
            const { data: images, error: imagesError } = await getSupabaseClient()
              .from('product_images')
              .select('id, image_url, display_order')
              .eq('product_id', trimmedId)
              .eq('product_type', type)
              .order('display_order', { ascending: true });

            if (!imagesError && images && images.length > 0) {
              mappedProduct.secondaryImages = images.map(img => ({
                id: img.id,
                url: img.image_url,
                display_order: img.display_order,
              }));
            }
          } catch (imagesError) {
            logger.warn('Failed to load secondary images', { 
              error: imagesError instanceof Error ? imagesError.message : String(imagesError) 
            });
            // Don't fail the whole product load if images fail
          }
          
          setProduct(mappedProduct);
        } else {
          setError('Prodotto non trovato. Si prega di verificare l\'URL o tornare alla pagina principale.');
        }
      } catch (fetchError) {
        const errorMessage =
          fetchError instanceof Error
            ? fetchError.message
            : typeof fetchError === 'object' && fetchError !== null && 'message' in fetchError
              ? String(fetchError.message)
              : 'Errore sconosciuto';
        logger.error(`Unable to load ${type} from Supabase`, fetchError);
        if (isMounted) {
          // Provide user-friendly error message in Italian
          let userMessage = 'Impossibile caricare il prodotto. Si prega di ricaricare la pagina e riprovare.';
          if (errorMessage.includes('not found') || errorMessage.includes('non trovato')) {
            userMessage = 'Prodotto non trovato. Si prega di verificare l\'URL o tornare alla pagina principale.';
          } else if (errorMessage.includes('network') || errorMessage.includes('rete')) {
            userMessage = 'Errore di connessione. Si prega di verificare la connessione internet e riprovare.';
          } else if (errorMessage.includes('timeout') || errorMessage.includes('scaduto')) {
            userMessage = 'Tempo di attesa scaduto. Si prega di ricaricare la pagina e riprovare.';
          }
          setError(userMessage);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [id, type]);

  return {
    product,
    loading,
    error,
  };
}

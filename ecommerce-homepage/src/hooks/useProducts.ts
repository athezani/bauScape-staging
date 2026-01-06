import { useEffect, useState } from 'react';
import type { Product, ProductType } from '../types/product';
import { getSupabaseClient } from '../lib/supabaseClient';
import { mapRowToProduct } from '../lib/productMapper';
import type { ProductRow } from '../types/product';
import { logger } from '../utils/logger';

interface UseProductsOptions {
  types?: ProductType[];
  limit?: number;
}

export function useProducts(options: UseProductsOptions = {}) {
  const { types = ['experience', 'class', 'trip'], limit } = options;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      setLoading(true);
      setError(null);

      try {
        const supabase = getSupabaseClient();
        
        const allProducts: Product[] = [];

        for (const type of types) {
          // IMPORTANTE: Usa sempre nomi singolari per le tabelle
          // Forza esplicitamente il nome della tabella come stringa letterale
          let tableName: 'experience' | 'class' | 'trip';
          if (type === 'experience') {
            tableName = 'experience';
          } else if (type === 'class') {
            tableName = 'class';
          } else if (type === 'trip') {
            tableName = 'trip';
          } else {
            logger.error(`useProducts: Unknown type`, undefined, { type });
            continue;
          }
          
          logger.debug(`useProducts: Fetching ${type}s`, { tableName });
          
          try {
            // Usa il nome della tabella come stringa letterale esplicita
            const { data, error: supabaseError, status, statusText } = await supabase
              .from(tableName)
              .select('*')
              .order('created_at', { ascending: false })
              .limit(limit ?? 1000);
            
            logger.debug(`useProducts: Query response for ${type}s`, {
              status,
              hasData: !!data,
              dataLength: data?.length ?? 0,
              tableName,
            });

            if (supabaseError) {
              logger.error(`useProducts: Failed to fetch ${type}s`, supabaseError, {
                status,
                statusText,
                tableName,
              });
              // Non continuare silenziosamente - aggiungi l'errore alla lista
              if (isMounted) {
                setError(`Errore nel caricamento ${type}s: ${supabaseError.message} (${supabaseError.code || status})`);
              }
              continue;
            }

            // Processa i dati solo se non ci sono errori
            logger.debug(`useProducts: Fetched ${type}s`, { count: data?.length ?? 0 });
            
                  if (data && data.length > 0) {
                    // Filter out inactive products
                    const activeData = data.filter((row: any) => row.active !== false);
                    const mapped = activeData.map((row) => mapRowToProduct(row, type));
                    allProducts.push(...mapped);
                    logger.debug(`useProducts: Mapped ${type}s`, { 
                      mapped: mapped.length, 
                      filtered: data.length - activeData.length 
                    });
                  } else {
                    logger.debug(`useProducts: No ${type}s found in database`);
                  }
          } catch (queryError) {
            logger.error(`useProducts: Exception fetching ${type}s`, queryError);
            if (isMounted) {
              const errorMsg = queryError instanceof Error ? queryError.message : 'Errore sconosciuto';
              let userMessage = `Errore nel caricamento dei prodotti. Si prega di ricaricare la pagina e riprovare.`;
              if (errorMsg.includes('network') || errorMsg.includes('rete')) {
                userMessage = 'Errore di connessione. Si prega di verificare la connessione internet e riprovare.';
              } else if (errorMsg.includes('timeout') || errorMsg.includes('scaduto')) {
                userMessage = 'Tempo di attesa scaduto. Si prega di ricaricare la pagina e riprovare.';
              }
              setError(userMessage);
            }
            continue;
          }
        }
        
        logger.debug('useProducts: Total products loaded', { count: allProducts.length });

        // Sort all products by created_at (most recent first)
        const sortedProducts = allProducts.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA; // Descending order (most recent first)
        });

        logger.debug('useProducts: Products sorted by created_at');

        if (!isMounted) return;

        setProducts(sortedProducts);
      } catch (fetchError) {
        const errorMessage =
          fetchError instanceof Error
            ? fetchError.message
            : typeof fetchError === 'object' && fetchError !== null && 'message' in fetchError
              ? String(fetchError.message)
              : 'Unknown error';
        logger.error('Unable to load products from Supabase', fetchError);
        if (isMounted) {
          // Provide user-friendly error message in Italian
          let userMessage = 'Impossibile caricare i prodotti. Si prega di ricaricare la pagina e riprovare.';
          if (errorMessage.includes('network') || errorMessage.includes('rete')) {
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

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [types.join(','), limit]);

  return {
    products,
    loading,
    error,
  };
}

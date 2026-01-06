/**
 * Product Service
 * Handles CRUD operations for classes, experiences, and trips
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  Product, 
  ProductType, 
  ProductFormData, 
  ClassProduct, 
  ExperienceProduct, 
  TripProduct,
  PredefinedPrice,
  ProductProgram,
  ProgramDay,
  ProgramItem
} from '@/types/product.types';
import type { Json } from '@/integrations/supabase/types';
import { validateProductFormData, isValidUUID, sanitizeString, validateStringArray, isValidUrl } from '@/utils/validation';
import { handleError, retryWithBackoff, ErrorCode } from '@/utils/errorHandler';

/**
 * Helper to safely parse predefined_prices from JSON
 */
function parsePredefinedPrices(value: Json | null): PredefinedPrice[] | null {
  if (!value || !Array.isArray(value)) return null;
  return value as unknown as PredefinedPrice[];
}

/**
 * Fetch all products of a specific type
 */
export async function fetchProductsByType(type: ProductType): Promise<Product[]> {
  if (!type || (type !== 'class' && type !== 'experience' && type !== 'trip')) {
    throw new Error(`Invalid product type: ${type}`);
  }

  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from(type)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const appError = handleError(error, { operation: 'fetchProductsByType', type });
      throw new Error(appError.userMessage);
    }

    return (data || []).map(item => ({
      ...item,
      type,
      predefined_prices: parsePredefinedPrices(item.predefined_prices),
    })) as Product[];
  });
}

/**
 * Fetch all products across all types
 */
export async function fetchAllProducts(): Promise<Product[]> {
  const [classes, experiences, trips] = await Promise.all([
    fetchProductsByType('class'),
    fetchProductsByType('experience'),
    fetchProductsByType('trip'),
  ]);

  return [...classes, ...experiences, ...trips].sort(
    (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
  );
}

/**
 * Fetch products for a specific provider
 */
export async function fetchProviderProducts(providerId: string): Promise<Product[]> {
  if (!providerId || !isValidUUID(providerId)) {
    throw new Error('Provider ID non valido');
  }

  return retryWithBackoff(async () => {
    const [classes, experiences, trips] = await Promise.all([
      supabase.from('class').select('*').eq('provider_id', providerId),
      supabase.from('experience').select('*').eq('provider_id', providerId),
      supabase.from('trip').select('*').eq('provider_id', providerId),
    ]);

    // Check for errors
    if (classes.error) {
      const appError = handleError(classes.error, { operation: 'fetchProviderProducts', table: 'class', providerId });
      throw new Error(appError.userMessage);
    }
    if (experiences.error) {
      const appError = handleError(experiences.error, { operation: 'fetchProviderProducts', table: 'experience', providerId });
      throw new Error(appError.userMessage);
    }
    if (trips.error) {
      const appError = handleError(trips.error, { operation: 'fetchProviderProducts', table: 'trip', providerId });
      throw new Error(appError.userMessage);
    }

    const products: Product[] = [];

    if (classes.data) {
      products.push(...classes.data.map(item => ({ 
        ...item, 
        type: 'class' as const,
        predefined_prices: parsePredefinedPrices(item.predefined_prices),
      })));
    }
    if (experiences.data) {
      products.push(...experiences.data.map(item => ({ 
        ...item, 
        type: 'experience' as const,
        predefined_prices: parsePredefinedPrices(item.predefined_prices),
      })));
    }
    if (trips.data) {
      products.push(...trips.data.map(item => ({ 
        ...item, 
        type: 'trip' as const,
        predefined_prices: parsePredefinedPrices(item.predefined_prices),
      })));
    }

    return products.sort(
      (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );
  });
}

/**
 * Create a new product
 */
export async function createProduct(formData: ProductFormData): Promise<Product> {
  // Validate input
  const validation = validateProductFormData(formData);
  if (!validation.valid) {
    throw new Error(`Errore di validazione: ${validation.errors.join(', ')}`);
  }

  const { type, ...data } = formData;
  
  // Additional security checks
  if (!isValidUUID(data.provider_id)) {
    throw new Error('Provider ID non valido');
  }
  
  // Sanitize string inputs
  const sanitizedName = sanitizeString(data.name, 200);
  if (!sanitizedName || sanitizedName.length < 3) {
    throw new Error('Il nome del prodotto deve contenere almeno 3 caratteri');
  }
  
  const sanitizedDescription = sanitizeString(data.description || '', 5000);
  
  // Sanitize highlights and included_items
  const sanitizedHighlights = data.highlights 
    ? validateStringArray(data.highlights, { maxLength: 200, maxItems: 10 })
    : null;
  const sanitizedIncludedItems = data.included_items
    ? validateStringArray(data.included_items, { maxLength: 200, maxItems: 10 })
    : null;
  const sanitizedExcludedItems = data.excluded_items
    ? validateStringArray(data.excluded_items, { maxLength: 200, maxItems: 10 })
    : null;
  const sanitizedPolicy = sanitizeString(data.cancellation_policy || '', 1000);
  
  if (!sanitizedPolicy || sanitizedPolicy.length < 10) {
    throw new Error('La policy di cancellazione deve contenere almeno 10 caratteri');
  }
  
  // Validate and format predefined_prices
  let formattedPredefinedPrices: Json | null = null;
  if (data.pricing_type === 'predefined') {
    if (data.predefined_prices && Array.isArray(data.predefined_prices) && data.predefined_prices.length > 0) {
      // Ensure all prices are valid numbers
      const validPrices = data.predefined_prices.filter(p => 
        typeof p.adults === 'number' && 
        typeof p.dogs === 'number' && 
        typeof p.price === 'number' &&
        p.adults > 0 &&
        p.dogs >= 0 &&
        p.price >= 0
      );
      if (validPrices.length > 0) {
        formattedPredefinedPrices = validPrices as unknown as Json;
      } else {
        throw new Error('Almeno un prezzo predefinito valido è richiesto quando il tipo di prezzo è "predefinito"');
      }
    } else {
      throw new Error('Almeno un prezzo predefinito è richiesto quando il tipo di prezzo è "predefinito"');
    }
  }

  // Validate and sanitize attributes
  const sanitizedAttributes = data.attributes && Array.isArray(data.attributes) && data.attributes.length > 0
    ? data.attributes.filter((attr): attr is string => typeof attr === 'string' && attr.length > 0)
    : null;

  // Sanitize meeting_info
  let sanitizedMeetingInfo: { text: string; google_maps_link: string } | null = null;
  if (data.meeting_info && typeof data.meeting_info === 'object' && data.meeting_info !== null) {
    const meetingInfo = data.meeting_info as { text: string; google_maps_link: string };
    const sanitizedText = meetingInfo.text ? sanitizeString(meetingInfo.text, 500) : '';
    const sanitizedLink = meetingInfo.google_maps_link && isValidUrl(meetingInfo.google_maps_link)
      ? meetingInfo.google_maps_link.trim()
      : '';
    
    if (sanitizedText || sanitizedLink) {
      sanitizedMeetingInfo = {
        text: sanitizedText,
        google_maps_link: sanitizedLink,
      };
    }
  }

  const baseData = {
    provider_id: data.provider_id,
    name: sanitizedName,
    description: sanitizedDescription || null,
    max_adults: data.max_adults,
    max_dogs: data.max_dogs,
    pricing_type: data.pricing_type,
    price_adult_base: data.pricing_type === 'linear' 
      ? (data.no_adults && (type === 'class' || type === 'experience') ? 0 : data.price_adult_base)
      : null,
    price_dog_base: data.pricing_type === 'linear' ? data.price_dog_base : null,
    predefined_prices: formattedPredefinedPrices,
    images: Array.isArray(data.images) ? data.images.filter((url): url is string => typeof url === 'string' && url.length > 0) : [],
    highlights: sanitizedHighlights,
    included_items: sanitizedIncludedItems,
    excluded_items: sanitizedExcludedItems,
    cancellation_policy: sanitizedPolicy,
    attributes: sanitizedAttributes,
    meeting_info: sanitizedMeetingInfo,
    show_meeting_info: data.show_meeting_info === true || data.show_meeting_info === 1 || false,
  };

  return retryWithBackoff(async () => {
    let result;

    if (type === 'class') {
      const sanitizedMeetingPoint = sanitizeString(data.meeting_point || '', 500);
      
      const { data: created, error } = await supabase
        .from('class')
        .insert({
          ...baseData,
          duration_hours: data.duration_hours ?? null, // Can be null, will be calculated from slots
          full_day_start_time: data.full_day_start_time || null,
          full_day_end_time: data.full_day_end_time || null,
          meeting_point: sanitizedMeetingPoint || null,
          active: (data as any).active !== undefined ? (data as any).active : true,
        })
        .select()
        .single();
      
      if (error) {
        const appError = handleError(error, { operation: 'createProduct', type: 'class' });
        // Check for permission errors specifically
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          throw new Error(`Errore di permessi: ${appError.userMessage}. Verifica di essere autenticato e di avere i permessi necessari.`);
        }
        throw new Error(appError.userMessage);
      }
      
      if (!created) {
        throw new Error('Prodotto creato ma non restituito dal database');
      }
      
      result = { 
        ...created, 
        type: 'class' as const,
        predefined_prices: parsePredefinedPrices(created.predefined_prices),
      } as ClassProduct;
  } else if (type === 'experience') {
    const sanitizedMeetingPoint = sanitizeString(data.meeting_point || '', 500);
    
    const { data: created, error } = await supabase
      .from('experience')
      .insert({
        ...baseData,
        duration_hours: data.duration_hours ?? null, // Can be null, will be calculated from slots
        full_day_start_time: data.full_day_start_time || null,
        full_day_end_time: data.full_day_end_time || null,
        meeting_point: sanitizedMeetingPoint || null,
        no_adults: data.no_adults || false,
        active: (data as any).active !== undefined ? (data as any).active : true,
      })
      .select()
      .single();
      
      if (error) {
        const appError = handleError(error, { operation: 'createProduct', type: 'experience' });
        // Check for permission errors specifically
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          throw new Error(`Errore di permessi: ${appError.userMessage}. Verifica di essere autenticato e di avere i permessi necessari.`);
        }
        throw new Error(appError.userMessage);
      }
      
      if (!created) {
        throw new Error('Prodotto creato ma non restituito dal database');
      }
      
      result = { 
        ...created, 
        type: 'experience' as const,
        predefined_prices: parsePredefinedPrices(created.predefined_prices),
      } as ExperienceProduct;
    } else if (type === 'trip') {
      // For trips, ensure duration_days has a valid default
      const tripDurationDays = data.duration_days && data.duration_days > 0 ? data.duration_days : 3;
      
      // Calculate end_date if start_date is provided but end_date is not
      let tripEndDate = data.end_date || null;
      if (data.start_date && !tripEndDate && tripDurationDays > 0) {
        const start = new Date(data.start_date);
        if (isNaN(start.getTime())) {
          throw new Error('Data di inizio non valida');
        }
        const end = new Date(start);
        end.setDate(end.getDate() + tripDurationDays - 1);
        tripEndDate = end.toISOString().split('T')[0];
      }
      
      const sanitizedLocation = sanitizeString(data.location || '', 500);
      
      const { data: created, error } = await supabase
        .from('trip')
        .insert({
          ...baseData,
          duration_days: tripDurationDays,
          location: sanitizedLocation || null,
          start_date: data.start_date || null,
          end_date: tripEndDate,
          active: (data as any).active !== undefined ? (data as any).active : true,
        })
        .select()
        .single();
      
      if (error) {
        const appError = handleError(error, { operation: 'createProduct', type: 'trip' });
        // Check for permission errors specifically
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          throw new Error(`Errore di permessi: ${appError.userMessage}. Verifica di essere autenticato e di avere i permessi necessari.`);
        }
        throw new Error(appError.userMessage);
      }
      
      if (!created) {
        throw new Error('Prodotto creato ma non restituito dal database');
      }
      
      result = { 
        ...created, 
        type: 'trip' as const,
        predefined_prices: parsePredefinedPrices(created.predefined_prices),
      } as TripProduct;
    } else {
      throw new Error(`Tipo prodotto non valido: ${type}`);
    }

    // Save program if provided
    if (formData.program !== undefined) {
      try {
        await saveProductProgram(result.id, result.type, formData.program);
      } catch (error) {
        console.error('[Product Service] Failed to save product program:', error);
        throw error;
      }
    }

    // Save FAQs if provided
    if (formData.faqs !== undefined) {
      try {
        await saveProductFAQs(result.id, result.type, formData.faqs);
      } catch (error) {
        console.error('[Product Service] Failed to save product FAQs:', error);
        throw error;
      }
    }

    // Sync product to Odoo (non-blocking, async)
    syncProductToOdooAsync(result.id, result.type).catch(error => {
      console.warn('[Product Service] Failed to sync product to Odoo (non-blocking):', error);
    });

    return result;
  });
}

/**
 * Update an existing product
 */
export async function updateProduct(
  type: ProductType,
  id: string,
  formData: Partial<ProductFormData>
): Promise<void> {
  // Validate inputs
  if (!type || (type !== 'class' && type !== 'experience' && type !== 'trip')) {
    throw new Error(`Tipo prodotto non valido: ${type}`);
  }
  
  if (!id || !isValidUUID(id)) {
    throw new Error('ID prodotto non valido');
  }
  
  // Validate form data if provided
  if (formData && Object.keys(formData).length > 0) {
    const fullFormData = { ...formData, type } as ProductFormData;
    const validation = validateProductFormData(fullFormData);
    if (!validation.valid) {
      // Only validate provided fields, not all fields
      // So we'll do partial validation below
    }
  }
  
  const updateData: Record<string, unknown> = {};

  // Validate and sanitize each field
  if (formData.provider_id !== undefined) {
    if (!isValidUUID(formData.provider_id)) {
      throw new Error('Provider ID non valido');
    }
    updateData.provider_id = formData.provider_id;
  }
  
  if (formData.name !== undefined) {
    const sanitizedName = sanitizeString(formData.name, 200);
    if (!sanitizedName || sanitizedName.length < 3) {
      throw new Error('Il nome del prodotto deve contenere almeno 3 caratteri');
    }
    updateData.name = sanitizedName;
  }
  
  if (formData.description !== undefined) {
    updateData.description = sanitizeString(formData.description || '', 5000) || null;
  }
  
  if (formData.max_adults !== undefined) {
    if (typeof formData.max_adults !== 'number' || formData.max_adults < 1 || formData.max_adults > 1000) {
      throw new Error('Numero massimo di adulti non valido (1-1000)');
    }
    updateData.max_adults = formData.max_adults;
  }
  
  if (formData.max_dogs !== undefined) {
    if (typeof formData.max_dogs !== 'number' || formData.max_dogs < 0 || formData.max_dogs > 1000) {
      throw new Error('Numero massimo di cani non valido (0-1000)');
    }
    updateData.max_dogs = formData.max_dogs;
  }
  
  if (formData.images !== undefined) {
    if (!Array.isArray(formData.images)) {
      throw new Error('Le immagini devono essere un array');
    }
    // Validate and filter URLs
    const validImages = formData.images.filter((url): url is string => {
      return typeof url === 'string' && url.length > 0;
    });
    updateData.images = validImages;
  }
  
  // Handle highlights: convert empty array to null, ensure it's a valid array
  if (formData.highlights !== undefined) {
    if (Array.isArray(formData.highlights) && formData.highlights.length > 0) {
      // Filter out empty strings and ensure max 10 items
      const validHighlights = formData.highlights.filter(h => h && h.trim().length > 0).slice(0, 10);
      updateData.highlights = validHighlights.length > 0 ? validHighlights : null;
    } else {
      updateData.highlights = null;
    }
  }
  
  // Handle included_items: convert empty array to null, ensure it's a valid array
  if (formData.included_items !== undefined) {
    if (Array.isArray(formData.included_items) && formData.included_items.length > 0) {
      // Filter out empty strings and ensure max 10 items
      const validIncludedItems = formData.included_items.filter(item => item && item.trim().length > 0).slice(0, 10);
      updateData.included_items = validIncludedItems.length > 0 ? validIncludedItems : null;
    } else {
      updateData.included_items = null;
    }
  }
  
  // Handle excluded_items: convert empty array to null, ensure it's a valid array
  if (formData.excluded_items !== undefined) {
    if (Array.isArray(formData.excluded_items) && formData.excluded_items.length > 0) {
      // Filter out empty strings and ensure max 10 items
      const validExcludedItems = formData.excluded_items.filter(item => item && item.trim().length > 0).slice(0, 10);
      updateData.excluded_items = validExcludedItems.length > 0 ? validExcludedItems : null;
    } else {
      updateData.excluded_items = null;
    }
  }
  
  // Handle meeting_info: validate and sanitize
  if (formData.meeting_info !== undefined) {
    if (formData.meeting_info && typeof formData.meeting_info === 'object' && formData.meeting_info !== null) {
      const meetingInfo = formData.meeting_info as { text: string; google_maps_link: string };
      const sanitizedText = meetingInfo.text ? sanitizeString(meetingInfo.text, 500) : '';
      const sanitizedLink = meetingInfo.google_maps_link && isValidUrl(meetingInfo.google_maps_link)
        ? meetingInfo.google_maps_link.trim()
        : '';
      
      if (sanitizedText || sanitizedLink) {
        updateData.meeting_info = {
          text: sanitizedText,
          google_maps_link: sanitizedLink,
        };
      } else {
        updateData.meeting_info = null;
      }
    } else {
      updateData.meeting_info = null;
    }
  }
  
  // Handle show_meeting_info: ensure it's a boolean
  if (formData.show_meeting_info !== undefined) {
    updateData.show_meeting_info = formData.show_meeting_info === true || formData.show_meeting_info === 1;
  }
  
  // Handle cancellation_policy: ensure it's a non-empty string
  if (formData.cancellation_policy !== undefined) {
    const policy = formData.cancellation_policy?.trim();
    updateData.cancellation_policy = policy && policy.length > 0 
      ? policy 
      : 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.';
  }
  
  // Handle attributes: convert empty array to null, ensure it's a valid array
  if (formData.attributes !== undefined) {
    if (Array.isArray(formData.attributes) && formData.attributes.length > 0) {
      // Filter out empty strings and ensure valid attribute keys
      const validAttributes = formData.attributes.filter((attr): attr is string => 
        typeof attr === 'string' && attr.length > 0
      );
      updateData.attributes = validAttributes.length > 0 ? validAttributes : null;
    } else {
      updateData.attributes = null;
    }
  }
  
  if ((formData as any).active !== undefined) updateData.active = (formData as any).active;
  if (formData.pricing_type !== undefined) {
    updateData.pricing_type = formData.pricing_type;
    // If no_adults is true, set price_adult_base to 0
    if (formData.pricing_type === 'linear') {
      if (formData.no_adults && (type === 'class' || type === 'experience')) {
        updateData.price_adult_base = 0;
      } else {
        updateData.price_adult_base = formData.price_adult_base;
      }
      updateData.price_dog_base = formData.price_dog_base;
    } else {
      updateData.price_adult_base = null;
      updateData.price_dog_base = null;
    }
    updateData.predefined_prices = formData.pricing_type === 'predefined' 
      ? (formData.predefined_prices as unknown as Json)
      : null;
  }

  if (type === 'class' || type === 'experience') {
    if (formData.duration_hours !== undefined) updateData.duration_hours = formData.duration_hours ?? null;
    if (formData.full_day_start_time !== undefined) updateData.full_day_start_time = formData.full_day_start_time || null;
    if (formData.full_day_end_time !== undefined) updateData.full_day_end_time = formData.full_day_end_time || null;
    if (formData.meeting_point !== undefined) updateData.meeting_point = formData.meeting_point || null;
    if (formData.no_adults !== undefined) {
      updateData.no_adults = formData.no_adults;
      // If no_adults is true, ensure price_adult_base is 0
      if (formData.no_adults && formData.pricing_type === 'linear') {
        updateData.price_adult_base = 0;
      }
    }
  } else if (type === 'trip') {
    if (formData.duration_days !== undefined) updateData.duration_days = formData.duration_days;
    if (formData.location !== undefined) updateData.location = formData.location || null;
    if (formData.start_date !== undefined) updateData.start_date = formData.start_date || null;
    if (formData.end_date !== undefined) updateData.end_date = formData.end_date || null;
  }

  // Check if there's anything to update
  if (Object.keys(updateData).length === 0) {
    console.warn('[updateProduct] No fields to update');
    return;
  }

  // Log update data for debugging
  console.log('[updateProduct] Updating product:', {
    type,
    id,
    updateData,
    updateDataKeys: Object.keys(updateData),
  });

  return retryWithBackoff(async () => {
    const { error, data } = await supabase
      .from(type)
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      const appError = handleError(error, { 
        operation: 'updateProduct', 
        type, 
        id, 
        updateDataKeys: Object.keys(updateData) 
      });
      // Check for permission errors specifically
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        throw new Error(`Errore di permessi: ${appError.userMessage}. Verifica di essere autenticato e di avere i permessi necessari.`);
      }
      throw new Error(appError.userMessage);
    }

    if (!data || data.length === 0) {
      throw new Error('Prodotto non trovato o non aggiornato');
    }

    // Save program if provided
    if (formData.program !== undefined) {
      try {
        await saveProductProgram(id, type, formData.program);
      } catch (error) {
        console.error('[Product Service] Failed to save product program:', error);
        throw error;
      }
    }

    // Save FAQs if provided
    if (formData.faqs !== undefined) {
      try {
        await saveProductFAQs(id, type, formData.faqs);
      } catch (error) {
        console.error('[Product Service] Failed to save product FAQs:', error);
        throw error;
      }
    }

    // Sync product to Odoo (non-blocking, async)
    syncProductToOdooAsync(id, type).catch(error => {
      console.warn('[Product Service] Failed to sync product to Odoo (non-blocking):', error);
    });

    console.log('[updateProduct] Product updated successfully:', data);
  });
}

/**
 * Delete a product
 */
export async function deleteProduct(type: ProductType, id: string): Promise<void> {
  // Validate inputs
  if (!type || (type !== 'class' && type !== 'experience' && type !== 'trip')) {
    throw new Error(`Tipo prodotto non valido: ${type}`);
  }
  
  if (!id || !isValidUUID(id)) {
    throw new Error('ID prodotto non valido');
  }

  return retryWithBackoff(async () => {
    // First check if product exists
    const { data: existing, error: fetchError } = await supabase
      .from(type)
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      const appError = handleError(fetchError, { operation: 'deleteProduct_check', type, id });
      throw new Error(appError.userMessage);
    }

    if (!existing) {
      throw new Error('Prodotto non trovato');
    }

    // Delete the product
    const { error } = await supabase
      .from(type)
      .delete()
      .eq('id', id);

    if (error) {
      const appError = handleError(error, { operation: 'deleteProduct', type, id });
      throw new Error(appError.userMessage);
    }
  });
}

/**
 * Get product type label in Italian
 */
export function getProductTypeLabel(type: ProductType): string {
  const labels: Record<ProductType, string> = {
    class: 'Classe',
    experience: 'Esperienza',
    trip: 'Viaggio',
  };
  return labels[type];
}

/**
 * Get product type plural label in Italian
 */
export function getProductTypePluralLabel(type: ProductType): string {
  const labels: Record<ProductType, string> = {
    class: 'Classi',
    experience: 'Esperienze',
    trip: 'Viaggi',
  };
  return labels[type];
}

/**
 * Sync product to Odoo asynchronously (non-blocking)
 * 
 * This function calls the sync-products-to-odoo Edge Function
 * to synchronize a product with Odoo. It's called automatically
 * after product creation/update but doesn't block the operation.
 * 
 * @param productId - Product UUID
 * @param productType - Product type (class, experience, trip)
 */
async function syncProductToOdooAsync(
  productId: string,
  productType: ProductType
): Promise<void> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('[Product Service] SUPABASE_URL not configured, skipping Odoo sync');
      return;
    }

    const functionUrl = `${supabaseUrl}/functions/v1/sync-products-to-odoo`;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!anonKey) {
      console.warn('[Product Service] SUPABASE_ANON_KEY not configured, skipping Odoo sync');
      return;
    }

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        productId,
        productType,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Odoo sync failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(`Odoo sync failed: ${result.error || 'Unknown error'}`);
    }

    console.log('[Product Service] Product synced to Odoo successfully:', {
      productId,
      productType,
      odooProductId: result.result?.productId,
    });
  } catch (error) {
    // Non-blocking: log error but don't throw
    console.warn('[Product Service] Failed to sync product to Odoo (non-blocking):', error);
  }
}

/**
 * Load program for a product
 */
export async function loadProductProgram(
  productId: string,
  productType: ProductType
): Promise<ProductProgram | null> {
  if (!productId || !isValidUUID(productId)) {
    throw new Error('Product ID non valido');
  }

  if (!productType || (productType !== 'class' && productType !== 'experience' && productType !== 'trip')) {
    throw new Error(`Tipo prodotto non valido: ${productType}`);
  }

  return retryWithBackoff(async () => {
    // Load days with their items
    const { data: days, error: daysError } = await supabase
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
      .eq('product_id', productId)
      .eq('product_type', productType)
      .order('day_number', { ascending: true });

    if (daysError) {
      const appError = handleError(daysError, { operation: 'loadProductProgram', productId, productType });
      throw new Error(appError.userMessage);
    }

    if (!days || days.length === 0) {
      return null;
    }

    // Transform to ProductProgram format
    const programDays: ProgramDay[] = days.map(day => ({
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

    return { days: programDays };
  });
}

/**
 * Save program for a product
 * This replaces the entire program (delete existing and insert new)
 */
export async function saveProductProgram(
  productId: string,
  productType: ProductType,
  program: ProductProgram | null
): Promise<void> {
  if (!productId || !isValidUUID(productId)) {
    throw new Error('Product ID non valido');
  }

  if (!productType || (productType !== 'class' && productType !== 'experience' && productType !== 'trip')) {
    throw new Error(`Tipo prodotto non valido: ${productType}`);
  }

  return retryWithBackoff(async () => {
    // Delete existing program (cascade will delete items)
    const { error: deleteError } = await supabase
      .from('trip_program_day')
      .delete()
      .eq('product_id', productId)
      .eq('product_type', productType);

    if (deleteError) {
      const appError = handleError(deleteError, { operation: 'saveProductProgram_delete', productId, productType });
      // Check for permission errors specifically
      if (deleteError.code === '42501' || deleteError.message?.includes('permission') || deleteError.message?.includes('policy')) {
        throw new Error(`Errore di permessi: ${appError.userMessage}. Verifica di essere autenticato e di avere i permessi necessari.`);
      }
      throw new Error(appError.userMessage);
    }

    // If program is null or empty, we're done (just deleted)
    if (!program || !program.days || program.days.length === 0) {
      return;
    }

    // Validate day numbers and items
    for (const day of program.days) {
      if (day.day_number < 1) {
        throw new Error(`Numero giorno non valido: ${day.day_number}`);
      }

      // For trips, validate day_number doesn't exceed duration_days
      if (productType === 'trip') {
        const { data: tripData } = await supabase
          .from('trip')
          .select('duration_days')
          .eq('id', productId)
          .single();

        if (tripData && tripData.duration_days && day.day_number > tripData.duration_days) {
          throw new Error(`Il giorno ${day.day_number} supera la durata del viaggio (${tripData.duration_days} giorni)`);
        }
      }

      // For experiences/classes, day_number must be 1
      if ((productType === 'experience' || productType === 'class') && day.day_number !== 1) {
        throw new Error('Per esperienze e classi, il numero del giorno deve essere 1');
      }

      // Validate items
      if (day.items && day.items.length > 10) {
        throw new Error(`Massimo 10 attività per giorno. Il giorno ${day.day_number} ha ${day.items.length} attività`);
      }

      for (const item of day.items || []) {
        if (!item.activity_text || item.activity_text.trim().length === 0) {
          throw new Error('Il testo dell\'attività non può essere vuoto');
        }
      }
    }

    // Insert days and items
    for (const day of program.days) {
      // Insert day
      const { data: insertedDay, error: dayError } = await supabase
        .from('trip_program_day')
        .insert({
          product_id: productId,
          product_type: productType,
          day_number: day.day_number,
          introduction: day.introduction || null,
        })
        .select('id')
        .single();

      if (dayError) {
        const appError = handleError(dayError, { operation: 'saveProductProgram_insert_day', productId, productType });
        // Check for permission errors specifically
        if (dayError.code === '42501' || dayError.message?.includes('permission') || dayError.message?.includes('policy')) {
          throw new Error(`Errore di permessi: ${appError.userMessage}. Verifica di essere autenticato e di avere i permessi necessari.`);
        }
        throw new Error(appError.userMessage);
      }

      // Insert items for this day
      if (day.items && day.items.length > 0) {
        const itemsToInsert = day.items.map((item, index) => ({
          day_id: insertedDay.id,
          activity_text: item.activity_text.trim(),
          order_index: item.order_index !== undefined ? item.order_index : index,
        }));

        const { error: itemsError } = await supabase
          .from('trip_program_item')
          .insert(itemsToInsert);

        if (itemsError) {
          const appError = handleError(itemsError, { operation: 'saveProductProgram_insert_items', productId, productType });
          throw new Error(appError.userMessage);
        }
      }
    }
  });
}

/**
 * Save FAQs for a product
 * This replaces the entire FAQ list (delete existing and insert new)
 */
export async function saveProductFAQs(
  productId: string,
  productType: ProductType,
  faqs: Array<{ faq_id: string; order_index: number }> | null | undefined
): Promise<void> {
  if (!productId || !isValidUUID(productId)) {
    throw new Error('Product ID non valido');
  }

  if (!productType || (productType !== 'class' && productType !== 'experience' && productType !== 'trip')) {
    throw new Error(`Tipo prodotto non valido: ${productType}`);
  }

  return retryWithBackoff(async () => {
    // Delete existing FAQs
    const { error: deleteError } = await supabase
      .from('product_faq')
      .delete()
      .eq('product_id', productId)
      .eq('product_type', productType);

    if (deleteError) {
      const appError = handleError(deleteError, { operation: 'saveProductFAQs_delete', productId, productType });
      if (deleteError.code === '42501' || deleteError.message?.includes('permission') || deleteError.message?.includes('policy')) {
        throw new Error(`Errore di permessi: ${appError.userMessage}. Verifica di essere autenticato e di avere i permessi necessari.`);
      }
      throw new Error(appError.userMessage);
    }

    // If FAQs is null or empty, we're done (just deleted)
    if (!faqs || faqs.length === 0) {
      return;
    }

    // Validate FAQ IDs
    for (const faq of faqs) {
      if (!faq.faq_id || !isValidUUID(faq.faq_id)) {
        throw new Error(`FAQ ID non valido: ${faq.faq_id}`);
      }
      if (typeof faq.order_index !== 'number' || faq.order_index < 0) {
        throw new Error(`Order index non valido: ${faq.order_index}`);
      }
    }

    // Insert FAQs
    const faqsToInsert = faqs.map(faq => ({
      product_id: productId,
      product_type: productType,
      faq_id: faq.faq_id,
      order_index: faq.order_index,
    }));

    const { error: insertError } = await supabase
      .from('product_faq')
      .insert(faqsToInsert);

    if (insertError) {
      const appError = handleError(insertError, { operation: 'saveProductFAQs_insert', productId, productType });
      if (insertError.code === '42501' || insertError.message?.includes('permission') || insertError.message?.includes('policy')) {
        throw new Error(`Errore di permessi: ${appError.userMessage}. Verifica di essere autenticato e di avere i permessi necessari.`);
      }
      throw new Error(appError.userMessage);
    }
  });
}

/**
 * Load FAQs for a product
 */
export async function loadProductFAQs(
  productId: string,
  productType: ProductType
): Promise<Array<{ faq_id: string; order_index: number }>> {
  if (!productId || !isValidUUID(productId)) {
    throw new Error('Product ID non valido');
  }

  if (!productType || (productType !== 'class' && productType !== 'experience' && productType !== 'trip')) {
    throw new Error(`Tipo prodotto non valido: ${productType}`);
  }

  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('product_faq')
      .select('faq_id, order_index')
      .eq('product_id', productId)
      .eq('product_type', productType)
      .order('order_index', { ascending: true });

    if (error) {
      const appError = handleError(error, { operation: 'loadProductFAQs', productId, productType });
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        throw new Error(`Errore di permessi: ${appError.userMessage}. Verifica di essere autenticato e di avere i permessi necessari.`);
      }
      throw new Error(appError.userMessage);
    }

    return (data || []).map(item => ({
      faq_id: item.faq_id,
      order_index: item.order_index,
    }));
  });
}

/**
 * Availability Service
 * Handles all availability slot operations
 */

import { supabase } from '@/integrations/supabase/client';
import type { AvailabilitySlot, AvailabilitySlotFormData, TripAvailabilityFormData } from '@/types/availability.types';
import type { ProductType } from '@/types/product.types';
import { isValidUUID, validateAvailabilitySlot, isValidProductType } from '@/utils/validation';
import { handleError, retryWithBackoff } from '@/utils/errorHandler';

/**
 * Fetch all availability slots for a product
 */
export async function fetchProductAvailability(
  productId: string,
  productType: ProductType
): Promise<AvailabilitySlot[]> {
  // Validate inputs
  if (!productId || !isValidUUID(productId)) {
    throw new Error('Product ID non valido');
  }
  
  if (!isValidProductType(productType)) {
    throw new Error(`Tipo prodotto non valido: ${productType}`);
  }

  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('availability_slot')
      .select('*')
      .eq('product_id', productId)
      .eq('product_type', productType)
      .order('date', { ascending: true })
      .order('time_slot', { ascending: true });

    if (error) {
      const appError = handleError(error, { operation: 'fetchProductAvailability', productId, productType });
      throw new Error(appError.userMessage);
    }

    return data || [];
  });
}

/**
 * Create availability slots for a product
 */
export async function createAvailabilitySlots(
  productId: string,
  productType: ProductType,
  slots: AvailabilitySlotFormData[]
): Promise<AvailabilitySlot[]> {
  // Validate inputs
  if (!productId || !isValidUUID(productId)) {
    throw new Error('Product ID non valido');
  }
  
  if (!isValidProductType(productType)) {
    throw new Error(`Tipo prodotto non valido: ${productType}`);
  }
  
  if (!Array.isArray(slots) || slots.length === 0) {
    throw new Error('Almeno uno slot di disponibilità è richiesto');
  }
  
  if (slots.length > 100) {
    throw new Error('Troppi slot da creare (massimo 100 per volta)');
  }

  // Validate each slot
  const validationErrors: string[] = [];
  slots.forEach((slot, index) => {
    const validation = validateAvailabilitySlot({ ...slot, product_id: productId, product_type: productType });
    if (!validation.valid) {
      validationErrors.push(`Slot ${index + 1}: ${validation.errors.join(', ')}`);
    }
  });
  
  if (validationErrors.length > 0) {
    throw new Error(`Errori di validazione: ${validationErrors.join('; ')}`);
  }

  return retryWithBackoff(async () => {
    const slotsToInsert = slots.map(slot => ({
      product_id: productId,
      product_type: productType,
      date: slot.date,
      time_slot: slot.time_slot || null,
      end_time: slot.end_time || null,
      max_adults: slot.max_adults,
      max_dogs: slot.max_dogs,
      booked_adults: 0,
      booked_dogs: 0,
    }));

    const { data, error } = await supabase
      .from('availability_slot')
      .insert(slotsToInsert)
      .select();

    if (error) {
      const appError = handleError(error, { operation: 'createAvailabilitySlots', productId, productType, slotsCount: slots.length });
      throw new Error(appError.userMessage);
    }

    return data || [];
  });
}

/**
 * Create trip availability (single slot for entire trip)
 * For trips: ogni prodotto ha un solo periodo predefinito (start_date + duration_days)
 * Gestiamo solo max_adults e max_dogs, la data viene presa dal prodotto
 */
export async function createTripAvailability(
  productId: string,
  tripData: { max_adults: number; max_dogs: number }
): Promise<AvailabilitySlot> {
  // Validate inputs
  if (!productId || !isValidUUID(productId)) {
    throw new Error('Product ID non valido');
  }
  
  if (typeof tripData.max_adults !== 'number' || tripData.max_adults < 1 || tripData.max_adults > 1000) {
    throw new Error('Numero massimo di adulti non valido (1-1000)');
  }
  
  if (typeof tripData.max_dogs !== 'number' || tripData.max_dogs < 0 || tripData.max_dogs > 1000) {
    throw new Error('Numero massimo di cani non valido (0-1000)');
  }

  return retryWithBackoff(async () => {
    // Fetch product to get start_date
    const { data: productData, error: productError } = await supabase
      .from('trip')
      .select('start_date')
      .eq('id', productId)
      .maybeSingle();

    if (productError) {
      const appError = handleError(productError, { operation: 'createTripAvailability_fetch', productId });
      throw new Error(appError.userMessage);
    }

    if (!productData || !productData.start_date) {
      throw new Error('Trip product start_date is missing. Please set the trip start date first.');
    }

    const { data, error } = await supabase
      .from('availability_slot')
      .insert({
        product_id: productId,
        product_type: 'trip',
        date: productData.start_date, // Use start_date from product
        time_slot: null,
        end_time: null,
        max_adults: tripData.max_adults,
        max_dogs: tripData.max_dogs,
        booked_adults: 0,
        booked_dogs: 0,
      })
      .select()
      .single();

    if (error) {
      const appError = handleError(error, { operation: 'createTripAvailability', productId });
      throw new Error(appError.userMessage);
    }

    if (!data) {
      throw new Error('Slot creato ma non restituito dal database');
    }

    return data;
  });
}

/**
 * Update availability slot
 */
export async function updateAvailabilitySlot(
  slotId: string,
  updates: Partial<AvailabilitySlotFormData>
): Promise<AvailabilitySlot> {
  // Validate inputs
  if (!slotId || !isValidUUID(slotId)) {
    throw new Error('Slot ID non valido');
  }
  
  if (!updates || Object.keys(updates).length === 0) {
    throw new Error('Nessun aggiornamento specificato');
  }
  
  // Validate numeric fields if provided
  if (updates.max_adults !== undefined) {
    if (typeof updates.max_adults !== 'number' || updates.max_adults < 1 || updates.max_adults > 1000) {
      throw new Error('Numero massimo di adulti non valido (1-1000)');
    }
  }
  
  if (updates.max_dogs !== undefined) {
    if (typeof updates.max_dogs !== 'number' || updates.max_dogs < 0 || updates.max_dogs > 1000) {
      throw new Error('Numero massimo di cani non valido (0-1000)');
    }
  }
  
  // Validate date if provided
  if (updates.date !== undefined && !updates.date) {
    throw new Error('Data non valida');
  }
  
  // Validate time_slot format if provided
  if (updates.time_slot !== undefined && updates.time_slot !== null) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (typeof updates.time_slot !== 'string' || !timeRegex.test(updates.time_slot)) {
      throw new Error('Formato orario non valido (deve essere HH:MM)');
    }
  }

  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('availability_slot')
      .update({
        ...updates,
        time_slot: updates.time_slot === undefined ? undefined : (updates.time_slot || null),
        end_time: updates.end_time === undefined ? undefined : (updates.end_time || null),
      })
      .eq('id', slotId)
      .select()
      .single();

    if (error) {
      const appError = handleError(error, { operation: 'updateAvailabilitySlot', slotId });
      throw new Error(appError.userMessage);
    }

    if (!data) {
      throw new Error('Slot non trovato o non aggiornato');
    }

    return data;
  });
}

/**
 * Delete availability slot
 */
export async function deleteAvailabilitySlot(slotId: string): Promise<void> {
  // Validate input
  if (!slotId || !isValidUUID(slotId)) {
    throw new Error('Slot ID non valido');
  }

  return retryWithBackoff(async () => {
    // First check if slot exists
    const { data: existing, error: fetchError } = await supabase
      .from('availability_slot')
      .select('id')
      .eq('id', slotId)
      .maybeSingle();

    if (fetchError) {
      const appError = handleError(fetchError, { operation: 'deleteAvailabilitySlot_check', slotId });
      throw new Error(appError.userMessage);
    }

    if (!existing) {
      // Slot doesn't exist, consider it already deleted
      console.warn(`[deleteAvailabilitySlot] Slot ${slotId} not found, considering it already deleted`);
      return;
    }

    const { error } = await supabase
      .from('availability_slot')
      .delete()
      .eq('id', slotId);

    if (error) {
      const appError = handleError(error, { operation: 'deleteAvailabilitySlot', slotId });
      throw new Error(appError.userMessage);
    }
  });
}

/**
 * Delete all availability slots for a product
 */
export async function deleteProductAvailability(
  productId: string,
  productType: ProductType
): Promise<void> {
  // Validate inputs
  if (!productId || !isValidUUID(productId)) {
    throw new Error('Product ID non valido');
  }
  
  if (!isValidProductType(productType)) {
    throw new Error(`Tipo prodotto non valido: ${productType}`);
  }

  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('availability_slot')
      .delete()
      .eq('product_id', productId)
      .eq('product_type', productType);

    if (error) {
      const appError = handleError(error, { operation: 'deleteProductAvailability', productId, productType });
      throw new Error(appError.userMessage);
    }
  });
}

/**
 * Check if a slot is available (considering cutoff time and capacity)
 */
export async function checkSlotAvailability(
  productId: string,
  productType: ProductType,
  date: string,
  timeSlot: string | null = null
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('is_slot_available', {
      _product_id: productId,
      _product_type: productType,
      _date: date,
      _time_slot: timeSlot,
    });

  if (error) {
    console.error('Error checking slot availability:', error);
    return false;
  }

  return data === true;
}


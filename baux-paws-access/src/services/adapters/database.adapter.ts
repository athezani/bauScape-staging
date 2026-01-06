/**
 * Database Adapter Interface
 * 
 * This module abstracts database operations for future direct Supabase integration.
 * Currently provides a thin wrapper around existing services, designed to be
 * easily swappable or enhanced with direct database access.
 * 
 * EXTERNAL INTEGRATION NOTES:
 * - This adapter can be extended for direct Supabase REST API calls
 * - Useful for edge functions or external services that need DB access
 * - All database operations should go through this adapter for consistency
 */

import { supabase } from '@/integrations/supabase/client';
import type { Booking, BookingStatus } from '@/types/booking.types';
import type { Product, ProductFormData, PredefinedPrice } from '@/types/product.types';
import type { Provider } from '@/types/provider.types';
import type { Json } from '@/integrations/supabase/types';

export type DatabaseProvider = 'supabase' | 'external';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

export interface QueryResult<T> {
  data: T[];
  count: number;
  error?: string;
}

export interface MutationResult<T> {
  data: T | null;
  error?: string;
}

/**
 * Booking insert data type for database
 */
export interface BookingInsertData {
  provider_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  product_name: string;
  product_description?: string | null;
  product_type: 'experience' | 'trip';
  event_id?: string | null;
  event_type?: 'class' | 'experience' | 'trip' | null;
  booking_date: string;
  end_date?: string | null;
  booking_time?: string | null;
  number_of_humans?: number;
  number_of_dogs?: number;
  total_amount?: number | null;
  special_requests?: string | null;
  shopify_order_id?: string | null;
  status?: string;
}

/**
 * Helper to safely parse predefined_prices from JSON
 */
function parsePredefinedPrices(value: Json | null): PredefinedPrice[] | null {
  if (!value || !Array.isArray(value)) return null;
  return value as unknown as PredefinedPrice[];
}

/**
 * Database Adapter Interface
 * Implement this interface for different database providers
 */
export interface IDatabaseAdapter {
  // Bookings
  getBookings(providerId: string, options?: QueryOptions): Promise<QueryResult<Booking>>;
  getBookingById(id: string): Promise<MutationResult<Booking>>;
  createBooking(data: BookingInsertData): Promise<MutationResult<Booking>>;
  updateBookingStatus(id: string, status: BookingStatus): Promise<MutationResult<Booking>>;

  // Providers
  getProviders(options?: QueryOptions): Promise<QueryResult<Provider>>;
  getProviderById(id: string): Promise<MutationResult<Provider>>;
  updateProvider(id: string, data: Partial<Provider>): Promise<MutationResult<Provider>>;

  // Products
  getProducts(options?: QueryOptions): Promise<QueryResult<Product>>;
  getProductsByProvider(providerId: string): Promise<QueryResult<Product>>;
  createProduct(data: ProductFormData): Promise<MutationResult<Product>>;
  deleteProduct(type: string, id: string): Promise<MutationResult<void>>;
}

/**
 * Supabase Database Adapter Implementation
 */
class SupabaseDatabaseAdapter implements IDatabaseAdapter {
  async getBookings(providerId: string, options?: QueryOptions): Promise<QueryResult<Booking>> {
    let query = supabase
      .from('booking')
      .select('*', { count: 'exact' })
      .eq('provider_id', providerId);

    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderDirection === 'asc' });
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, count, error } = await query;

    return {
      data: (data as unknown as Booking[]) || [],
      count: count || 0,
      error: error?.message,
    };
  }

  async getBookingById(id: string): Promise<MutationResult<Booking>> {
    const { data, error } = await supabase
      .from('booking')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    return {
      data: data as unknown as Booking | null,
      error: error?.message,
    };
  }

  async createBooking(bookingData: BookingInsertData): Promise<MutationResult<Booking>> {
    const { data, error } = await supabase
      .from('booking')
      .insert({
        provider_id: bookingData.provider_id,
        customer_name: bookingData.customer_name,
        customer_email: bookingData.customer_email,
        customer_phone: bookingData.customer_phone || null,
        product_name: bookingData.product_name,
        product_description: bookingData.product_description || null,
        product_type: bookingData.product_type,
        event_id: bookingData.event_id || null,
        event_type: bookingData.event_type || null,
        booking_date: bookingData.booking_date,
        end_date: bookingData.end_date || null,
        booking_time: bookingData.booking_time || null,
        number_of_humans: bookingData.number_of_humans || 1,
        number_of_dogs: bookingData.number_of_dogs || 1,
        total_amount: bookingData.total_amount || null,
        special_requests: bookingData.special_requests || null,
        shopify_order_id: bookingData.shopify_order_id || null,
        status: bookingData.status || 'pending',
      })
      .select()
      .single();

    return {
      data: data as unknown as Booking | null,
      error: error?.message,
    };
  }

  async updateBookingStatus(id: string, status: BookingStatus): Promise<MutationResult<Booking>> {
    const { data, error } = await supabase
      .from('booking')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    return {
      data: data as unknown as Booking | null,
      error: error?.message,
    };
  }

  async getProviders(options?: QueryOptions): Promise<QueryResult<Provider>> {
    let query = supabase
      .from('profile')
      .select('*', { count: 'exact' });

    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.orderDirection === 'asc' });
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, count, error } = await query;

    return {
      data: (data as Provider[]) || [],
      count: count || 0,
      error: error?.message,
    };
  }

  async getProviderById(id: string): Promise<MutationResult<Provider>> {
    const { data, error } = await supabase
      .from('profile')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    return {
      data: data as Provider | null,
      error: error?.message,
    };
  }

  async updateProvider(id: string, providerData: Partial<Provider>): Promise<MutationResult<Provider>> {
    const { data, error } = await supabase
      .from('profile')
      .update(providerData)
      .eq('id', id)
      .select()
      .single();

    return {
      data: data as Provider | null,
      error: error?.message,
    };
  }

  async getProducts(_options?: QueryOptions): Promise<QueryResult<Product>> {
    const [classes, experiences, trips] = await Promise.all([
      supabase.from('class').select('*'),
      supabase.from('experience').select('*'),
      supabase.from('trip').select('*'),
    ]);

    const products: Product[] = [
      ...(classes.data || []).map(p => ({ 
        ...p, 
        type: 'class' as const,
        predefined_prices: parsePredefinedPrices(p.predefined_prices),
      })),
      ...(experiences.data || []).map(p => ({ 
        ...p, 
        type: 'experience' as const,
        predefined_prices: parsePredefinedPrices(p.predefined_prices),
      })),
      ...(trips.data || []).map(p => ({ 
        ...p, 
        type: 'trip' as const,
        predefined_prices: parsePredefinedPrices(p.predefined_prices),
      })),
    ];

    return {
      data: products,
      count: products.length,
    };
  }

  async getProductsByProvider(providerId: string): Promise<QueryResult<Product>> {
    const [classes, experiences, trips] = await Promise.all([
      supabase.from('class').select('*').eq('provider_id', providerId),
      supabase.from('experience').select('*').eq('provider_id', providerId),
      supabase.from('trip').select('*').eq('provider_id', providerId),
    ]);

    const products: Product[] = [
      ...(classes.data || []).map(p => ({ 
        ...p, 
        type: 'class' as const,
        predefined_prices: parsePredefinedPrices(p.predefined_prices),
      })),
      ...(experiences.data || []).map(p => ({ 
        ...p, 
        type: 'experience' as const,
        predefined_prices: parsePredefinedPrices(p.predefined_prices),
      })),
      ...(trips.data || []).map(p => ({ 
        ...p, 
        type: 'trip' as const,
        predefined_prices: parsePredefinedPrices(p.predefined_prices),
      })),
    ];

    return {
      data: products,
      count: products.length,
    };
  }

  async createProduct(formData: ProductFormData): Promise<MutationResult<Product>> {
    const { type, ...data } = formData;

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
          return { data: null, error: 'Almeno un prezzo predefinito valido è richiesto quando il tipo di prezzo è "predefinito"' };
        }
      } else {
        return { data: null, error: 'Almeno un prezzo predefinito è richiesto quando il tipo di prezzo è "predefinito"' };
      }
    }

    const baseData = {
      provider_id: data.provider_id,
      name: data.name,
      description: data.description || null,
      max_adults: data.max_adults,
      max_dogs: data.max_dogs,
      pricing_type: data.pricing_type,
      price_adult_base: data.pricing_type === 'linear' ? data.price_adult_base : null,
      price_dog_base: data.pricing_type === 'linear' ? data.price_dog_base : null,
      predefined_prices: formattedPredefinedPrices,
      images: data.images || [],
      highlights: data.highlights || [],
      included_items: data.included_items || [],
      excluded_items: data.excluded_items || [],
      cancellation_policy: data.cancellation_policy || 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.',
      attributes: Array.isArray(data.attributes) && data.attributes.length > 0 ? data.attributes : null,
      meeting_info: data.meeting_info || null,
      show_meeting_info: data.show_meeting_info === true || data.show_meeting_info === 1 || false,
    };

    let result;

    if (type === 'class') {
      const { data: created, error } = await supabase
        .from('class')
        .insert({
          ...baseData,
          duration_hours: data.duration_hours ?? null,
          full_day_start_time: data.full_day_start_time || null,
          full_day_end_time: data.full_day_end_time || null,
          meeting_point: data.meeting_point || null,
        })
        .select()
        .single();

      if (error) return { data: null, error: error.message };
      result = { 
        ...created, 
        type: 'class' as const,
        predefined_prices: parsePredefinedPrices(created.predefined_prices),
      };
    } else if (type === 'experience') {
      const { data: created, error } = await supabase
        .from('experience')
        .insert({
          ...baseData,
          duration_hours: data.duration_hours ?? null,
          full_day_start_time: data.full_day_start_time || null,
          full_day_end_time: data.full_day_end_time || null,
          meeting_point: data.meeting_point || null,
        })
        .select()
        .single();

      if (error) return { data: null, error: error.message };
      result = { 
        ...created, 
        type: 'experience' as const,
        predefined_prices: parsePredefinedPrices(created.predefined_prices),
      };
    } else {
      // For trips, ensure duration_days has a valid default
      const tripDurationDays = data.duration_days && data.duration_days > 0 ? data.duration_days : 3;
      
      // Calculate end_date if start_date is provided but end_date is not
      let tripEndDate = data.end_date || null;
      if (data.start_date && !tripEndDate && tripDurationDays > 0) {
        const start = new Date(data.start_date);
        const end = new Date(start);
        end.setDate(end.getDate() + tripDurationDays - 1);
        tripEndDate = end.toISOString().split('T')[0];
      }
      
      const { data: created, error } = await supabase
        .from('trip')
        .insert({
          ...baseData,
          duration_days: tripDurationDays,
          location: data.location || null,
          start_date: data.start_date || null,
          end_date: tripEndDate,
        })
        .select()
        .single();

      if (error) return { data: null, error: error.message };
      result = { 
        ...created, 
        type: 'trip' as const,
        predefined_prices: parsePredefinedPrices(created.predefined_prices),
      };
    }

    return { data: result as Product };
  }

  async deleteProduct(type: string, id: string): Promise<MutationResult<void>> {
    const table = type as 'class' | 'experience' | 'trip';
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    return {
      data: null,
      error: error?.message,
    };
  }
}

// Factory function
export function getDatabaseAdapter(provider: DatabaseProvider = 'supabase'): IDatabaseAdapter {
  switch (provider) {
    case 'supabase':
    default:
      return new SupabaseDatabaseAdapter();
  }
}

// Default export
export const databaseAdapter = getDatabaseAdapter('supabase');

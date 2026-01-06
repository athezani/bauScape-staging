/**
 * Booking Service
 * Handles all booking-related data operations
 */

import { supabase } from '@/integrations/supabase/client';
import type { Booking, BookingStats, BookingStatus, EventGroup } from '@/types';
import { isValidUUID } from '@/utils/validation';
import { handleError, retryWithBackoff } from '@/utils/errorHandler';

/**
 * Fetch bookings for a provider
 */
export async function fetchProviderBookings(providerId: string): Promise<Booking[]> {
  if (!providerId || !isValidUUID(providerId)) {
    throw new Error('Provider ID non valido');
  }

  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('booking')
      .select('*')
      .eq('provider_id', providerId)
      .order('booking_date', { ascending: true });

    if (error) {
      const appError = handleError(error, { operation: 'fetchProviderBookings', providerId });
      throw new Error(appError.userMessage);
    }
    
    return (data || []) as Booking[];
  });
}

/**
 * Fetch future bookings for a provider (from today onwards)
 */
export async function fetchFutureBookings(providerId: string): Promise<Booking[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('booking')
    .select('*')
    .eq('provider_id', providerId)
    .gte('booking_date', today)
    .order('booking_date', { ascending: true });

  if (error) throw error;
  return (data || []) as Booking[];
}

/**
 * Fetch booking stats for a provider
 */
export async function fetchBookingStats(providerId: string): Promise<BookingStats> {
  const { data, error } = await supabase
    .from('booking')
    .select('status')
    .eq('provider_id', providerId);

  if (error) throw error;

  const stats: BookingStats = {
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  };

  if (data) {
    stats.total = data.length;
    stats.pending = data.filter((b) => b.status === 'pending').length;
    stats.confirmed = data.filter((b) => b.status === 'confirmed').length;
    stats.completed = data.filter((b) => b.status === 'completed').length;
    stats.cancelled = data.filter((b) => b.status === 'cancelled').length;
  }

  return stats;
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  bookingId: string, 
  newStatus: BookingStatus
): Promise<void> {
  // Validate inputs
  if (!bookingId || !isValidUUID(bookingId)) {
    throw new Error('Booking ID non valido');
  }
  
  const validStatuses: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Stato prenotazione non valido: ${newStatus}`);
  }

  return retryWithBackoff(async () => {
    // Validate status change before updating
    const isValid = await validateStatusChange(bookingId, newStatus);
    if (!isValid) {
      throw new Error('Transizione di stato non valida. Verifica lo stato attuale della prenotazione.');
    }

    const { error } = await supabase
      .from('booking')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (error) {
      const appError = handleError(error, { operation: 'updateBookingStatus', bookingId, newStatus });
      throw new Error(appError.userMessage);
    }
  });
}

/**
 * Validate booking status change (server-side validation)
 */
export async function validateStatusChange(
  bookingId: string, 
  newStatus: BookingStatus
): Promise<boolean> {
  const { data, error } = await supabase.rpc('validate_booking_status_change', {
    _booking_id: bookingId,
    _new_status: newStatus,
  });

  if (error) return false;
  return data === true;
}

/**
 * Fetch event details for a booking
 */
export async function fetchEventDetails(
  eventType: string, 
  eventId: string
): Promise<{ id: string; name: string; description: string | null; provider_id: string } | null> {
  let data = null;
  
  if (eventType === 'trip') {
    const result = await supabase
      .from('trip')
      .select('id, name, description, provider_id')
      .eq('id', eventId)
      .maybeSingle();
    data = result.data;
  } else if (eventType === 'experience') {
    const result = await supabase
      .from('experience')
      .select('id, name, description, provider_id')
      .eq('id', eventId)
      .maybeSingle();
    data = result.data;
  } else {
    const result = await supabase
      .from('class')
      .select('id, name, description, provider_id')
      .eq('id', eventId)
      .maybeSingle();
    data = result.data;
  }
  
  return data;
}

/**
 * Fetch bookings with event details
 */
export async function fetchBookingsWithEvents(providerId: string): Promise<Booking[]> {
  const bookings = await fetchFutureBookings(providerId);
  
  if (bookings.length === 0) return [];

  const hasNewSchema = 'event_type' in bookings[0];
  
  if (!hasNewSchema) {
    // Legacy schema: use product fields directly
    return bookings.map((booking: any) => ({
      ...booking,
      event_type: booking.product_type,
      event_id: null,
      event: { name: booking.product_name },
    }));
  }

  // New schema: fetch event details
  const bookingsWithEvents = await Promise.all(
    bookings.map(async (booking) => {
      let event = null;
      
      if (booking.event_type && booking.event_id) {
        event = await fetchEventDetails(booking.event_type, booking.event_id);
      }
      
      return { ...booking, event };
    })
  );

  return bookingsWithEvents;
}

/**
 * Group bookings by event
 */
export function groupBookingsByEvent(bookings: Booking[]): EventGroup[] {
  const grouped = bookings.reduce((acc: Record<string, EventGroup>, booking) => {
    const eventName = booking.event?.name || booking.product_name || 'Unnamed Event';
    const hasEventId = !!booking.event_id;
    const key = hasEventId 
      ? `${booking.event_id}-${booking.booking_date}-${booking.booking_time || 'no-time'}`
      : `${booking.product_name}-${booking.booking_date}-${booking.booking_time || 'no-time'}`;
    
    if (!acc[key]) {
      acc[key] = {
        eventKey: key,
        eventName,
        eventType: booking.event_type || booking.product_type || 'experience',
        bookingDate: booking.booking_date,
        endDate: booking.end_date,
        bookingTime: booking.booking_time,
        bookings: [],
      };
    }
    
    acc[key].bookings.push(booking);
    return acc;
  }, {});

  // Sort by date, with pending bookings first
  return Object.values(grouped).sort((a, b) => {
    const aHasPending = a.bookings.some((b) => b.status === 'pending');
    const bHasPending = b.bookings.some((b) => b.status === 'pending');
    
    if (aHasPending && !bHasPending) return -1;
    if (!aHasPending && bHasPending) return 1;
    
    return new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
  });
}

/**
 * Subscribe to booking changes (realtime)
 */
export function subscribeToBookingChanges(
  providerId: string, 
  callback: () => void
) {
  const channel = supabase
    .channel('bookings-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'booking',
        filter: `provider_id=eq.${providerId}`,
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
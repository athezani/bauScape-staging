/**
 * Availability-related type definitions
 */

export interface AvailabilitySlot {
  id: string;
  product_id: string;
  product_type: 'experience' | 'class' | 'trip';
  date: string; // ISO date string
  time_slot: string | null; // HH:mm format or null for full-day/trips
  end_time: string | null; // HH:mm format or null
  max_adults: number;
  max_dogs: number;
  booked_adults: number;
  booked_dogs: number;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlotFormData {
  date: string;
  time_slot?: string | null;
  end_time?: string | null;
  max_adults: number;
  max_dogs: number;
}

export interface TripAvailabilityFormData {
  // Per i trip, le date sono fisse e gestite nel prodotto stesso
  // Qui gestiamo solo la disponibilità (max adulti e cani)
  max_adults: number;
  max_dogs: number;
}

export interface FullDayTimeFormData {
  start_time: string; // HH:mm
  end_time: string; // HH:mm
}


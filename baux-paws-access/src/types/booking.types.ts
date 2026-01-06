/**
 * Booking-related type definitions
 * Centralized interfaces for booking entities
 */

import type { ProductType } from './product.types';

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type EventType = 'class' | 'experience' | 'trip';

// Re-export ProductType for backward compatibility
export type { ProductType };

export interface Event {
  id: string;
  name: string;
  description: string | null;
  provider_id: string;
}

export interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  event_type: EventType;
  event_id: string | null;
  product_name?: string;
  product_description?: string | null;
  product_type?: ProductType;
  booking_date: string;
  end_date: string | null;
  booking_time: string | null;
  number_of_dogs: number;
  number_of_humans: number;
  total_amount: number | null;
  status: BookingStatus;
  special_requests: string | null;
  shopify_order_id: string | null;
  created_at: string;
  provider_id: string;
  event?: Event;
}

export interface EventGroup {
  eventKey: string;
  eventName: string;
  eventType: EventType;
  bookingDate: string;
  endDate: string | null;
  bookingTime: string | null;
  bookings: Booking[];
}

export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

export interface ProductGroup {
  eventName: string;
  eventType: EventType;
  bookings: Booking[];
  startCol: number;
  span: number;
  bookingTime: string | null;
  bookingDate: string;
  endDate: string | null;
  status: BookingStatus;
}

export interface ProductStats {
  name: string;
  bookings: number;
  revenue: number;
  humans: number;
  dogs: number;
}
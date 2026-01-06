/**
 * Order/Webhook Adapter Interface
 * 
 * This module handles incoming orders from external systems (e.g., Shopify).
 * Designed to receive webhook payloads and transform them into internal booking format.
 * 
 * EXTERNAL INTEGRATION NOTES:
 * - Create edge function to receive webhooks from Shopify/other platforms
 * - Validate webhook signatures for security
 * - Transform external order format to internal booking format
 * - Trigger email notifications on new orders
 */

import type { BookingStatus, ProductType } from '@/types/booking.types';

export type OrderSource = 'shopify' | 'woocommerce' | 'manual' | 'api';
export type WebhookEventType = 
  | 'order.created'
  | 'order.updated'
  | 'order.cancelled'
  | 'order.refunded'
  | 'order.fulfilled';

/**
 * External order structure (e.g., from Shopify)
 */
export interface ExternalOrder {
  id: string;
  source: OrderSource;
  sourceOrderId: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  lineItems: ExternalLineItem[];
  totalAmount: number;
  currency: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ExternalLineItem {
  id: string;
  productId: string;
  productName: string;
  productType: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  price: number;
  properties?: Record<string, string>;
}

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  event: WebhookEventType;
  source: OrderSource;
  timestamp: string;
  signature?: string;
  data: ExternalOrder;
}

/**
 * Internal booking creation data
 */
export interface BookingCreateData {
  providerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  productName: string;
  productDescription?: string;
  productType: ProductType;
  eventId?: string;
  bookingDate: string;
  endDate?: string;
  bookingTime?: string;
  numberOfHumans: number;
  numberOfDogs: number;
  totalAmount?: number;
  specialRequests?: string;
  shopifyOrderId?: string;
  status: BookingStatus;
}

export interface OrderProcessingResult {
  success: boolean;
  bookingIds?: string[];
  errors?: string[];
}

/**
 * Order Adapter Interface
 * Implement this interface for different order sources
 */
export interface IOrderAdapter {
  validateWebhook(payload: WebhookPayload, secret: string): boolean;
  transformToBookings(order: ExternalOrder): BookingCreateData[];
  processOrder(order: ExternalOrder): Promise<OrderProcessingResult>;
  handleWebhook(payload: WebhookPayload): Promise<OrderProcessingResult>;
}

/**
 * Shopify Order Adapter
 * Transforms Shopify orders into internal booking format
 */
export class ShopifyOrderAdapter implements IOrderAdapter {
  private providerMapping: Map<string, string> = new Map();

  /**
   * Set mapping from Shopify product IDs to provider IDs
   */
  setProviderMapping(mapping: Record<string, string>): void {
    this.providerMapping = new Map(Object.entries(mapping));
  }

  validateWebhook(payload: WebhookPayload, secret: string): boolean {
    // TODO: Implement HMAC signature validation
    // See: https://shopify.dev/docs/apps/webhooks/configuration/https#verify-the-webhook
    if (!payload.signature) {
      console.warn('[Shopify] Missing webhook signature');
      return false;
    }

    // Placeholder - implement actual HMAC validation
    console.log('[Shopify] Webhook signature validation placeholder');
    return true;
  }

  transformToBookings(order: ExternalOrder): BookingCreateData[] {
    const bookings: BookingCreateData[] = [];

    for (const item of order.lineItems) {
      // Extract booking details from line item properties
      const properties = item.properties || {};
      
      const booking: BookingCreateData = {
        providerId: this.providerMapping.get(item.productId) || '',
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        customerPhone: order.customer.phone,
        productName: item.productName,
        productType: this.mapProductType(item.productType),
        bookingDate: properties['booking_date'] || new Date().toISOString().split('T')[0],
        endDate: properties['end_date'],
        bookingTime: properties['booking_time'],
        numberOfHumans: parseInt(properties['adults'] || '1', 10),
        numberOfDogs: parseInt(properties['dogs'] || '1', 10),
        totalAmount: item.price * item.quantity,
        specialRequests: properties['special_requests'] || order.notes,
        shopifyOrderId: order.sourceOrderId,
        status: 'pending',
      };

      bookings.push(booking);
    }

    return bookings;
  }

  async processOrder(order: ExternalOrder): Promise<OrderProcessingResult> {
    try {
      const bookings = this.transformToBookings(order);
      const bookingIds: string[] = [];
      const errors: string[] = [];

      for (const bookingData of bookings) {
        if (!bookingData.providerId) {
          errors.push(`No provider mapping for product: ${bookingData.productName}`);
          continue;
        }

        // TODO: Create booking via database adapter
        console.log('[Shopify] Would create booking:', bookingData);
        // const result = await databaseAdapter.createBooking(bookingData);
        // bookingIds.push(result.id);
      }

      return {
        success: errors.length === 0,
        bookingIds,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
      };
    }
  }

  async handleWebhook(payload: WebhookPayload): Promise<OrderProcessingResult> {
    switch (payload.event) {
      case 'order.created':
        return this.processOrder(payload.data);
      
      case 'order.updated':
        // TODO: Handle order updates
        console.log('[Shopify] Order updated:', payload.data.id);
        return { success: true };
      
      case 'order.cancelled':
        // TODO: Handle order cancellation
        console.log('[Shopify] Order cancelled:', payload.data.id);
        return { success: true };
      
      case 'order.refunded':
        // TODO: Handle order refund
        console.log('[Shopify] Order refunded:', payload.data.id);
        return { success: true };
      
      default:
        console.log('[Shopify] Unhandled event:', payload.event);
        return { success: true };
    }
  }

  private mapProductType(externalType: string): ProductType {
    const typeMap: Record<string, ProductType> = {
      'class': 'class',
      'experience': 'experience',
      'trip': 'trip',
      'tour': 'experience',
      'activity': 'experience',
      'workshop': 'class',
    };

    return typeMap[externalType.toLowerCase()] || 'experience';
  }
}

/**
 * Order Processing Service
 * Central service for handling incoming orders from any source
 */
export class OrderProcessingService {
  private adapters: Map<OrderSource, IOrderAdapter> = new Map();

  registerAdapter(source: OrderSource, adapter: IOrderAdapter): void {
    this.adapters.set(source, adapter);
  }

  getAdapter(source: OrderSource): IOrderAdapter | undefined {
    return this.adapters.get(source);
  }

  async processWebhook(payload: WebhookPayload, secret: string): Promise<OrderProcessingResult> {
    const adapter = this.adapters.get(payload.source);

    if (!adapter) {
      return {
        success: false,
        errors: [`No adapter registered for source: ${payload.source}`],
      };
    }

    if (!adapter.validateWebhook(payload, secret)) {
      return {
        success: false,
        errors: ['Invalid webhook signature'],
      };
    }

    return adapter.handleWebhook(payload);
  }
}

// Singleton instance
export const orderProcessingService = new OrderProcessingService();

// Register default adapters
orderProcessingService.registerAdapter('shopify', new ShopifyOrderAdapter());

// Export types for webhook edge function
export type { BookingCreateData as WebhookBookingData };

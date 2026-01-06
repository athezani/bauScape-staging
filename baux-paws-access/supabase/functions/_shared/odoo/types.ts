/**
 * Odoo Integration Types
 * 
 * Types and interfaces for Odoo API integration
 */

/**
 * Odoo connection configuration
 */
export interface OdooConfig {
  url: string;
  database: string;
  username: string;
  apiKey: string;
}

/**
 * Booking data structure for Odoo integration
 * Contains all financial and booking information
 */
export interface BookingDataForOdoo {
  // Booking identification
  bookingId: string;
  orderNumber?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  
  // Customer information
  customer: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null; // "Nome Cognome" format
    phone?: string | null;
    fiscalCode?: string | null;
    address?: string | null;
  };
  
  // Product/Service information
  product: {
    id: string;
    name: string;
    type: 'experience' | 'class' | 'trip';
    description?: string | null;
  };
  
  // Provider information
  provider: {
    id: string;
    name: string; // company_name
    email?: string | null;
    contactName?: string | null; // contact_name (contact person)
    phone?: string | null;
  };
  
  // Booking details
  bookingDate: string; // ISO date string
  bookingTime?: string | null;
  numberOfAdults: number;
  numberOfDogs: number;
  
  // Financial data (from booking table)
  totalAmountPaid: number; // Total amount paid by customer
  currency: string; // e.g., "EUR"
  providerCostTotal: number | null; // Costo fornitore totale
  stripeFee: number | null; // Commissione Stripe
  internalMargin: number | null; // Margine interno
  netRevenue: number | null; // Ricavo netto (same as internal_margin)
  
  // Trip-specific fields (if applicable)
  tripStartDate?: string | null;
  tripEndDate?: string | null;
}

/**
 * Odoo Purchase Order creation result
 */
export interface OdooPurchaseOrderResult {
  success: boolean;
  purchaseOrderId?: number;
  skipped?: boolean; // True if line was skipped due to duplicate
  reason?: string; // Reason for skip (e.g., "Duplicate booking line already exists")
  error?: string;
  errorDetails?: unknown;
}

/**
 * Odoo Sales Invoice creation result
 */
export interface OdooSalesInvoiceResult {
  success: boolean;
  invoiceId?: number;
  error?: string;
  errorDetails?: unknown;
}

/**
 * Odoo Partner (Customer/Supplier) information
 */
export interface OdooPartner {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  isCompany?: boolean;
}

/**
 * Odoo Product information
 */
export interface OdooProduct {
  id: number;
  name: string;
  type?: string;
}


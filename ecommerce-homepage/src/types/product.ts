export type ProductType = 'experience' | 'class' | 'trip';

// Map Figma category to ProductType
export function categoryToType(category: string): ProductType {
  const categoryMap: Record<string, ProductType> = {
    'Esperienza': 'experience',
    'Classe': 'class',
    'Viaggio': 'trip',
  };
  return categoryMap[category] ?? 'experience';
}

// Map ProductType to Figma category
export function typeToCategory(type: ProductType): string {
  const typeMap: Record<ProductType, string> = {
    experience: 'Esperienza',
    class: 'Classe',
    trip: 'Viaggio',
  };
  return typeMap[type];
}

export interface Product {
  id: string;
  type: ProductType;
  title: string;
  location?: string;
  price?: number; // Legacy: price_adult_base (for backward compatibility)
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  description?: string;
  maxAdults?: number;
  maxDogs?: number;
  durationHours?: number; // For experiences and classes
  durationDays?: number; // For trips
  meetingPoint?: string; // For experiences and classes
  priceDogBase?: number; // Legacy: price_dog_base (for backward compatibility)
  pricingType?: string;
  providerId?: string;
  // New pricing model fields
  pricingModel?: 'percentage' | 'markup';
  marginPercentage?: number;
  markupAdult?: number;
  markupDog?: number;
  providerCostAdultBase?: number;
  providerCostDogBase?: number;
  // Class/Experience specific
  noAdults?: boolean; // If true, only dogs are selectable, adults will be 0
  // Trip-specific fields
  startDate?: string;
  endDate?: string;
  bookingQty?: number;
  // Product features
  highlights?: string[];
  includedItems?: string[];
  excludedItems?: string[];
  cancellationPolicy?: string;
  meetingInfo?: { text: string; googleMapsLink: string };
  showMeetingInfo?: boolean;
  // Product attributes for search and filtering
  attributes?: string[]; // Array of attribute keys (e.g., ['mountain', 'lake'])
  // Product program
  program?: ProductProgram;
  // Product FAQs
  faqs?: ProductFAQ[];
  // Figma design field (computed from type)
  category?: 'Classe' | 'Esperienza' | 'Viaggio';
  // Timestamp for sorting
  createdAt?: string;
  // Secondary images for product gallery
  secondaryImages?: Array<{ id: string; url: string; display_order: number }>;
}

/**
 * Program-related types
 */
export interface ProgramItem {
  id: string;
  activity_text: string;
  order_index: number;
}

export interface ProgramDay {
  id: string;
  day_number: number;
  introduction?: string | null;
  items: ProgramItem[];
}

export interface ProductProgram {
  days: ProgramDay[];
}

/**
 * FAQ-related types
 */
export interface ProductFAQ {
  id: string;
  question: string;
  answer: string;
  order_index: number;
}

export interface ProductRow {
  id: string;
  provider_id: string | null;
  name: string;
  description: string | null;
  max_adults: number | null;
  max_dogs: number | null;
  duration_hours: number | null; // For experiences and classes
  duration_days: number | null; // For trips
  meeting_point: string | null; // For experiences and classes
  location: string | null; // For trips
  created_at: string | null;
  updated_at: string | null;
  pricing_type: string | null;
  price_adult_base: number | null;
  price_dog_base: number | null;
  // New pricing model fields
  pricing_model: 'percentage' | 'markup' | null;
  margin_percentage: number | null;
  markup_adult: number | null;
  markup_dog: number | null;
  provider_cost_adult_base: number | null;
  provider_cost_dog_base: number | null;
  predefined_prices: Record<string, unknown> | null;
  images: string[] | null; // Array of image URLs
  highlights: string[] | null; // Array of up to 10 highlight strings
  included_items: string[] | null; // Array of up to 10 included item strings
  excluded_items: string[] | null; // Array of up to 10 excluded item strings
  cancellation_policy: string | null; // Cancellation policy text
  meeting_info: { text: string; google_maps_link: string } | null; // Meeting point info
  show_meeting_info: boolean | null; // Whether to show meeting info on product page
  active: boolean | null; // Product active status
  no_adults: boolean | null; // For classes and experiences: if true, only dogs are selectable
  // Trip-specific fields
  start_date: string | null;
  end_date: string | null;
  booking_qty: number | null;
  // Product attributes
  attributes: string[] | null; // JSON array of attribute keys (e.g., ['mountain', 'lake'])
}

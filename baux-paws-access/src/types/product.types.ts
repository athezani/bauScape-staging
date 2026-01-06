/**
 * Product-related type definitions (classes, experiences, trips)
 */

export type ProductType = 'class' | 'experience' | 'trip';
export type PricingType = 'linear' | 'predefined';

export interface PredefinedPrice {
  adults: number;
  dogs: number;
  price: number;
}

export interface BaseProduct {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  max_adults: number;
  max_dogs: number;
  pricing_type: PricingType | null;
  price_adult_base: number | null;
  price_dog_base: number | null;
  predefined_prices: PredefinedPrice[] | null;
  images: string[] | null;
  highlights: string[] | null;
  included_items: string[] | null;
  excluded_items: string[] | null; // Array of excluded items
  cancellation_policy: string;
  attributes: string[] | null; // Array of attribute keys (e.g., ['mountain', 'lake'])
  meeting_info: { text: string; google_maps_link: string } | null; // Meeting point info
  show_meeting_info: boolean | null; // Whether to show meeting info on product page
  created_at: string | null;
  updated_at: string | null;
}

export interface ClassProduct extends BaseProduct {
  type: 'class';
  duration_hours: number | null; // Calculated automatically from slots
  full_day_start_time: string | null; // Used when no time slots are defined
  full_day_end_time: string | null; // Used when no time slots are defined
  meeting_point: string | null;
  no_adults: boolean;
}

export interface ExperienceProduct extends BaseProduct {
  type: 'experience';
  duration_hours: number | null; // Calculated automatically from slots
  full_day_start_time: string | null; // Used when no time slots are defined
  full_day_end_time: string | null; // Used when no time slots are defined
  meeting_point: string | null;
  no_adults: boolean;
}

export interface TripProduct extends BaseProduct {
  type: 'trip';
  duration_days: number;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  booking_qty: number | null;
}

export type Product = ClassProduct | ExperienceProduct | TripProduct;

export interface ProductFormData {
  type: ProductType;
  provider_id: string;
  name: string;
  description: string;
  max_adults: number;
  max_dogs: number;
  pricing_type: PricingType;
  price_adult_base: number | null;
  price_dog_base: number | null;
  predefined_prices: PredefinedPrice[];
  images: string[];
  highlights: string[];
  included_items: string[];
  excluded_items: string[]; // Array of excluded items
  cancellation_policy: string;
  attributes: string[]; // Array of attribute keys (e.g., ['mountain', 'lake'])
  meeting_info?: { text: string; google_maps_link: string }; // Meeting point info
  show_meeting_info?: boolean; // Whether to show meeting info on product page
  program?: ProductProgram; // Optional program data
  // Class/Experience specific
  duration_hours?: number | null; // Optional - calculated automatically from slots
  full_day_start_time?: string; // Used when no time slots are defined
  full_day_end_time?: string; // Used when no time slots are defined
  meeting_point?: string;
  no_adults?: boolean; // If true, only dogs are selectable, adults will be 0
  // Trip specific
  duration_days?: number;
  location?: string;
  start_date?: string;
  end_date?: string;
  // FAQ associations (array of FAQ IDs with order_index)
  faqs?: Array<{ faq_id: string; order_index: number }>;
}

export interface ProductWithProvider {
  product: Product;
  provider_name: string;
}

/**
 * Program-related types
 */
export interface ProgramItem {
  id?: string; // Optional for new items not yet saved
  activity_text: string;
  order_index: number;
}

export interface ProgramDay {
  id?: string; // Optional for new days not yet saved
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
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
}

export interface ProductFAQ {
  id: string;
  product_id: string;
  product_type: ProductType;
  faq_id: string;
  order_index: number;
  faq?: FAQ; // Joined FAQ data
}

export interface ProductFAQWithData extends ProductFAQ {
  faq: FAQ;
}

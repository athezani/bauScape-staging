/**
 * Product attributes constants
 * Standard list of attributes that can be assigned to products for search and filtering
 */

export type ProductAttributeKey = 'mountain' | 'lake' | 'sea' | 'park' | 'city';

export interface ProductAttribute {
  key: ProductAttributeKey;
  emoji: string;
  label: string;
}

/**
 * Standard list of product attributes with emoji and Italian labels
 */
export const PRODUCT_ATTRIBUTES: Record<ProductAttributeKey, ProductAttribute> = {
  mountain: {
    key: 'mountain',
    emoji: '⛰️',
    label: 'Montagna',
  },
  lake: {
    key: 'lake',
    emoji: '🏞️',
    label: 'Lago',
  },
  sea: {
    key: 'sea',
    emoji: '🌊',
    label: 'Mare',
  },
  park: {
    key: 'park',
    emoji: '🌷',
    label: 'Parco',
  },
  city: {
    key: 'city',
    emoji: '🌆',
    label: 'Città',
  },
};

/**
 * Get all available attribute keys
 */
export function getAvailableAttributeKeys(): ProductAttributeKey[] {
  return Object.keys(PRODUCT_ATTRIBUTES) as ProductAttributeKey[];
}

/**
 * Get attribute info by key
 */
export function getAttributeInfo(key: string): ProductAttribute | undefined {
  return PRODUCT_ATTRIBUTES[key as ProductAttributeKey];
}

/**
 * Validate attribute keys
 */
export function isValidAttributeKey(key: string): key is ProductAttributeKey {
  return key in PRODUCT_ATTRIBUTES;
}


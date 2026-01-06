/**
 * Validation Utilities
 * Comprehensive validation functions for robust data validation
 */

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// URL validation regex
const URL_REGEX = /^https?:\/\/.+/i;

/**
 * Validate UUID format
 */
export function isValidUUID(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return UUID_REGEX.test(value.trim());
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return URL_REGEX.test(url.trim());
  } catch {
    return false;
  }
}

/**
 * Sanitize string input (prevent XSS)
 */
export function sanitizeString(input: string | null | undefined, maxLength?: number): string {
  if (!input || typeof input !== 'string') return '';
  let sanitized = input.trim();
  
  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Limit length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validate and sanitize array of strings
 */
export function validateStringArray(
  input: unknown,
  options: {
    maxLength?: number;
    maxItems?: number;
    minItemLength?: number;
    allowEmpty?: boolean;
  } = {}
): string[] | null {
  const { maxLength = 500, maxItems = 10, minItemLength = 1, allowEmpty = true } = options;
  
  if (!input) return allowEmpty ? null : [];
  if (!Array.isArray(input)) return null;
  
  const sanitized = input
    .filter((item): item is string => typeof item === 'string')
    .map(item => sanitizeString(item, maxLength))
    .filter(item => item.length >= minItemLength)
    .slice(0, maxItems);
  
  return sanitized.length > 0 ? sanitized : (allowEmpty ? null : []);
}

/**
 * Validate number with range
 */
export function validateNumber(
  value: unknown,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
    required?: boolean;
  } = {}
): number | null {
  const { min, max, integer = false, required = false } = options;
  
  if (value === null || value === undefined) {
    return required ? null : 0;
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  
  if (isNaN(num)) return null;
  if (integer && !Number.isInteger(num)) return null;
  if (min !== undefined && num < min) return null;
  if (max !== undefined && num > max) return null;
  
  return num;
}

/**
 * Validate date string
 */
export function isValidDate(dateString: string | null | undefined): boolean {
  if (!dateString || typeof dateString !== 'string') return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validate date range
 */
export function isValidDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): boolean {
  if (!startDate || !endDate) return false;
  if (!isValidDate(startDate) || !isValidDate(endDate)) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return end >= start;
}

/**
 * Validate ProductType
 */
export function isValidProductType(type: unknown): type is 'class' | 'experience' | 'trip' {
  return type === 'class' || type === 'experience' || type === 'trip';
}

/**
 * Validate PricingType
 */
export function isValidPricingType(type: unknown): type is 'linear' | 'predefined' {
  return type === 'linear' || type === 'predefined';
}

/**
 * Validate product form data
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateProductFormData(data: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Dati prodotto non validi'] };
  }
  
  const formData = data as Record<string, unknown>;
  
  // Validate type
  if (!isValidProductType(formData.type)) {
    errors.push('Tipo prodotto non valido');
  }
  
  // Validate provider_id
  if (!formData.provider_id || !isValidUUID(String(formData.provider_id))) {
    errors.push('Provider ID non valido');
  }
  
  // Validate name
  const name = sanitizeString(formData.name as string, 200);
  if (!name || name.length < 3) {
    errors.push('Il nome del prodotto deve contenere almeno 3 caratteri');
  }
  
  // Validate max_adults
  const maxAdults = validateNumber(formData.max_adults, { min: 1, max: 1000, integer: true, required: true });
  if (maxAdults === null) {
    errors.push('Numero massimo di adulti non valido (1-1000)');
  }
  
  // Validate max_dogs
  const maxDogs = validateNumber(formData.max_dogs, { min: 0, max: 1000, integer: true, required: true });
  if (maxDogs === null) {
    errors.push('Numero massimo di cani non valido (0-1000)');
  }
  
  // Validate pricing_type
  if (!isValidPricingType(formData.pricing_type)) {
    errors.push('Tipo di prezzo non valido');
  }
  
  // Validate pricing based on type
  if (formData.pricing_type === 'linear') {
    const priceAdult = validateNumber(formData.price_adult_base, { min: 0, max: 100000 });
    if (priceAdult === null) {
      errors.push('Prezzo base adulto non valido');
    }
    
    const priceDog = validateNumber(formData.price_dog_base, { min: 0, max: 100000 });
    if (priceDog === null && formData.price_dog_base !== null && formData.price_dog_base !== undefined) {
      errors.push('Prezzo base cane non valido');
    }
  } else if (formData.pricing_type === 'predefined') {
    if (!Array.isArray(formData.predefined_prices) || formData.predefined_prices.length === 0) {
      errors.push('Almeno un prezzo predefinito è richiesto');
    } else {
      formData.predefined_prices.forEach((price: unknown, index: number) => {
        if (!price || typeof price !== 'object') {
          errors.push(`Prezzo predefinito ${index + 1} non valido`);
          return;
        }
        const p = price as Record<string, unknown>;
        if (validateNumber(p.adults, { min: 1, integer: true }) === null) {
          errors.push(`Numero adulti non valido per prezzo ${index + 1}`);
        }
        if (validateNumber(p.dogs, { min: 0, integer: true }) === null) {
          errors.push(`Numero cani non valido per prezzo ${index + 1}`);
        }
        if (validateNumber(p.price, { min: 0 }) === null) {
          errors.push(`Prezzo non valido per configurazione ${index + 1}`);
        }
      });
    }
  }
  
  // Validate images array
  if (formData.images && Array.isArray(formData.images)) {
    formData.images.forEach((url: unknown, index: number) => {
      if (typeof url !== 'string' || !isValidUrl(url)) {
        errors.push(`URL immagine ${index + 1} non valido`);
      }
    });
  }
  
  // Validate highlights
  if (formData.highlights !== undefined) {
    const highlights = validateStringArray(formData.highlights, { maxLength: 200, maxItems: 10 });
    if (highlights === null && formData.highlights !== null && Array.isArray(formData.highlights) && formData.highlights.length > 0) {
      errors.push('Uno o più highlights contengono caratteri non validi o sono troppo lunghi');
    }
  }
  
  // Validate included_items
  if (formData.included_items !== undefined) {
    const includedItems = validateStringArray(formData.included_items, { maxLength: 200, maxItems: 10 });
    if (includedItems === null && formData.included_items !== null && Array.isArray(formData.included_items) && formData.included_items.length > 0) {
      errors.push('Uno o più elementi inclusi contengono caratteri non validi o sono troppo lunghi');
    }
  }
  
  // Validate cancellation_policy
  const policy = sanitizeString(formData.cancellation_policy as string, 1000);
  if (!policy || policy.length < 10) {
    errors.push('La policy di cancellazione deve contenere almeno 10 caratteri');
  }
  
  // Type-specific validation
  if (formData.type === 'class' || formData.type === 'experience') {
    const durationHours = validateNumber(formData.duration_hours, { min: 1, max: 168, integer: true });
    if (durationHours === null) {
      errors.push('Durata in ore non valida (1-168)');
    }
  } else if (formData.type === 'trip') {
    const durationDays = validateNumber(formData.duration_days, { min: 1, max: 365, integer: true });
    if (durationDays === null) {
      errors.push('Durata in giorni non valida (1-365)');
    }
    
    if (formData.start_date) {
      if (!isValidDate(String(formData.start_date))) {
        errors.push('Data di inizio non valida');
      }
      
      if (formData.end_date && !isValidDateRange(String(formData.start_date), String(formData.end_date))) {
        errors.push('La data di fine deve essere successiva o uguale alla data di inizio');
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate availability slot data
 */
export function validateAvailabilitySlot(data: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Dati slot non validi'] };
  }
  
  const slot = data as Record<string, unknown>;
  
  // Validate product_id
  if (!slot.product_id || !isValidUUID(String(slot.product_id))) {
    errors.push('Product ID non valido');
  }
  
  // Validate product_type
  if (!isValidProductType(slot.product_type)) {
    errors.push('Tipo prodotto non valido');
  }
  
  // Validate date
  if (!slot.date || !isValidDate(String(slot.date))) {
    errors.push('Data non valida');
  } else {
    const date = new Date(String(slot.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      errors.push('La data non può essere nel passato');
    }
  }
  
  // Validate max_adults and max_dogs
  const maxAdults = validateNumber(slot.max_adults, { min: 1, max: 1000, integer: true });
  if (maxAdults === null) {
    errors.push('Numero massimo di adulti non valido');
  }
  
  const maxDogs = validateNumber(slot.max_dogs, { min: 0, max: 1000, integer: true });
  if (maxDogs === null) {
    errors.push('Numero massimo di cani non valido');
  }
  
  // Validate time_slot format if provided (HH:MM)
  if (slot.time_slot !== null && slot.time_slot !== undefined) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (typeof slot.time_slot !== 'string' || !timeRegex.test(slot.time_slot)) {
      errors.push('Formato orario non valido (deve essere HH:MM)');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Safe parse JSON with validation
 */
export function safeParseJSON<T>(json: string, fallback: T): T {
  try {
    const parsed = JSON.parse(json);
    return parsed as T;
  } catch {
    return fallback;
  }
}

/**
 * Validate and sanitize phone number
 */
export function validatePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const cleaned = phone.replace(/\D/g, ''); // Remove non-digits
  if (cleaned.length < 10 || cleaned.length > 15) return null;
  return cleaned;
}

/**
 * Check if value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}




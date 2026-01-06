/**
 * Input Sanitization Utilities
 * 
 * Provides XSS protection and input validation for user data
 */

/**
 * Sanitize string by removing HTML tags and dangerous characters
 * Prevents XSS attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[<>'"]/g, (char) => {
      const map: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      };
      return map[char] || char;
    })
    .trim();
}

/**
 * Validate email format (RFC 5322 simplified)
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  if (typeof phone !== 'string') return false;
  
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  return phoneRegex.test(cleanedPhone) && cleanedPhone.length >= 7 && cleanedPhone.length <= 15;
}

/**
 * Validate name (no numbers, no special chars except space, dash, apostrophe)
 */
export function isValidName(name: string): boolean {
  if (typeof name !== 'string') return false;
  
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'\-]{1,100}$/;
  
  return nameRegex.test(name.trim());
}

/**
 * Validate postal code (alphanumeric with optional spaces/dashes)
 */
export function isValidPostalCode(postalCode: string): boolean {
  if (typeof postalCode !== 'string') return false;
  
  const postalCodeRegex = /^[A-Z0-9\s\-]{3,10}$/i;
  
  return postalCodeRegex.test(postalCode.trim());
}

/**
 * Validate address (alphanumeric with spaces, commas, periods, dashes)
 */
export function isValidAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  
  const addressRegex = /^[a-zA-Z0-9À-ÿ\s,.'\-]{1,200}$/;
  
  return addressRegex.test(address.trim());
}

/**
 * Validate city name
 */
export function isValidCity(city: string): boolean {
  if (typeof city !== 'string') return false;
  
  const cityRegex = /^[a-zA-ZÀ-ÿ\s'\-]{1,100}$/;
  
  return cityRegex.test(city.trim());
}

/**
 * Sanitize and validate customer data
 * Returns sanitized object or error
 */
export function sanitizeAndValidateCustomer(customer: any): { 
  valid: boolean; 
  error?: string; 
  data?: Record<string, string> 
} {
  if (!customer || typeof customer !== 'object') {
    return { valid: false, error: 'Customer data must be an object' };
  }

  const { name, surname, email, phone, addressLine1, addressLine2, addressCity, addressPostalCode, addressCountry } = customer;

  // Validate and sanitize name
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { valid: false, error: 'Customer name is required' };
  }
  const sanitizedName = sanitizeString(name);
  if (!isValidName(sanitizedName)) {
    return { valid: false, error: 'Customer name contains invalid characters' };
  }

  // Validate and sanitize surname
  if (!surname || typeof surname !== 'string' || surname.trim() === '') {
    return { valid: false, error: 'Customer surname is required' };
  }
  const sanitizedSurname = sanitizeString(surname);
  if (!isValidName(sanitizedSurname)) {
    return { valid: false, error: 'Customer surname contains invalid characters' };
  }

  // Validate email (no sanitization, must be exact format)
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return { valid: false, error: 'Customer email is required' };
  }
  if (!isValidEmail(email.trim())) {
    return { valid: false, error: 'Customer email format is invalid' };
  }

  // Validate phone
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return { valid: false, error: 'Customer phone is required' };
  }
  if (!isValidPhone(phone)) {
    return { valid: false, error: 'Customer phone format is invalid' };
  }

  // Validate and sanitize address line 1
  if (!addressLine1 || typeof addressLine1 !== 'string' || addressLine1.trim() === '') {
    return { valid: false, error: 'Customer address line 1 is required' };
  }
  const sanitizedAddressLine1 = sanitizeString(addressLine1);
  if (!isValidAddress(sanitizedAddressLine1)) {
    return { valid: false, error: 'Customer address line 1 contains invalid characters' };
  }

  // Validate and sanitize address line 2 (optional)
  let sanitizedAddressLine2 = '';
  if (addressLine2 && typeof addressLine2 === 'string' && addressLine2.trim() !== '') {
    sanitizedAddressLine2 = sanitizeString(addressLine2);
    if (!isValidAddress(sanitizedAddressLine2)) {
      return { valid: false, error: 'Customer address line 2 contains invalid characters' };
    }
  }

  // Validate and sanitize city
  if (!addressCity || typeof addressCity !== 'string' || addressCity.trim() === '') {
    return { valid: false, error: 'Customer city is required' };
  }
  const sanitizedCity = sanitizeString(addressCity);
  if (!isValidCity(sanitizedCity)) {
    return { valid: false, error: 'Customer city contains invalid characters' };
  }

  // Validate and sanitize postal code
  if (!addressPostalCode || typeof addressPostalCode !== 'string' || addressPostalCode.trim() === '') {
    return { valid: false, error: 'Customer postal code is required' };
  }
  const sanitizedPostalCode = sanitizeString(addressPostalCode);
  if (!isValidPostalCode(sanitizedPostalCode)) {
    return { valid: false, error: 'Customer postal code format is invalid' };
  }

  // Validate country (optional but recommended)
  let sanitizedCountry = '';
  if (addressCountry && typeof addressCountry === 'string' && addressCountry.trim() !== '') {
    sanitizedCountry = sanitizeString(addressCountry);
    if (!isValidName(sanitizedCountry)) {
      return { valid: false, error: 'Customer country contains invalid characters' };
    }
  }

  // Return sanitized data
  return {
    valid: true,
    data: {
      name: sanitizedName,
      surname: sanitizedSurname,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      addressLine1: sanitizedAddressLine1,
      addressLine2: sanitizedAddressLine2,
      addressCity: sanitizedCity,
      addressPostalCode: sanitizedPostalCode.toUpperCase(),
      addressCountry: sanitizedCountry,
    },
  };
}

/**
 * Detect potential XSS patterns in string
 */
export function containsXSS(input: string): boolean {
  if (typeof input !== 'string') return false;
  
  const xssPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<img[^>]+onerror/i,
    /<svg[^>]+onload/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
  ];
  
  return xssPatterns.some((pattern) => pattern.test(input));
}


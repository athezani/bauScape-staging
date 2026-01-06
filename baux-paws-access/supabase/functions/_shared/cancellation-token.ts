/**
 * Cancellation Token Utilities
 * 
 * Generates and validates secure tokens for cancellation magic links.
 * Token format: base64url(bookingId:orderNumber:email:timestamp:signature)
 * Signature: HMAC-SHA256 of (bookingId:orderNumber:email:timestamp)
 * 
 * Token does NOT expire on first use, but expires 24h after booking end date.
 */

interface TokenPayload {
  bookingId: string;
  orderNumber: string;
  email: string;
  timestamp: number;
}

interface TokenValidation {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

/**
 * Generate a secure cancellation token
 */
export async function generateCancellationToken(
  bookingId: string,
  orderNumber: string,
  email: string,
  secret: string
): Promise<string> {
  const timestamp = Date.now();
  const payload = `${bookingId}:${orderNumber}:${email}:${timestamp}`;
  
  // Generate HMAC-SHA256 signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Combine payload and signature
  const token = `${bookingId}:${orderNumber}:${email}:${timestamp}:${signature}`;
  
  // Base64url encode the entire token
  return btoa(token)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Validate a cancellation token
 */
export async function validateCancellationToken(
  token: string,
  secret: string
): Promise<TokenValidation> {
  try {
    // Decode base64url
    const decoded = atob(
      token
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(token.length + (4 - (token.length % 4)) % 4, '=')
    );
    
    const parts = decoded.split(':');
    if (parts.length !== 5) {
      return { valid: false, error: 'Invalid token format' };
    }
    
    const [bookingId, orderNumber, email, timestampStr, providedSignature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    
    if (isNaN(timestamp)) {
      return { valid: false, error: 'Invalid timestamp' };
    }
    
    // Regenerate signature to verify
    const payload = `${bookingId}:${orderNumber}:${email}:${timestamp}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    if (providedSignature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    // Token is cryptographically valid
    return {
      valid: true,
      payload: {
        bookingId,
        orderNumber,
        email,
        timestamp,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token validation failed',
    };
  }
}

/**
 * Check if token is expired based on booking date
 * Token is valid until 24h after end_date (or booking_date if no end_date)
 */
export function isTokenExpired(bookingDate: string, endDate: string | null): boolean {
  const now = new Date();
  
  // Use end_date if available, otherwise booking_date
  const expiryDate = endDate ? new Date(endDate) : new Date(bookingDate);
  
  // Add 24 hours + end of day (23:59:59)
  expiryDate.setDate(expiryDate.getDate() + 1);
  expiryDate.setHours(23, 59, 59, 999);
  
  return now > expiryDate;
}

/**
 * Generate a human-readable token ID for logging (first 8 chars)
 */
export function getTokenId(token: string): string {
  return token.substring(0, 8);
}


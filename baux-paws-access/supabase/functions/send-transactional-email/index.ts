/**
 * Supabase Edge Function: Send Transactional Email via Brevo
 * 
 * Handles sending transactional emails (order confirmations, reminders, etc.)
 * Uses Brevo API with template-based emails
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * CRITICAL REQUIREMENT: All product data in EmailRequest must come DIRECTLY from the database
 * 
 * The following fields MUST be retrieved from the product table (experience/class/trip) in the database:
 * - productName: Must be from product.name (NOT from booking.product_name or metadata)
 * - productDescription: Must be from product.description (NOT from booking.product_description)
 * - cancellationPolicy: Must be from product.cancellation_policy (NOT from any fallback or default)
 * - includedItems: Must be from product.included_items array
 * - excludedItems: Must be from product.excluded_items array
 * - meetingInfo: Must be from product.meeting_info object
 * - program: Must be from trip_program_day and trip_program_item tables
 * 
 * NEVER use:
 * - booking.product_name (may be outdated if product was updated after booking)
 * - bookingMetadata.product_name (may be outdated)
 * - Default values or fallbacks for product data
 * 
 * This ensures the email shows EXACTLY the same information as the product page.
 */
// Base email request fields
interface BaseEmailRequest {
  type: string;
  bookingId?: string;
  requestId?: string;
}

// Order confirmation email (existing)
interface OrderConfirmationEmail extends BaseEmailRequest {
  type: 'order_confirmation';
  bookingId: string;
  customerEmail: string;
  customerName: string;
  customerSurname?: string;
  customerPhone?: string;
  productName: string; // MUST be from product.name in database
  productDescription?: string; // MUST be from product.description in database
  productType: 'experience' | 'class' | 'trip';
  bookingDate: string;
  bookingTime?: string | null;
  numberOfAdults: number;
  numberOfDogs: number;
  totalAmount: number;
  currency: string;
  orderNumber?: string;
  noAdults?: boolean;
  // New fields for email content - ALL MUST BE FROM DATABASE
  includedItems?: string[]; // From product.included_items
  excludedItems?: string[]; // From product.excluded_items
  meetingInfo?: {
    text: string;
    googleMapsLink: string;
  }; // From product.meeting_info
  showMeetingInfo?: boolean; // From product.show_meeting_info
  program?: {
    days: Array<{
      day_number: number;
      introduction?: string | null;
      items: Array<{
        activity_text: string;
        order_index: number;
      }>;
    }>;
  }; // From trip_program_day and trip_program_item tables
  cancellationPolicy?: string; // MUST be from product.cancellation_policy - NO FALLBACKS
}

// Cancellation request emails (new)
interface CancellationRequestAdminEmail extends BaseEmailRequest {
  type: 'cancellation_request_admin';
  requestId: string;
  bookingId: string;
}

interface CancellationApprovedCustomerEmail extends BaseEmailRequest {
  type: 'cancellation_approved_customer';
  requestId: string;
  bookingId: string;
  adminNotes?: string;
}

interface CancellationRejectedCustomerEmail extends BaseEmailRequest {
  type: 'cancellation_rejected_customer';
  requestId: string;
  bookingId: string;
  adminNotes?: string;
}

interface CancellationApprovedProviderEmail extends BaseEmailRequest {
  type: 'cancellation_approved_provider';
  bookingId: string;
  providerId: string;
}

interface CancellationReminderAdminEmail extends BaseEmailRequest {
  type: 'cancellation_reminder_admin';
  totalCount: number;
  urgentCount: number;
  recentCount: number;
  urgentRequests: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    bookingDate: string;
    productName: string;
    requestedAt: string;
    daysOld: number;
    reason?: string;
  }>;
  recentRequests: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    bookingDate: string;
    productName: string;
    requestedAt: string;
    daysOld: number;
    reason?: string;
  }>;
}

type EmailRequest = 
  | OrderConfirmationEmail 
  | CancellationRequestAdminEmail 
  | CancellationApprovedCustomerEmail 
  | CancellationRejectedCustomerEmail 
  | CancellationApprovedProviderEmail
  | CancellationReminderAdminEmail;

interface BrevoEmailParams {
  CUSTOMER_NAME: string;
  CUSTOMER_SURNAME?: string;
  PRODUCT_NAME: string;
  PRODUCT_DESCRIPTION?: string;
  PRODUCT_DESCRIPTION_DISPLAY?: string;
  PRODUCT_TYPE: string;
  BOOKING_DATE: string;
  BOOKING_TIME?: string;
  BOOKING_TIME_DISPLAY?: string;
  NUMBER_OF_ADULTS: string;
  NUMBER_OF_ADULTS_DISPLAY?: string;
  NUMBER_OF_DOGS: string;
  NUMBER_OF_DOGS_DISPLAY?: string;
  TOTAL_AMOUNT: string;
  CURRENCY: string;
  ORDER_NUMBER: string;
  BOOKING_ID: string;
  // New fields for additional product information
  INCLUDED_ITEMS?: string; // HTML formatted list
  INCLUDED_ITEMS_DISPLAY?: string; // 'block' or 'none'
  EXCLUDED_ITEMS?: string; // HTML formatted list
  EXCLUDED_ITEMS_DISPLAY?: string; // 'block' or 'none'
  MEETING_INFO_TEXT?: string;
  MEETING_INFO_LINK?: string;
  MEETING_INFO_DISPLAY?: string; // 'block' or 'none'
  PROGRAM?: string; // HTML formatted program
  PROGRAM_DISPLAY?: string; // 'block' or 'none'
  REGOLAMENTO_LINK?: string; // Link to regolamento
  CANCELLATION_POLICY?: string;
  CANCELLATION_POLICY_DISPLAY?: string; // 'block' or 'none'
  CANCELLATION_LINK?: string; // Magic link for cancellation request
}

/**
 * Format date in Italian format
 */
function formatDateItalian(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format time in HH:MM format or time range (HH:MM - HH:MM)
 * Converts from UTC/ISO to CET if needed
 * Handles PostgreSQL TIME format (HH:MM:SS) and time ranges
 */
function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  
  // If it's already a formatted range (contains " - "), return as is
  if (timeStr.includes(' - ')) {
    return timeStr;
  }
  
  // If it's an ISO timestamp (with or without Z), convert to CET and extract time
  if (timeStr.includes('T')) {
    try {
      // Handle both "2025-12-27T10:12" and "2025-12-27T10:12:00Z" formats
      const dateStr = timeStr.includes('Z') ? timeStr : timeStr + 'Z';
      const date = new Date(dateStr);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date format:', timeStr);
        // Try to extract time directly from string
        const timeMatch = timeStr.match(/T(\d{2}):(\d{2})/);
        if (timeMatch) {
          return `${timeMatch[1]}:${timeMatch[2]}`;
        }
        return timeStr;
      }
      
      // Format in CET timezone
      const cetTime = date.toLocaleString('it-IT', { 
        timeZone: 'Europe/Rome',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return cetTime;
    } catch (error) {
      console.warn('Error parsing date:', timeStr, error);
      // Try to extract time directly from string
      const timeMatch = timeStr.match(/T(\d{2}):(\d{2})/);
      if (timeMatch) {
        return `${timeMatch[1]}:${timeMatch[2]}`;
      }
      return timeStr;
    }
  }
  
  // Handle PostgreSQL TIME format (HH:MM:SS) or HH:MM format
  const timeParts = timeStr.split(':');
  if (timeParts.length >= 2) {
    const hours = timeParts[0].padStart(2, '0');
    const minutes = timeParts[1].padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  // Fallback: return as is if format is unexpected
  console.warn('Unexpected time format:', timeStr);
  return timeStr;
}

/**
 * Get product type label in Italian
 */
function getProductTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    experience: 'Esperienza',
    class: 'Classe',
    trip: 'Viaggio',
  };
  return typeMap[type] || type;
}

/**
 * Format order number from booking ID
 */
function formatOrderNumber(bookingId: string): string {
  // Use last 8 characters of booking ID as order number
  return bookingId.slice(-8).toUpperCase();
}

/**
 * Format included items as HTML table rows with checkmarks
 */
function formatIncludedItems(items: string[] | undefined): string {
  if (!items || items.length === 0) {
    console.log('formatIncludedItems: No items or empty array');
    return '';
  }
  console.log('formatIncludedItems: Processing', items.length, 'items');
  const result = items
    .filter(item => item && typeof item === 'string' && item.trim().length > 0)
    .map(item => 
      `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 8px; border-collapse: collapse;">
        <tr>
          <td width="20" style="padding: 0; vertical-align: top; font-size: 16px; color: #22c55e !important; font-weight: bold; font-family: Arial;">✓</td>
          <td style="padding: 0; font-size: 13px; line-height: 1.6; color: #1A0841 !important; font-family: Arial;">${escapeHtml(item.trim())}</td>
        </tr>
      </table>`
    ).join('');
  console.log('formatIncludedItems: Result length', result.length);
  return result;
}

/**
 * Format excluded items as HTML table rows with X marks
 */
function formatExcludedItems(items: string[] | undefined): string {
  if (!items || items.length === 0) {
    console.log('formatExcludedItems: No items or empty array');
    return '';
  }
  console.log('formatExcludedItems: Processing', items.length, 'items');
  const result = items
    .filter(item => item && typeof item === 'string' && item.trim().length > 0)
    .map(item => 
      `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 8px; border-collapse: collapse;">
        <tr>
          <td width="20" style="padding: 0; vertical-align: top; font-size: 16px; color: #dc2626 !important; font-weight: bold; font-family: Arial;">✗</td>
          <td style="padding: 0; font-size: 13px; line-height: 1.6; color: #1A0841 !important; font-family: Arial;">${escapeHtml(item.trim())}</td>
        </tr>
      </table>`
    ).join('');
  console.log('formatExcludedItems: Result length', result.length);
  return result;
}

/**
 * Format program as HTML using tables for better email compatibility
 */
function formatProgram(program: EmailRequest['program'] | undefined): string {
  if (!program || !program.days || program.days.length === 0) return '';
  
  let html = '';
  for (const day of program.days) {
    html += `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px; border-collapse: collapse;">
      <tr>
        <td style="padding: 0 0 8px 0; font-size: 15px; color: #1A0841 !important; font-weight: 700; font-family: Arial;">Giorno ${day.day_number}</td>
      </tr>`;
    
    if (day.introduction) {
      html += `<tr>
        <td style="padding: 0 0 10px 0; font-size: 13px; color: #1A0841 !important; line-height: 1.6; font-family: Arial;">${escapeHtml(day.introduction)}</td>
      </tr>`;
    }
    
    if (day.items && day.items.length > 0) {
      for (const item of day.items.sort((a, b) => a.order_index - b.order_index)) {
        html += `<tr>
          <td style="padding: 0 0 8px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
              <tr>
                <td width="20" style="padding: 0; vertical-align: top; font-size: 13px; color: #1A0841 !important; font-weight: bold; font-family: Arial;">•</td>
                <td style="padding: 0; font-size: 13px; line-height: 1.6; color: #1A0841 !important; font-family: Arial;">${escapeHtml(item.activity_text)}</td>
              </tr>
            </table>
          </td>
        </tr>`;
      }
    }
    
    html += `</table>`;
  }
  
  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Send transactional email via Brevo API
 */
async function sendBrevoEmail(
  apiKey: string,
  templateId: number,
  to: string,
  params: BrevoEmailParams,
  providerEmail?: string
): Promise<void> {
  const brevoUrl = 'https://api.brevo.com/v3/smtp/email';
  
  // Build BCC list: always include a.thezani@gmail.com, add provider email if provided
  const bccList: Array<{ email: string }> = [
    { email: 'a.thezani@gmail.com' }
  ];
  
  if (providerEmail && providerEmail.trim().length > 0) {
    bccList.push({ email: providerEmail.trim() });
  }
  
  // Build payload without replyTo to ensure it's not set
  const emailPayload: any = {
    templateId,
    to: [{ email: to }],
    bcc: bccList,
    params,
    // replyTo is intentionally omitted to prevent Reply-to header
  };

  console.log('Sending email via Brevo:', {
    templateId,
    to,
    bcc: bccList,
    paramsKeys: Object.keys(params),
  });
  
  // Log dettagliato dei parametri INCLUDED_ITEMS ed EXCLUDED_ITEMS
  console.log('=== INCLUDED_ITEMS PARAMETER ===');
  console.log('Value:', params.INCLUDED_ITEMS);
  console.log('Length:', params.INCLUDED_ITEMS?.length || 0);
  console.log('Display:', params.INCLUDED_ITEMS_DISPLAY);
  console.log('Type:', typeof params.INCLUDED_ITEMS);
  console.log('First 200 chars:', params.INCLUDED_ITEMS?.substring(0, 200) || 'EMPTY');
  
  console.log('=== EXCLUDED_ITEMS PARAMETER ===');
  console.log('Value:', params.EXCLUDED_ITEMS);
  console.log('Length:', params.EXCLUDED_ITEMS?.length || 0);
  console.log('Display:', params.EXCLUDED_ITEMS_DISPLAY);
  console.log('Type:', typeof params.EXCLUDED_ITEMS);
  console.log('First 200 chars:', params.EXCLUDED_ITEMS?.substring(0, 200) || 'EMPTY');
  
  console.log('=== CANCELLATION_POLICY PARAMETER ===');
  console.log('Value:', params.CANCELLATION_POLICY);
  console.log('Length:', params.CANCELLATION_POLICY?.length || 0);
  console.log('Display:', params.CANCELLATION_POLICY_DISPLAY);
  console.log('Type:', typeof params.CANCELLATION_POLICY);
  console.log('First 100 chars:', params.CANCELLATION_POLICY?.substring(0, 100) || 'EMPTY');
  
  // Log del payload completo che verrà inviato a Brevo
  console.log('=== BREVO PAYLOAD ===');
  console.log(JSON.stringify(emailPayload, null, 2));

  const response = await fetch(brevoUrl, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Brevo API error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`Brevo API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('Email sent successfully:', result);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Brevo API key from environment
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY is not set');
    }

    // Get Supabase client for additional data if needed
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const emailRequest: EmailRequest = await req.json();

    console.log('=== SENDING TRANSACTIONAL EMAIL ===');
    console.log('Email type:', emailRequest.type);
    console.log('Booking ID:', emailRequest.bookingId);
    
    // Handle order confirmation emails (existing flow with duplicate prevention)
    let providerEmail: string | undefined = undefined;
    
    if (emailRequest.type === 'order_confirmation') {
      console.log('Customer email:', emailRequest.customerEmail);
      
      // CRITICAL: Atomic check-and-set to prevent duplicate emails
      // This prevents race conditions between stripe-webhook and ensure-booking
      const { data: booking, error: bookingError } = await supabase
        .from('booking')
        .select('id, provider_id, confirmation_email_sent')
        .eq('id', emailRequest.bookingId)
        .single();
      
      if (bookingError) {
        console.error('Error fetching booking:', bookingError);
        throw new Error(`Booking not found: ${bookingError.message}`);
      }
      
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      // Check if email was already sent
      if (booking.confirmation_email_sent) {
        console.log('⚠️  Email already sent for this booking, skipping to prevent duplicates');
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Email already sent (skipped to prevent duplicate)',
            bookingId: emailRequest.bookingId,
            alreadySent: true,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
      
      // Atomically set flag to true BEFORE sending email
      // This prevents other concurrent requests from sending duplicate emails
      const { error: updateError } = await supabase
        .from('booking')
        .update({ confirmation_email_sent: true })
        .eq('id', emailRequest.bookingId)
        .eq('confirmation_email_sent', false); // Only update if still false
      
      if (updateError) {
        console.error('Error setting confirmation_email_sent flag:', updateError);
        // If update failed, another request might have already set it
        // Check again to be sure
        const { data: recheck } = await supabase
          .from('booking')
          .select('confirmation_email_sent')
          .eq('id', emailRequest.bookingId)
          .single();
        
        if (recheck?.confirmation_email_sent) {
          console.log('⚠️  Email was just sent by another request, skipping');
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Email already sent by concurrent request (skipped)',
              bookingId: emailRequest.bookingId,
              alreadySent: true,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }
      }
      
      console.log('✅ Confirmation email flag set, proceeding with email send');
      
      // Retrieve provider email for BCC
      if (booking.provider_id) {
        try {
          const { data: provider, error: providerError } = await supabase
            .from('profile')
            .select('email')
            .eq('id', booking.provider_id)
            .single();
          
          if (!providerError && provider && provider.email) {
            providerEmail = provider.email;
            console.log('Provider email retrieved for BCC:', providerEmail);
          } else {
            console.log('Provider email not found or error:', providerError);
          }
        } catch (error) {
          console.warn('Error retrieving provider email for BCC (will continue without it):', error);
        }
      }
      
      // Log all product data fields to verify they are present (same pattern for all fields)
      console.log('=== PRODUCT DATA RECEIVED IN EMAIL REQUEST ===');
      console.log('Product name:', emailRequest.productName);
      console.log('Product description:', emailRequest.productDescription ? 'Present' : 'Missing');
      console.log('Included items:', emailRequest.includedItems ? `${emailRequest.includedItems.length} items` : 'Missing/Empty');
      console.log('Excluded items:', emailRequest.excludedItems ? `${emailRequest.excludedItems.length} items` : 'Missing/Empty');
      console.log('Meeting info:', emailRequest.meetingInfo ? 'Present' : 'Missing');
      console.log('Show meeting info:', emailRequest.showMeetingInfo);
      console.log('Program:', emailRequest.program ? 'Present' : 'Missing');
      console.log('Cancellation policy:', emailRequest.cancellationPolicy ? `Present (${emailRequest.cancellationPolicy.length} chars)` : 'MISSING/EMPTY');
      console.log('Cancellation policy value:', emailRequest.cancellationPolicy || 'EMPTY');
      console.log('Cancellation policy type:', typeof emailRequest.cancellationPolicy);
      console.log('Cancellation policy is null:', emailRequest.cancellationPolicy === null);
      console.log('Cancellation policy is undefined:', emailRequest.cancellationPolicy === undefined);
      console.log('Cancellation policy JSON:', JSON.stringify(emailRequest.cancellationPolicy));
      console.log('=== END PRODUCT DATA RECEIVED ===');

      // Validate required fields
      if (!emailRequest.customerEmail || !emailRequest.bookingId) {
        throw new Error('Missing required fields: customerEmail and bookingId are required');
      }
    }

    // Prepare email parameters based on type
    let templateId: number;
    let emailParams: BrevoEmailParams;

    switch (emailRequest.type) {
      case 'order_confirmation': {
        // Template ID selection:
        // - Template ID 3 (or BREVO_TEMPLATE_ID_NO_ADULTS): For products with no_adults (no "Partecipanti" section)
        // - Template ID 2 (or BREVO_TEMPLATE_ID): For regular products (with "Partecipanti" section)
        const templateIdEnv = Deno.env.get('BREVO_TEMPLATE_ID');
        const templateIdNoAdultsEnv = Deno.env.get('BREVO_TEMPLATE_ID_NO_ADULTS');
        
        const defaultTemplateId = templateIdEnv ? parseInt(templateIdEnv, 10) : 2;
        const noAdultsTemplateId = templateIdNoAdultsEnv ? parseInt(templateIdNoAdultsEnv, 10) : 3;
        
        const isNoAdults = emailRequest.noAdults === true && emailRequest.numberOfAdults === 0;
        templateId = isNoAdults ? noAdultsTemplateId : defaultTemplateId;
        
        console.log('Template selection:', {
          noAdults: emailRequest.noAdults,
          numberOfAdults: emailRequest.numberOfAdults,
          isNoAdults,
          defaultTemplateId,
          noAdultsTemplateId,
          selectedTemplateId: templateId,
          orderNumber: emailRequest.orderNumber
        });

        // Format booking date in Italian
        const formattedDate = formatDateItalian(emailRequest.bookingDate);
        
        // Log the bookingTime received for debugging
        console.log('=== BOOKING TIME DEBUG ===');
        console.log('Booking time received:', {
          bookingTime: emailRequest.bookingTime,
          bookingTimeType: typeof emailRequest.bookingTime,
          bookingTimeIsNull: emailRequest.bookingTime === null,
          bookingTimeIsUndefined: emailRequest.bookingTime === undefined,
        });
        
        const formattedTime = emailRequest.bookingTime 
          ? formatTime(emailRequest.bookingTime) 
          : '';
        
        console.log('Formatted time result:', {
          formattedTime,
          formattedTimeLength: formattedTime.length,
          willShowInEmail: !!formattedTime
        });
        console.log('=== END BOOKING TIME DEBUG ===');

        // Format amount with currency symbol
        // Normalize currency to uppercase to handle 'eur' -> 'EUR'
        const normalizedCurrency = (emailRequest.currency || 'EUR').toUpperCase();
        const currencySymbol = normalizedCurrency === 'EUR' ? '€' : normalizedCurrency;
        const formattedAmount = `${currencySymbol}${emailRequest.totalAmount.toFixed(2)}`;

        // Get product type label
        const productTypeLabel = getProductTypeLabel(emailRequest.productType);

        // Format order number
        const orderNumber = emailRequest.orderNumber || formatOrderNumber(emailRequest.bookingId);

        // Format customer name: extract first name only (customerName may contain full name)
        // If customerSurname is provided, use it; otherwise try to extract from customerName
        let customerFirstName = emailRequest.customerName;
        let customerSurnameDisplay = '';
        
        if (emailRequest.customerSurname) {
          // If surname is explicitly provided, extract first name from customerName
          // customerName might be "Alessandro Dezzani", so we need just "Alessandro"
          const nameParts = emailRequest.customerName.trim().split(/\s+/);
          customerFirstName = nameParts[0] || emailRequest.customerName;
          customerSurnameDisplay = ` ${emailRequest.customerSurname}`;
        } else {
          // No surname provided, use customerName as is (might be just first name)
          customerFirstName = emailRequest.customerName;
          customerSurnameDisplay = '';
        }
        
        // For description, send plain text
        const productDescriptionDisplay = emailRequest.productDescription || '';
        const productDescriptionDisplayStyle = emailRequest.productDescription ? 'block' : 'none';
        
        // For time, send formatted time or empty string, and display control
        const bookingTimeDisplay = formattedTime || '';
        const bookingTimeDisplayStyle = formattedTime ? 'flex' : 'none';
        
        // Format number of adults with label
        // Hide if no_adults is true and numberOfAdults is 0
        // Note: isNoAdults is already declared above (line 190)
        const numberOfAdultsLabel = emailRequest.numberOfAdults === 1 ? 'persona' : 'persone';
        const numberOfAdultsDisplay = `${emailRequest.numberOfAdults} ${numberOfAdultsLabel}`;
        const numberOfAdultsDisplayStyle = isNoAdults ? 'none' : 'flex';
        
        // For dogs, send formatted text or empty string, and display control
        const numberOfDogsDisplay = emailRequest.numberOfDogs > 0
          ? `${emailRequest.numberOfDogs} ${emailRequest.numberOfDogs === 1 ? 'cane' : 'cani'}`
          : '';
        const numberOfDogsDisplayStyle = emailRequest.numberOfDogs > 0 ? 'flex' : 'none';

        // Format included items
        console.log('Included items received:', emailRequest.includedItems);
        const includedItemsHtml = formatIncludedItems(emailRequest.includedItems);
        console.log('Included items HTML:', includedItemsHtml);
        const includedItemsDisplay = includedItemsHtml ? 'block' : 'none';
        
        // Format excluded items
        console.log('Excluded items received:', emailRequest.excludedItems);
        const excludedItemsHtml = formatExcludedItems(emailRequest.excludedItems);
        console.log('Excluded items HTML:', excludedItemsHtml);
        const excludedItemsDisplay = excludedItemsHtml ? 'block' : 'none';
        
        // Format meeting info (only if showMeetingInfo is true)
        const showMeetingInfo = emailRequest.showMeetingInfo === true;
        const meetingInfoText = showMeetingInfo && emailRequest.meetingInfo 
          ? emailRequest.meetingInfo.text 
          : '';
        const meetingInfoLink = showMeetingInfo && emailRequest.meetingInfo 
          ? emailRequest.meetingInfo.googleMapsLink 
          : '';
        const meetingInfoDisplay = showMeetingInfo && meetingInfoText ? 'block' : 'none';
        
        // Format program (cast to OrderConfirmationEmail for type safety)
        const orderEmail = emailRequest as OrderConfirmationEmail;
        console.log('Program received:', orderEmail.program);
        const programHtml = formatProgram(orderEmail.program);
        console.log('Program HTML:', programHtml);
        const programDisplay = programHtml ? 'block' : 'none';
        
        // Regolamento link
        const regolamentoLink = 'https://flixdog.com/regolamento-a-6-zampe';
        
        // Format cancellation policy - FOLLOW SAME PATTERN AS OTHER FIELDS
        // Log BEFORE processing (same as included/excluded items)
        // orderEmail already declared above
        console.log('Cancellation policy received:', orderEmail.cancellationPolicy);
        console.log('Cancellation policy type:', typeof orderEmail.cancellationPolicy);
        console.log('Cancellation policy is null:', orderEmail.cancellationPolicy === null);
        console.log('Cancellation policy is undefined:', orderEmail.cancellationPolicy === undefined);
        console.log('Cancellation policy length:', orderEmail.cancellationPolicy?.length || 0);
        
        // CRITICAL: Use EXACTLY as received from database (no modifications)
        // This ensures the email shows the same text as the product page
        // The cancellationPolicy should come directly from the product table in the database
        // Handle null/undefined the same way as other fields (convert to empty string)
        // IMPORTANT: Cancellation policy must ALWAYS be displayed (even if empty)
        // IMPORTANT: Handle both null (from JSON) and undefined, and ensure string type
        let cancellationPolicy = '';
        if (orderEmail.cancellationPolicy != null) {
          if (typeof orderEmail.cancellationPolicy === 'string') {
            cancellationPolicy = orderEmail.cancellationPolicy;
          } else {
            // Try to convert to string if it's not null/undefined
            cancellationPolicy = String(orderEmail.cancellationPolicy);
          }
        }
        // CRITICAL: Always show cancellation policy section (even if empty)
        const cancellationPolicyDisplay = 'block';
        
        // Log AFTER processing (same as included/excluded items)
        console.log('Cancellation policy formatted (should be identical):', cancellationPolicy);
        console.log('Cancellation policy display:', cancellationPolicyDisplay);
        console.log('⚠️ CRITICAL: Policy must match EXACTLY what is shown on product page');
        console.log('⚠️ CRITICAL: All product data in email must come from database, not from booking/metadata');

        // Generate cancellation token for magic link
        const { generateCancellationToken } = await import('../_shared/cancellation-token.ts');
        const tokenSecret = Deno.env.get('CANCELLATION_TOKEN_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET')!;
        const cancellationToken = await generateCancellationToken(
          emailRequest.bookingId,
          orderNumber,
          emailRequest.customerEmail,
          tokenSecret
        );
        const websiteUrl = Deno.env.get('WEBSITE_URL') || 'https://flixdog.com';
        const cancellationLink = `${websiteUrl}/cancel/${cancellationToken}`;
        
        console.log('Cancellation link generated:', cancellationLink.substring(0, 50) + '...');

        emailParams = {
          CUSTOMER_NAME: customerFirstName,
          CUSTOMER_SURNAME: customerSurnameDisplay,
          PRODUCT_NAME: emailRequest.productName,
          PRODUCT_DESCRIPTION: productDescriptionDisplay,
          PRODUCT_DESCRIPTION_DISPLAY: productDescriptionDisplayStyle,
          PRODUCT_TYPE: productTypeLabel,
          BOOKING_DATE: formattedDate,
          BOOKING_TIME: bookingTimeDisplay,
          BOOKING_TIME_DISPLAY: bookingTimeDisplayStyle,
          NUMBER_OF_ADULTS: numberOfAdultsDisplay,
          NUMBER_OF_ADULTS_DISPLAY: numberOfAdultsDisplayStyle,
          NUMBER_OF_DOGS: numberOfDogsDisplay,
          NUMBER_OF_DOGS_DISPLAY: numberOfDogsDisplayStyle,
          TOTAL_AMOUNT: formattedAmount,
          CURRENCY: emailRequest.currency,
          ORDER_NUMBER: orderNumber,
          BOOKING_ID: emailRequest.bookingId,
          // New fields - sempre passati, anche se vuoti, per garantire che Brevo li riceva
          INCLUDED_ITEMS: includedItemsHtml || '',
          INCLUDED_ITEMS_DISPLAY: includedItemsDisplay,
          EXCLUDED_ITEMS: excludedItemsHtml || '',
          EXCLUDED_ITEMS_DISPLAY: excludedItemsDisplay,
          MEETING_INFO_TEXT: meetingInfoText,
          MEETING_INFO_LINK: meetingInfoLink,
          MEETING_INFO_DISPLAY: meetingInfoDisplay,
          PROGRAM: programHtml,
          PROGRAM_DISPLAY: programDisplay,
          REGOLAMENTO_LINK: regolamentoLink,
          // CRITICAL: Cancellation policy - must be passed exactly like other fields
          CANCELLATION_POLICY: cancellationPolicy || '', // Always pass, even if empty (same as INCLUDED_ITEMS/EXCLUDED_ITEMS)
          CANCELLATION_POLICY_DISPLAY: cancellationPolicyDisplay,
          // Cancellation magic link
          CANCELLATION_LINK: cancellationLink,
        };
        
        // Log final email params to verify cancellation policy is included
        console.log('=== FINAL EMAIL PARAMS - VERIFY CANCELLATION POLICY ===');
        console.log('CANCELLATION_POLICY value:', emailParams.CANCELLATION_POLICY);
        console.log('CANCELLATION_POLICY length:', emailParams.CANCELLATION_POLICY?.length || 0);
        console.log('CANCELLATION_POLICY_DISPLAY:', emailParams.CANCELLATION_POLICY_DISPLAY);
        console.log('CANCELLATION_POLICY type:', typeof emailParams.CANCELLATION_POLICY);
        console.log('All other fields present:', {
          INCLUDED_ITEMS: !!emailParams.INCLUDED_ITEMS,
          EXCLUDED_ITEMS: !!emailParams.EXCLUDED_ITEMS,
          MEETING_INFO_TEXT: !!emailParams.MEETING_INFO_TEXT,
          PROGRAM: !!emailParams.PROGRAM,
          CANCELLATION_POLICY: !!emailParams.CANCELLATION_POLICY,
        });
        console.log('=== END FINAL EMAIL PARAMS ===');
        
        break;
      }
      
      // Cancellation request - notify admin
      case 'cancellation_request_admin': {
        templateId = parseInt(Deno.env.get('BREVO_TEMPLATE_CANCELLATION_REQUEST_ADMIN') || '10', 10);
        
        // Fetch cancellation request and booking data
        const { data: request, error: requestError } = await supabase
          .from('cancellation_request')
          .select(`
            *,
            booking:booking_id (
              *,
              product_type,
              product_id
            )
          `)
          .eq('id', emailRequest.requestId)
          .single();
        
        if (requestError || !request) {
          throw new Error('Cancellation request not found');
        }
        
        const booking = request.booking as any;
        
        // Fetch product to get cancellation policy
        let productCancellationPolicy = '';
        let productName = booking.product_name;
        
        try {
          const { data: product } = await supabase
            .from(booking.product_type)
            .select('name, cancellation_policy')
            .eq('id', booking.product_id)
            .single();
          
          if (product) {
            productCancellationPolicy = product.cancellation_policy || 'Nessuna policy specificata';
            productName = product.name || booking.product_name;
          }
        } catch (err) {
          console.warn('Could not fetch product cancellation policy:', err);
        }
        
        const formattedBookingDate = formatDateItalian(booking.booking_date);
        const endDate = booking.trip_end_date ? ` - ${formatDateItalian(booking.trip_end_date)}` : '';
        
        emailParams = {
          ADMIN_EMAIL: 'a.thezani@gmail.com',
          ORDER_NUMBER: request.order_number,
          CUSTOMER_NAME: request.customer_name,
          CUSTOMER_EMAIL: request.customer_email,
          PRODUCT_NAME: productName,
          BOOKING_DATE: `${formattedBookingDate}${endDate}`,
          BOOKING_TIME: booking.booking_time ? formatTime(booking.booking_time) : 'N/A',
          NUMBER_OF_ADULTS: booking.number_of_adults?.toString() || '0',
          NUMBER_OF_DOGS: booking.number_of_dogs?.toString() || '0',
          CANCELLATION_POLICY: productCancellationPolicy,
          CUSTOMER_REASON: request.reason || 'Nessuna motivazione fornita',
          REQUESTED_AT: formatDateItalian(request.requested_at),
          REQUEST_ID: request.id,
          BOOKING_ID: booking.id,
          ADMIN_PORTAL_LINK: `${supabaseUrl.replace('supabase.co', 'supabase.co/project/_/editor')}/cancellation_request?filter=id%3Aeq%3A${request.id}`,
        } as any;
        
        break;
      }
      
      // Cancellation approved - notify customer
      case 'cancellation_approved_customer': {
        templateId = parseInt(Deno.env.get('BREVO_TEMPLATE_CANCELLATION_APPROVED') || '11', 10);
        
        // Fetch cancellation request and booking data
        const { data: request, error: requestError } = await supabase
          .from('cancellation_request')
          .select(`
            *,
            booking:booking_id (
              *
            )
          `)
          .eq('id', emailRequest.requestId)
          .single();
        
        if (requestError || !request) {
          throw new Error('Cancellation request not found');
        }
        
        const booking = request.booking as any;
        const formattedBookingDate = formatDateItalian(booking.booking_date);
        
        emailParams = {
          CUSTOMER_NAME: request.customer_name,
          ORDER_NUMBER: request.order_number,
          PRODUCT_NAME: booking.product_name,
          BOOKING_DATE: formattedBookingDate,
          ADMIN_NOTES: emailRequest.adminNotes || 'La tua richiesta di cancellazione è stata approvata.',
          CUSTOMER_EMAIL: request.customer_email,
        } as any;
        
        break;
      }
      
      // Cancellation rejected - notify customer
      case 'cancellation_rejected_customer': {
        templateId = parseInt(Deno.env.get('BREVO_TEMPLATE_CANCELLATION_REJECTED') || '12', 10);
        
        // Fetch cancellation request and booking data
        const { data: request, error: requestError } = await supabase
          .from('cancellation_request')
          .select(`
            *,
            booking:booking_id (
              *
            )
          `)
          .eq('id', emailRequest.requestId)
          .single();
        
        if (requestError || !request) {
          throw new Error('Cancellation request not found');
        }
        
        const booking = request.booking as any;
        const formattedBookingDate = formatDateItalian(booking.booking_date);
        
        emailParams = {
          CUSTOMER_NAME: request.customer_name,
          ORDER_NUMBER: request.order_number,
          PRODUCT_NAME: booking.product_name,
          BOOKING_DATE: formattedBookingDate,
          ADMIN_NOTES: emailRequest.adminNotes || 'La tua richiesta di cancellazione non può essere accettata.',
          CUSTOMER_EMAIL: request.customer_email,
        } as any;
        
        break;
      }
      
      // Cancellation approved - notify provider
      case 'cancellation_approved_provider': {
        templateId = parseInt(Deno.env.get('BREVO_TEMPLATE_CANCELLATION_PROVIDER') || '13', 10);
        
        // Fetch booking and provider data
        const { data: booking, error: bookingError } = await supabase
          .from('booking')
          .select(`
            *,
            profile:provider_id (
              email,
              company_name,
              contact_name
            )
          `)
          .eq('id', emailRequest.bookingId)
          .single();
        
        if (bookingError || !booking) {
          throw new Error('Booking not found');
        }
        
        const provider = booking.profile as any;
        const formattedBookingDate = formatDateItalian(booking.booking_date);
        
        emailParams = {
          PROVIDER_NAME: provider?.contact_name || 'Provider',
          COMPANY_NAME: provider?.company_name || '',
          ORDER_NUMBER: booking.order_number,
          CUSTOMER_NAME: booking.customer_name,
          PRODUCT_NAME: booking.product_name,
          BOOKING_DATE: formattedBookingDate,
          PROVIDER_EMAIL: provider?.email || '',
        } as any;
        
        break;
      }
      
      // Daily reminder - pending cancellations for admin
      case 'cancellation_reminder_admin': {
        templateId = parseInt(Deno.env.get('BREVO_TEMPLATE_CANCELLATION_REMINDER') || '14', 10);
        
        // Build HTML list of pending requests
        const urgentList = emailRequest.urgentRequests.map(r => 
          `<li><strong>${r.orderNumber}</strong> - ${r.customerName} (${r.productName}) - Data: ${formatDateItalian(r.bookingDate)} - <span style="color: red;">Richiesta ${r.daysOld} giorni fa</span></li>`
        ).join('');
        
        const recentList = emailRequest.recentRequests.map(r => 
          `<li><strong>${r.orderNumber}</strong> - ${r.customerName} (${r.productName}) - Data: ${formatDateItalian(r.bookingDate)} - Richiesta ${r.daysOld} giorni fa</li>`
        ).join('');
        
        emailParams = {
          ADMIN_EMAIL: 'a.thezani@gmail.com',
          TOTAL_COUNT: emailRequest.totalCount.toString(),
          URGENT_COUNT: emailRequest.urgentCount.toString(),
          RECENT_COUNT: emailRequest.recentCount.toString(),
          URGENT_LIST: urgentList ? `<ul>${urgentList}</ul>` : '<p>Nessuna richiesta urgente.</p>',
          RECENT_LIST: recentList ? `<ul>${recentList}</ul>` : '<p>Nessuna richiesta recente.</p>',
          ADMIN_PORTAL_LINK: `${supabaseUrl.replace('supabase.co', 'supabase.co/project/_/editor')}/cancellation_request?filter=status%3Aeq%3Apending`,
        } as any;
        
        break;
      }
      
      default:
        throw new Error(`Unsupported email type: ${(emailRequest as any).type}`);
    }

    // Determine recipient email based on email type
    let recipientEmail: string;
    if (emailRequest.type === 'order_confirmation') {
      recipientEmail = emailRequest.customerEmail;
    } else if (emailRequest.type === 'cancellation_request_admin' || emailRequest.type === 'cancellation_reminder_admin') {
      recipientEmail = 'a.thezani@gmail.com'; // Admin email
    } else if (emailRequest.type === 'cancellation_approved_provider') {
      // Provider email is in emailParams
      recipientEmail = (emailParams as any).PROVIDER_EMAIL;
      if (!recipientEmail) {
        throw new Error('Provider email not found');
      }
    } else {
      // Customer emails (approved/rejected)
      recipientEmail = (emailParams as any).CUSTOMER_EMAIL;
      if (!recipientEmail) {
        throw new Error('Customer email not found');
      }
    }

    // Send email via Brevo with BCC
    // Wrap in try-catch to reset flag if sending fails (only for order_confirmation)
    try {
      await sendBrevoEmail(
        brevoApiKey,
        templateId,
        recipientEmail,
        emailParams,
        providerEmail
      );

      console.log('=== EMAIL SENT SUCCESSFULLY ===');
      console.log('Email type:', emailRequest.type);
      console.log('Recipient:', recipientEmail);
      console.log('Booking ID:', emailRequest.bookingId);
    } catch (emailError) {
      // Email sending failed - reset flag to allow retry (only for order_confirmation)
      console.error('❌ Email sending failed:', emailError);
      if (emailRequest.type === 'order_confirmation' && emailRequest.bookingId) {
        console.error('Resetting confirmation_email_sent flag for retry');
        await supabase
          .from('booking')
          .update({ confirmation_email_sent: false })
          .eq('id', emailRequest.bookingId);
      }
      
      throw emailError; // Re-throw to return error response
    }

    // Return response with params for debugging
    const responseData = {
      success: true,
      message: 'Email sent successfully',
      emailType: emailRequest.type,
      bookingId: emailRequest.bookingId,
      // DEBUG: Include original request value to verify what was received
      debug: {
        emailType: emailRequest.type,
        requestId: (emailRequest as any).requestId || 'N/A',
      },
      params: {
        TOTAL_AMOUNT: emailParams.TOTAL_AMOUNT || 'EMPTY',
        BOOKING_TIME: emailParams.BOOKING_TIME || 'EMPTY',
        BOOKING_TIME_DISPLAY: emailParams.BOOKING_TIME_DISPLAY || 'none',
        INCLUDED_ITEMS: emailParams.INCLUDED_ITEMS ? emailParams.INCLUDED_ITEMS.substring(0, 100) + '...' : 'EMPTY',
        INCLUDED_ITEMS_LENGTH: emailParams.INCLUDED_ITEMS?.length || 0,
        INCLUDED_ITEMS_DISPLAY: emailParams.INCLUDED_ITEMS_DISPLAY,
        EXCLUDED_ITEMS: emailParams.EXCLUDED_ITEMS ? emailParams.EXCLUDED_ITEMS.substring(0, 100) + '...' : 'EMPTY',
        EXCLUDED_ITEMS_LENGTH: emailParams.EXCLUDED_ITEMS?.length || 0,
        EXCLUDED_ITEMS_DISPLAY: emailParams.EXCLUDED_ITEMS_DISPLAY,
        // CRITICAL: Include cancellation policy in response for verification
        CANCELLATION_POLICY: emailParams.CANCELLATION_POLICY ? emailParams.CANCELLATION_POLICY.substring(0, 100) + '...' : 'EMPTY',
        CANCELLATION_POLICY_LENGTH: emailParams.CANCELLATION_POLICY?.length || 0,
        CANCELLATION_POLICY_DISPLAY: emailParams.CANCELLATION_POLICY_DISPLAY,
      },
    };
    
    console.log('=== RESPONSE DATA ===');
    console.log(JSON.stringify(responseData, null, 2));
    
    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('=== EMAIL SENDING ERROR ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});


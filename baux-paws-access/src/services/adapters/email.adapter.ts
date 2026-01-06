/**
 * Email Notification Adapter Interface
 * 
 * This module abstracts email notification logic for future external service integration.
 * Designed to integrate with services like Resend, SendGrid, AWS SES, etc.
 * 
 * EXTERNAL INTEGRATION NOTES:
 * - Implement the IEmailAdapter interface for your email provider
 * - Configure RESEND_API_KEY or equivalent in Supabase secrets
 * - Create edge function to handle email sending
 * - Update EmailProvider enum when adding new providers
 */

export type EmailProvider = 'resend' | 'sendgrid' | 'ses' | 'custom';
export type EmailTemplateType = 
  | 'booking_created'
  | 'booking_updated'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'provider_welcome'
  | 'provider_activated'
  | 'provider_deactivated';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
}

export interface BookingEmailData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  productType: string;
  bookingDate: string;
  bookingTime?: string;
  numberOfHumans: number;
  numberOfDogs: number;
  totalAmount?: number;
  specialRequests?: string;
  status: string;
  providerName: string;
}

export interface ProviderEmailData {
  providerId: string;
  companyName: string;
  contactName: string;
  email: string;
}

export interface EmailPayload {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  template: EmailTemplateType;
  data: BookingEmailData | ProviderEmailData | Record<string, unknown>;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email Adapter Interface
 * Implement this interface for different email providers
 */
export interface IEmailAdapter {
  send(payload: EmailPayload): Promise<EmailResult>;
  sendBulk(payloads: EmailPayload[]): Promise<EmailResult[]>;
  getTemplatePreview(template: EmailTemplateType, data: Record<string, unknown>): string;
}

/**
 * Email Notification Service
 * Handles all email notifications in the application
 */
export class EmailNotificationService {
  private adapter: IEmailAdapter | null = null;
  private enabled: boolean = false;

  constructor(adapter?: IEmailAdapter) {
    if (adapter) {
      this.adapter = adapter;
      this.enabled = true;
    }
  }

  setAdapter(adapter: IEmailAdapter): void {
    this.adapter = adapter;
    this.enabled = true;
  }

  isEnabled(): boolean {
    return this.enabled && this.adapter !== null;
  }

  /**
   * Send booking notification to provider
   */
  async notifyProviderNewBooking(
    providerEmail: string,
    providerName: string,
    bookingData: BookingEmailData
  ): Promise<EmailResult> {
    if (!this.isEnabled()) {
      console.log('[Email] Service disabled - skipping notification');
      return { success: true, messageId: 'disabled' };
    }

    return this.adapter!.send({
      to: { email: providerEmail, name: providerName },
      subject: `Nuova prenotazione: ${bookingData.productName}`,
      template: 'booking_created',
      data: bookingData,
    });
  }

  /**
   * Send booking update notification to provider
   */
  async notifyProviderBookingUpdated(
    providerEmail: string,
    providerName: string,
    bookingData: BookingEmailData,
    changes: string[]
  ): Promise<EmailResult> {
    if (!this.isEnabled()) {
      console.log('[Email] Service disabled - skipping notification');
      return { success: true, messageId: 'disabled' };
    }

    return this.adapter!.send({
      to: { email: providerEmail, name: providerName },
      subject: `Prenotazione aggiornata: ${bookingData.productName}`,
      template: 'booking_updated',
      data: { ...bookingData, changes },
    });
  }

  /**
   * Send booking confirmation to customer
   */
  async notifyCustomerBookingConfirmed(
    bookingData: BookingEmailData
  ): Promise<EmailResult> {
    if (!this.isEnabled()) {
      console.log('[Email] Service disabled - skipping notification');
      return { success: true, messageId: 'disabled' };
    }

    return this.adapter!.send({
      to: { email: bookingData.customerEmail, name: bookingData.customerName },
      subject: `Prenotazione confermata: ${bookingData.productName}`,
      template: 'booking_confirmed',
      data: bookingData,
    });
  }

  /**
   * Send booking cancellation notification
   */
  async notifyBookingCancelled(
    recipientEmail: string,
    recipientName: string,
    bookingData: BookingEmailData,
    reason?: string
  ): Promise<EmailResult> {
    if (!this.isEnabled()) {
      console.log('[Email] Service disabled - skipping notification');
      return { success: true, messageId: 'disabled' };
    }

    return this.adapter!.send({
      to: { email: recipientEmail, name: recipientName },
      subject: `Prenotazione cancellata: ${bookingData.productName}`,
      template: 'booking_cancelled',
      data: { ...bookingData, cancellationReason: reason },
    });
  }

  /**
   * Send welcome email to new provider
   */
  async sendProviderWelcome(providerData: ProviderEmailData): Promise<EmailResult> {
    if (!this.isEnabled()) {
      console.log('[Email] Service disabled - skipping notification');
      return { success: true, messageId: 'disabled' };
    }

    return this.adapter!.send({
      to: { email: providerData.email, name: providerData.contactName },
      subject: 'Benvenuto su FlixDog!',
      template: 'provider_welcome',
      data: providerData,
    });
  }
}

/**
 * Resend Email Adapter Placeholder
 * Implement this when integrating with Resend
 */
export class ResendEmailAdapter implements IEmailAdapter {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string = 'noreply@flixdog.com') {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async send(payload: EmailPayload): Promise<EmailResult> {
    // TODO: Implement via edge function
    // The edge function should use the Resend API
    console.log('[Resend] Would send email:', payload);
    return { success: false, error: 'Not implemented - use edge function' };
  }

  async sendBulk(payloads: EmailPayload[]): Promise<EmailResult[]> {
    return Promise.all(payloads.map(p => this.send(p)));
  }

  getTemplatePreview(template: EmailTemplateType, data: Record<string, unknown>): string {
    // TODO: Implement template rendering
    return `Template: ${template}, Data: ${JSON.stringify(data)}`;
  }
}

// Singleton instance - disabled by default until configured
export const emailService = new EmailNotificationService();

// Export template types for documentation
export const EMAIL_TEMPLATES: Record<EmailTemplateType, string> = {
  booking_created: 'Notifica nuova prenotazione al provider',
  booking_updated: 'Notifica aggiornamento prenotazione al provider',
  booking_confirmed: 'Conferma prenotazione al cliente',
  booking_cancelled: 'Notifica cancellazione prenotazione',
  booking_completed: 'Notifica completamento attività',
  provider_welcome: 'Email di benvenuto per nuovo provider',
  provider_activated: 'Notifica attivazione account provider',
  provider_deactivated: 'Notifica disattivazione account provider',
};

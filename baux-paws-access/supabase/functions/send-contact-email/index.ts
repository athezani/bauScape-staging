/**
 * Supabase Edge Function: Send Contact Email via Brevo
 * 
 * Handles sending contact form emails to alessandro@flixdog.com
 * Uses Brevo API to send emails directly
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactRequest {
  nome: string;
  cognome: string;
  email: string;
  messaggio: string;
}

/**
 * Send email via Brevo API (without template)
 */
async function sendBrevoEmail(
  apiKey: string,
  to: string,
  subject: string,
  htmlContent: string,
  replyTo?: string,
  bcc?: string[]
): Promise<void> {
  const brevoUrl = 'https://api.brevo.com/v3/smtp/email';
  
  const emailPayload: any = {
    sender: {
      name: 'FlixDog Contact Form',
      email: 'noreply@flixdog.com',
    },
    to: [{ email: to }],
    subject,
    htmlContent,
  };

  if (replyTo) {
    emailPayload.replyTo = { email: replyTo };
  }

  if (bcc && bcc.length > 0) {
    emailPayload.bcc = bcc.map(email => ({ email }));
  }

  console.log('Sending contact email via Brevo:', {
    to,
    subject,
    replyTo,
    bcc,
  });

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

    // Parse request body
    const contactRequest: ContactRequest = await req.json();

    console.log('=== SENDING CONTACT EMAIL ===');
    console.log('From:', contactRequest.email);
    console.log('Name:', `${contactRequest.nome} ${contactRequest.cognome}`);

    // Validate required fields
    if (!contactRequest.nome || !contactRequest.cognome || !contactRequest.email || !contactRequest.messaggio) {
      throw new Error('Missing required fields: nome, cognome, email, and messaggio are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactRequest.email)) {
      throw new Error('Invalid email format');
    }

    // Create HTML email content
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nuovo Messaggio di Contatto</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #591F82 0%, #7B2FA8 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
            border-radius: 0 0 8px 8px;
          }
          .field {
            margin-bottom: 20px;
          }
          .field-label {
            font-weight: 600;
            color: #1A0841;
            margin-bottom: 5px;
            display: block;
          }
          .field-value {
            color: #4b5563;
            padding: 10px;
            background: white;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
          }
          .message-box {
            min-height: 100px;
            white-space: pre-wrap;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">Nuovo Messaggio di Contatto</h1>
        </div>
        <div class="content">
          <div class="field">
            <span class="field-label">Nome:</span>
            <div class="field-value">${contactRequest.nome}</div>
          </div>
          <div class="field">
            <span class="field-label">Cognome:</span>
            <div class="field-value">${contactRequest.cognome}</div>
          </div>
          <div class="field">
            <span class="field-label">Email:</span>
            <div class="field-value">
              <a href="mailto:${contactRequest.email}" style="color: #7B2FA8; text-decoration: none;">
                ${contactRequest.email}
              </a>
            </div>
          </div>
          <div class="field">
            <span class="field-label">Messaggio:</span>
            <div class="field-value message-box">${contactRequest.messaggio.replace(/\n/g, '<br>')}</div>
          </div>
          <div class="footer">
            <p>Questo messaggio è stato inviato tramite il form di contatto di FlixDog.</p>
            <p>Puoi rispondere direttamente a questo messaggio per contattare ${contactRequest.nome} ${contactRequest.cognome}.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to alessandro@flixdog.com
    const recipientEmail = 'alessandro@flixdog.com';
    const subject = `Nuovo messaggio da ${contactRequest.nome} ${contactRequest.cognome} - FlixDog`;

    await sendBrevoEmail(
      brevoApiKey,
      recipientEmail,
      subject,
      htmlContent
    );

    console.log('=== CONTACT EMAIL SENT SUCCESSFULLY ===');
    console.log('Recipient:', recipientEmail);
    console.log('From:', contactRequest.email);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email inviata con successo',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('=== CONTACT EMAIL SENDING ERROR ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Errore durante l\'invio dell\'email',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});


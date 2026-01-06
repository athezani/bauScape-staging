'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Header } from './Header';
import { FooterNext } from './FooterNext';
import { MobileMenu } from './MobileMenu';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useProduct } from '../hooks/useProduct';
import { pricingService } from '../services/pricingService';
import { getSupabaseConfig } from '../utils/env';
import { logger } from '../utils/logger';
import { EUROPEAN_COUNTRIES } from '../utils/countries';

/**
 * Validates Italian fiscal code (codice fiscale)
 * Pattern: 16 alphanumeric characters
 * Format: 6 letters (surname), 6 letters (name), 2 digits (year), 1 letter (month), 2 digits (day), 1 letter (place), 1 letter (control)
 */
function validateFiscalCode(fiscalCode: string): { valid: boolean; error?: string } {
  if (!fiscalCode || fiscalCode.trim() === '') {
    return { valid: false, error: 'Il codice fiscale è obbligatorio' };
  }

  const trimmed = fiscalCode.trim().toUpperCase();
  
  // Must be exactly 16 characters
  if (trimmed.length !== 16) {
    return {
      valid: false,
      error: 'Il codice fiscale deve essere di 16 caratteri'
    };
  }

  // Must be alphanumeric only
  if (!/^[A-Z0-9]{16}$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Il codice fiscale può contenere solo lettere e numeri'
    };
  }

  // Basic pattern validation
  const pattern = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  if (!pattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Il formato del codice fiscale non è valido'
    };
  }

  return { valid: true };
}

/**
 * Validates Italian VAT number (Partita IVA) with check digit algorithm
 * Pattern: 11 digits with Italian VAT validation algorithm
 * Returns warning (not blocking) if format is correct but check digit fails
 */
function validateVATNumber(vatNumber: string): { valid: boolean; error?: string; warning?: string } {
  if (!vatNumber || vatNumber.trim() === '') {
    return { valid: false, error: 'La partita IVA è obbligatoria' };
  }

  const trimmed = vatNumber.trim();
  
  // Must be exactly 11 digits
  if (!/^[0-9]{11}$/.test(trimmed)) {
    return {
      valid: false,
      error: 'La partita IVA deve essere di 11 cifre'
    };
  }

  // Italian VAT check digit validation (non-blocking warning)
  const digits = trimmed.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = digits[i];
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit = Math.floor(digit / 10) + (digit % 10);
      }
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  
  if (checkDigit !== digits[10]) {
    return {
      valid: true, // Still valid for submission (non-blocking)
      warning: '⚠️ La partita IVA potrebbe non essere valida secondo l\'algoritmo di controllo italiano. Verifica che sia corretta.'
    };
  }

  return { valid: true };
}

/**
 * Validates SDI code (Codice Destinatario SDI)
 * Pattern: 7 alphanumeric characters [A-Z0-9]{7}
 */
function validateSDICode(sdiCode: string): { valid: boolean; error?: string } {
  if (!sdiCode || sdiCode.trim() === '') {
    return { valid: true }; // Empty is valid (PEC is alternative)
  }

  const trimmed = sdiCode.trim().toUpperCase();
  
  // Must be exactly 7 alphanumeric characters
  if (!/^[A-Z0-9]{7}$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Il codice SDI deve essere di 7 caratteri alfanumerici'
    };
  }

  return { valid: true };
}

/**
 * Validates PEC email
 */
function validatePECEmail(pecEmail: string): { valid: boolean; error?: string } {
  if (!pecEmail || pecEmail.trim() === '') {
    return { valid: true }; // Empty is valid (SDI code is alternative)
  }

  const trimmed = pecEmail.trim().toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'Inserisci un indirizzo PEC valido'
    };
  }

  return { valid: true };
}

export function InternalCheckoutPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get parameters from URL
  const productId = searchParams.get('productId') || '';
  const productType = (searchParams.get('productType') || 'experience') as 'experience' | 'class' | 'trip';
  const slotId = searchParams.get('slotId') || '';
  const date = searchParams.get('date') || '';
  const timeSlot = searchParams.get('timeSlot') || null;
  const guests = parseInt(searchParams.get('guests') || '1', 10);
  const dogs = parseInt(searchParams.get('dogs') || '1', 10);
  
  const handleNavigate = (view: string) => {
    if (view === 'home') {
      router.push('/');
    } else if (view === 'experiences') {
      router.push('/esperienze');
    } else if (view === 'trips') {
      router.push('/viaggi');
    } else if (view === 'classes') {
      router.push('/classi');
    } else if (view === 'contacts') {
      router.push('/contatti');
    } else {
      router.push(`/${view}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load product
  const { product, loading: productLoading, error: productError } = useProduct(productId, productType);

  // B2B flag
  const [isB2B, setIsB2B] = useState(false);

  // B2C Form state
  const [customerName, setCustomerName] = useState('');
  const [customerSurname, setCustomerSurname] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCountry, setCustomerCountry] = useState('IT');
  const [customerFiscalCode, setCustomerFiscalCode] = useState('');
  const [customerAddressLine1, setCustomerAddressLine1] = useState('');
  const [customerAddressCity, setCustomerAddressCity] = useState('');
  const [customerAddressPostalCode, setCustomerAddressPostalCode] = useState('');
  const [customerAddressProvince, setCustomerAddressProvince] = useState('');

  // B2B Form state
  const [companyName, setCompanyName] = useState('');
  const [companyContactName, setCompanyContactName] = useState(''); // Nome contatto B2B
  const [companyContactSurname, setCompanyContactSurname] = useState(''); // Cognome contatto B2B
  const [companyVATNumber, setCompanyVATNumber] = useState('');
  const [companySDICode, setCompanySDICode] = useState('');
  const [companyPECEmail, setCompanyPECEmail] = useState('');
  const [companyFiscalCode, setCompanyFiscalCode] = useState(''); // Optional for B2B
  const [companyAddressLine1, setCompanyAddressLine1] = useState('');
  const [companyAddressCity, setCompanyAddressCity] = useState('');
  const [companyAddressPostalCode, setCompanyAddressPostalCode] = useState('');
  const [companyAddressProvince, setCompanyAddressProvince] = useState('');

  // Validation state
  const [fiscalCodeError, setFiscalCodeError] = useState<string | null>(null);
  const [vatNumberError, setVatNumberError] = useState<string | null>(null);
  const [vatNumberWarning, setVatNumberWarning] = useState<string | null>(null);
  const [sdiCodeError, setSdiCodeError] = useState<string | null>(null);
  const [pecEmailError, setPecEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Refs for footer
  const footerRef = useRef<HTMLElement>(null);

  // Calculate total price
  const totalPrice = product ? pricingService.calculateTotal(product, guests, dogs) : 0;

  // Validate fiscal code when user leaves the field (B2C)
  useEffect(() => {
    if (!isB2B && customerCountry === 'IT' && customerFiscalCode) {
      const validation = validateFiscalCode(customerFiscalCode);
      if (!validation.valid) {
        setFiscalCodeError(validation.error || null);
      } else {
        setFiscalCodeError(null);
      }
    } else {
      setFiscalCodeError(null);
    }
  }, [customerFiscalCode, isB2B, customerCountry]);

  // Validate VAT number when user leaves the field (B2B)
  useEffect(() => {
    if (isB2B && companyVATNumber) {
      const validation = validateVATNumber(companyVATNumber);
      if (!validation.valid) {
        setVatNumberError(validation.error || null);
        setVatNumberWarning(null);
      } else {
        setVatNumberError(null);
        setVatNumberWarning(validation.warning || null);
      }
    } else {
      setVatNumberError(null);
      setVatNumberWarning(null);
    }
  }, [companyVATNumber, isB2B]);

  // Validate SDI code when user leaves the field (B2B)
  useEffect(() => {
    if (isB2B && companySDICode) {
      const validation = validateSDICode(companySDICode);
      if (!validation.valid) {
        setSdiCodeError(validation.error || null);
      } else {
        setSdiCodeError(null);
      }
    }
  }, [companySDICode, isB2B]);

  // Validate PEC email when user leaves the field (B2B)
  useEffect(() => {
    if (isB2B && companyPECEmail) {
      const validation = validatePECEmail(companyPECEmail);
      if (!validation.valid) {
        setPecEmailError(validation.error || null);
      } else {
        setPecEmailError(null);
      }
    }
  }, [companyPECEmail, isB2B]);

  // Validate required parameters
  useEffect(() => {
    if (!productLoading && (!productId || !slotId || !date)) {
      setError('Parametri mancanti. Si prega di tornare alla pagina del prodotto e riprovare.');
    }
  }, [productId, slotId, date, productLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      if (isB2B) {
        // B2B Validation
        if (!companyContactName.trim()) {
          setError('Il nome è obbligatorio');
          setIsProcessing(false);
          return;
        }

        if (!companyContactSurname.trim()) {
          setError('Il cognome è obbligatorio');
          setIsProcessing(false);
          return;
        }

        if (!companyName.trim()) {
          setError('La ragione sociale è obbligatoria');
          setIsProcessing(false);
          return;
        }

        if (!companyVATNumber.trim()) {
          setError('La partita IVA è obbligatoria');
          setIsProcessing(false);
          return;
        }

        const vatValidation = validateVATNumber(companyVATNumber);
        if (!vatValidation.valid) {
          setError(vatValidation.error || 'Partita IVA non valida');
          setIsProcessing(false);
          return;
        }
        // Warning is non-blocking, just show it
        if (vatValidation.warning) {
          setVatNumberWarning(vatValidation.warning);
        }

        // SDI or PEC must be provided
        if (!companySDICode.trim() && !companyPECEmail.trim()) {
          setError('È obbligatorio inserire il Codice SDI oppure la PEC');
          setIsProcessing(false);
          return;
        }

        if (companySDICode.trim()) {
          const sdiValidation = validateSDICode(companySDICode);
          if (!sdiValidation.valid) {
            setError(sdiValidation.error || 'Codice SDI non valido');
            setIsProcessing(false);
            return;
          }
        }

        if (companyPECEmail.trim()) {
          const pecValidation = validatePECEmail(companyPECEmail);
          if (!pecValidation.valid) {
            setError(pecValidation.error || 'PEC non valida');
            setIsProcessing(false);
            return;
          }
        }

        if (!companyAddressLine1.trim()) {
          setError('L\'indirizzo è obbligatorio');
          setIsProcessing(false);
          return;
        }

        if (!companyAddressCity.trim()) {
          setError('La città è obbligatoria');
          setIsProcessing(false);
          return;
        }

        if (!companyAddressPostalCode.trim()) {
          setError('Il CAP è obbligatorio');
          setIsProcessing(false);
          return;
        }

        if (!companyAddressProvince.trim()) {
          setError('La provincia è obbligatoria');
          setIsProcessing(false);
          return;
        }
      } else {
        // B2C Validation
        if (!customerName.trim()) {
          setError('Il nome è obbligatorio');
          setIsProcessing(false);
          return;
        }

        if (!customerSurname.trim()) {
          setError('Il cognome è obbligatorio');
          setIsProcessing(false);
          return;
        }

        if (customerCountry === 'IT') {
          if (!customerFiscalCode.trim()) {
            setError('Il codice fiscale è obbligatorio per clienti italiani');
            setIsProcessing(false);
            return;
          }

          const fiscalCodeValidation = validateFiscalCode(customerFiscalCode);
          if (!fiscalCodeValidation.valid) {
            setError(fiscalCodeValidation.error || 'Codice fiscale non valido');
            setIsProcessing(false);
            return;
          }
        }

        if (!customerAddressLine1.trim()) {
          setError('L\'indirizzo è obbligatorio');
          setIsProcessing(false);
          return;
        }

        if (!customerAddressCity.trim()) {
          setError('La città è obbligatoria');
          setIsProcessing(false);
          return;
        }

        if (!customerAddressPostalCode.trim()) {
          setError('Il CAP è obbligatorio');
          setIsProcessing(false);
          return;
        }

        if (!customerAddressProvince.trim()) {
          setError('La provincia è obbligatoria');
          setIsProcessing(false);
          return;
        }
      }

      // Common validations
      if (!customerEmail.trim()) {
        setError('L\'email è obbligatoria');
        setIsProcessing(false);
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail.trim())) {
        setError('Inserisci un\'email valida');
        setIsProcessing(false);
        return;
      }

      if (!customerPhone.trim()) {
        setError('Il numero di telefono è obbligatorio');
        setIsProcessing(false);
        return;
      }

      if (!product) {
        setError('Prodotto non trovato. Si prega di ricaricare la pagina.');
        setIsProcessing(false);
        return;
      }

      // Get Supabase config
      const supabaseConfig = getSupabaseConfig();
      if (!supabaseConfig.url || !supabaseConfig.anonKey) {
        throw new Error('Errore di configurazione. Si prega di ricaricare la pagina e riprovare.');
      }

      // Build success and cancel URLs
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/prodotto/${product.type}/${product.id}`;

      // Call create-checkout-session with customer data
      const functionsUrl = `${supabaseConfig.url.replace(/\/$/, '')}/functions/v1/create-checkout-session`;
      
      logger.debug('Creating checkout session with customer data', {
        productId,
        productType,
        availabilitySlotId: slotId,
        date,
        guests,
        dogs,
        customerEmail: customerEmail.trim(),
        isB2B,
      });

      // Normalize timeSlot: convert HH:MM:SS to HH:MM format
      let normalizedTimeSlot: string | null = null;
      if (timeSlot && timeSlot.trim() !== '') {
        const trimmed = timeSlot.trim();
        // Handle HH:MM:SS format - extract HH:MM
        const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        if (timeMatch) {
          const hours = timeMatch[1].padStart(2, '0');
          const minutes = timeMatch[2];
          normalizedTimeSlot = `${hours}:${minutes}`;
        } else {
          // If it doesn't match expected format, try to use as-is (might already be HH:MM)
          normalizedTimeSlot = trimmed;
        }
      }

      const requestBody: any = {
        productId,
        productType,
        availabilitySlotId: slotId,
        date,
        timeSlot: normalizedTimeSlot,
        guests,
        dogs,
        successUrl,
        cancelUrl,
        isB2B,
        customer: {
          email: customerEmail.trim(),
          phone: customerPhone.trim(),
        },
      };

      if (isB2B) {
        // B2B customer data
        requestBody.customer.name = companyContactName.trim();
        requestBody.customer.surname = companyContactSurname.trim();
        requestBody.customer.companyName = companyName.trim();
        requestBody.customer.fiscalCode = companyFiscalCode.trim() || null;
        requestBody.customer.vatNumber = companyVATNumber.trim();
        requestBody.customer.sdiCode = companySDICode.trim() || null;
        requestBody.customer.pecEmail = companyPECEmail.trim() || null;
        requestBody.customer.addressLine1 = companyAddressLine1.trim();
        requestBody.customer.addressCity = companyAddressCity.trim();
        requestBody.customer.addressPostalCode = companyAddressPostalCode.trim();
        requestBody.customer.addressProvince = companyAddressProvince.trim();
        requestBody.customer.addressCountry = 'IT';
      } else {
        // B2C customer data
        requestBody.customer.name = customerName.trim();
        requestBody.customer.surname = customerSurname.trim();
        requestBody.customer.fiscalCode = customerCountry === 'IT' ? customerFiscalCode.trim() : null;
        requestBody.customer.addressLine1 = customerAddressLine1.trim();
        requestBody.customer.addressCity = customerAddressCity.trim();
        requestBody.customer.addressPostalCode = customerAddressPostalCode.trim();
        requestBody.customer.addressProvince = customerAddressProvince.trim();
        requestBody.customer.addressCountry = customerCountry;
      }

      // B2B DEBUG: Log isB2B flag and B2B fields
      logger.debug('B2B DEBUG: Sending checkout request', {
        url: functionsUrl,
        isB2B: requestBody.isB2B,
        isB2B_type: typeof requestBody.isB2B,
        hasCompanyName: !!(requestBody.customer as any).companyName,
        companyName: (requestBody.customer as any).companyName || null,
        hasVatNumber: !!(requestBody.customer as any).vatNumber,
        hasSdiCode: !!(requestBody.customer as any).sdiCode,
        hasPecEmail: !!(requestBody.customer as any).pecEmail,
        customerName: requestBody.customer.name || null,
        customerSurname: requestBody.customer.surname || null,
        requestBody: {
          ...requestBody,
          customer: {
            ...requestBody.customer,
            // Don't log sensitive data, just verify structure
            name: requestBody.customer.name ? '***' : undefined,
            email: requestBody.customer.email ? '***' : undefined,
            phone: requestBody.customer.phone ? '***' : undefined,
          }
        }
      });

      const response = await fetch(functionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseConfig.anonKey}`,
          'apikey': supabaseConfig.anonKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = 'Errore durante la creazione della sessione di pagamento';
        
        try {
          const responseText = await response.text();
          logger.error('Checkout error response', undefined, {
            status: response.status,
            statusText: response.statusText,
            responseText: responseText.substring(0, 500), // Limit log size
          });
          
          if (responseText) {
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.error || errorMessage;
            } catch {
              // If not JSON, use the text as error message
              errorMessage = responseText.length > 200 
                ? `${responseText.substring(0, 200)}...` 
                : responseText;
            }
          } else {
            errorMessage = `Errore ${response.status}: ${response.statusText || 'Bad Request'}`;
          }
        } catch (parseError) {
          logger.error('Checkout error (parse failed)', parseError, {
            status: response.status,
          });
          errorMessage = `Errore ${response.status}: ${response.statusText || 'Bad Request'}`;
        }

        setError(errorMessage);
        setIsProcessing(false);
        return;
      }

      const responseData = await response.json();

      if (!responseData.url) {
        throw new Error('Errore nella creazione della sessione di pagamento. Si prega di riprovare.');
      }

      logger.debug('Checkout session created successfully, redirecting to Stripe');
      
      // Redirect to Stripe Checkout
      window.location.assign(responseData.url);
    } catch (error) {
      logger.error('Unable to start Stripe checkout', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Errore sconosciuto durante l\'avvio del checkout. Si prega di ricaricare la pagina e riprovare.';
      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (product) {
      router.push(`/prodotto/${product.type}/${product.id}`);
    } else {
      router.back();
    }
  };

  // Loading state
  if (productLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--text-gray)' }}>Caricamento...</p>
      </div>
    );
  }

  // Error state
  if (productError || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p style={{ color: 'var(--text-dark)' }}>
          {productError || 'Prodotto non trovato'}
        </p>
        <button
          className="px-6 py-3 rounded-full font-semibold"
          style={{ 
            backgroundColor: '#F8AA5C',
            color: '#1A0841'
          }}
          onClick={handleBack}
        >
          Torna Indietro
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header 
        onMenuClick={() => setIsMenuOpen(true)}
        onNavigate={handleNavigate}
      />
      <MobileMenu 
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={(view) => {
          setIsMenuOpen(false);
          handleNavigate(view);
        }}
      />

      <main className="pb-16">
        <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-8">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 mb-4 md:mb-6 hover:opacity-70 transition-opacity font-semibold"
            style={{ color: 'var(--text-dark)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Torna al prodotto</span>
          </button>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8" style={{ color: 'var(--text-dark)' }}>
            Completa la prenotazione
          </h1>

          {/* Product info card */}
          <div className="bg-gray-50 rounded-xl p-4 md:p-6 mb-8 md:mb-10 border border-gray-200">
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4" style={{ color: 'var(--text-dark)' }}>
              {product.title}
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm md:text-base space-y-1" style={{ color: 'var(--text-gray)' }}>
                <p>Data: {new Date(date).toLocaleDateString('it-IT', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
                {timeSlot && <p>Orario: {timeSlot}</p>}
                <p>Ospiti: {guests} | Cani: {dogs}</p>
              </div>
              <div className="text-xl md:text-2xl font-bold" style={{ color: '#F8AA5C' }}>
                {pricingService.formatPrice(totalPrice)}
              </div>
            </div>
          </div>

          {/* Error alert */}
          {error && (
            <Alert variant="destructive" className="mb-6 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form id="checkout-form" onSubmit={handleSubmit}>
            {/* B2B Checkbox - Always visible */}
            <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 mb-8 md:mb-12">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="isB2B"
                  checked={isB2B}
                  onCheckedChange={(checked: boolean) => setIsB2B(checked === true)}
                  className="h-5 w-5 shrink-0"
                />
                <Label htmlFor="isB2B" className="form-label cursor-pointer mb-0" style={{ color: 'var(--text-dark)' }}>
                  Sto acquistando come azienda o professionista
                </Label>
              </div>
            </div>

            {!isB2B ? (
              /* B2C Form */
              <>
                <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 mb-8 md:mb-12">
                  <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6" style={{ color: 'var(--text-dark)' }}>
                    Dati personali
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Nome */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="name" className="form-label">Nome *</Label>
                      <Input
                        id="name"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                      />
                    </div>

                    {/* Cognome */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="surname" className="form-label">Cognome *</Label>
                      <Input
                        id="surname"
                        type="text"
                        value={customerSurname}
                        onChange={(e) => setCustomerSurname(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                      />
                    </div>

                    {/* Email */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="email" className="form-label">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                      />
                    </div>

                    {/* Telefono */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="phone" className="form-label">Telefono *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                      />
                    </div>

                    {/* Paese */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="country" className="form-label">Paese *</Label>
                      <Select value={customerCountry} onValueChange={setCustomerCountry}>
                        <SelectTrigger className="w-full rounded-lg h-10 md:h-11 text-sm md:text-base">
                          <SelectValue placeholder="Seleziona paese" />
                        </SelectTrigger>
                        <SelectContent>
                          {EUROPEAN_COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.flag} {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Codice Fiscale - Solo per Italia */}
                    {customerCountry === 'IT' && (
                      <div className="form-field-wrapper md:col-span-2">
                        <Label htmlFor="fiscalCode" className="form-label">Codice Fiscale *</Label>
                        <Input
                          id="fiscalCode"
                          type="text"
                          value={customerFiscalCode}
                          onChange={(e) => setCustomerFiscalCode(e.target.value.toUpperCase())}
                          onBlur={() => {
                            if (customerCountry === 'IT') {
                              const validation = validateFiscalCode(customerFiscalCode);
                              if (!validation.valid) {
                                setFiscalCodeError(validation.error || null);
                              } else {
                                setFiscalCodeError(null);
                              }
                            }
                          }}
                          maxLength={16}
                          required
                          className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                        />
                        {fiscalCodeError && (
                          <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' }}>
                            <p className="text-xs md:text-sm" style={{ color: '#991B1B' }}>
                              ⚠️ {fiscalCodeError}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Address section */}
                <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 mb-8 md:mb-12">
                  <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6" style={{ color: 'var(--text-dark)' }}>
                    Indirizzo di residenza
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Via/Indirizzo */}
                    <div className="form-field-wrapper md:col-span-2">
                      <Label htmlFor="addressLine1" className="form-label">Via e numero *</Label>
                      <Input
                        id="addressLine1"
                        type="text"
                        value={customerAddressLine1}
                        onChange={(e) => setCustomerAddressLine1(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                        maxLength={200}
                      />
                    </div>

                    {/* Città */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="city" className="form-label">Città *</Label>
                      <Input
                        id="city"
                        type="text"
                        value={customerAddressCity}
                        onChange={(e) => setCustomerAddressCity(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                        maxLength={200}
                      />
                    </div>

                    {/* CAP */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="postalCode" className="form-label">CAP *</Label>
                      <Input
                        id="postalCode"
                        type="text"
                        value={customerAddressPostalCode}
                        onChange={(e) => setCustomerAddressPostalCode(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                        maxLength={20}
                      />
                    </div>

                    {/* Provincia */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="province" className="form-label">Provincia *</Label>
                      <Input
                        id="province"
                        type="text"
                        value={customerAddressProvince}
                        onChange={(e) => setCustomerAddressProvince(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* B2B Form */
              <>
                <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 mb-8 md:mb-12">
                  <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6" style={{ color: 'var(--text-dark)' }}>
                    Dati azienda/professionista
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Nome */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="companyContactName" className="form-label">Nome *</Label>
                      <Input
                        id="companyContactName"
                        type="text"
                        value={companyContactName}
                        onChange={(e) => setCompanyContactName(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                      />
                    </div>

                    {/* Cognome */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="companyContactSurname" className="form-label">Cognome *</Label>
                      <Input
                        id="companyContactSurname"
                        type="text"
                        value={companyContactSurname}
                        onChange={(e) => setCompanyContactSurname(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                      />
                    </div>

                    {/* Ragione Sociale */}
                    <div className="form-field-wrapper md:col-span-2">
                      <Label htmlFor="companyName" className="form-label">Ragione Sociale *</Label>
                      <Input
                        id="companyName"
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                      />
                    </div>

                    {/* Email */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="email" className="form-label">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                      />
                    </div>

                    {/* Telefono */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="phone" className="form-label">Telefono *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                      />
                    </div>

                    {/* Partita IVA */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="vatNumber" className="form-label">Partita IVA *</Label>
                      <Input
                        id="vatNumber"
                        type="text"
                        value={companyVATNumber}
                        onChange={(e) => setCompanyVATNumber(e.target.value.replace(/\D/g, ''))}
                        onBlur={() => {
                          const validation = validateVATNumber(companyVATNumber);
                          if (!validation.valid) {
                            setVatNumberError(validation.error || null);
                          } else {
                            setVatNumberError(null);
                          }
                        }}
                        maxLength={11}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                      />
                      {vatNumberError && (
                        <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' }}>
                          <p className="text-xs md:text-sm" style={{ color: '#991B1B' }}>
                            ⚠️ {vatNumberError}
                          </p>
                        </div>
                      )}
                      {vatNumberWarning && !vatNumberError && (
                        <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
                          <p className="text-xs md:text-sm" style={{ color: '#92400E' }}>
                            {vatNumberWarning}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Codice SDI */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="sdiCode" className="form-label">Codice Destinatario SDI</Label>
                      <Input
                        id="sdiCode"
                        type="text"
                        value={companySDICode}
                        onChange={(e) => setCompanySDICode(e.target.value.toUpperCase())}
                        onBlur={() => {
                          const validation = validateSDICode(companySDICode);
                          if (!validation.valid) {
                            setSdiCodeError(validation.error || null);
                          } else {
                            setSdiCodeError(null);
                          }
                        }}
                        maxLength={7}
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                        placeholder="Oppure inserisci PEC"
                      />
                      {sdiCodeError && (
                        <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' }}>
                          <p className="text-xs md:text-sm" style={{ color: '#991B1B' }}>
                            ⚠️ {sdiCodeError}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* PEC */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="pecEmail" className="form-label">PEC</Label>
                      <Input
                        id="pecEmail"
                        type="email"
                        value={companyPECEmail}
                        onChange={(e) => setCompanyPECEmail(e.target.value)}
                        onBlur={() => {
                          const validation = validatePECEmail(companyPECEmail);
                          if (!validation.valid) {
                            setPecEmailError(validation.error || null);
                          } else {
                            setPecEmailError(null);
                          }
                        }}
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                        placeholder="Oppure inserisci Codice SDI"
                      />
                      {pecEmailError && (
                        <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' }}>
                          <p className="text-xs md:text-sm" style={{ color: '#991B1B' }}>
                            ⚠️ {pecEmailError}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Codice Fiscale (opzionale) */}
                    <div className="form-field-wrapper md:col-span-2">
                      <Label htmlFor="companyFiscalCode" className="form-label">Codice Fiscale (solo se diverso dalla P.IVA)</Label>
                      <Input
                        id="companyFiscalCode"
                        type="text"
                        value={companyFiscalCode}
                        onChange={(e) => setCompanyFiscalCode(e.target.value.toUpperCase())}
                        maxLength={16}
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* Address section */}
                <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 mb-8 md:mb-12">
                  <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6" style={{ color: 'var(--text-dark)' }}>
                    Indirizzo sede legale
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Via/Indirizzo */}
                    <div className="form-field-wrapper md:col-span-2">
                      <Label htmlFor="companyAddressLine1" className="form-label">Via e numero *</Label>
                      <Input
                        id="companyAddressLine1"
                        type="text"
                        value={companyAddressLine1}
                        onChange={(e) => setCompanyAddressLine1(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                        maxLength={200}
                      />
                    </div>

                    {/* Città */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="companyCity" className="form-label">Città *</Label>
                      <Input
                        id="companyCity"
                        type="text"
                        value={companyAddressCity}
                        onChange={(e) => setCompanyAddressCity(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                        maxLength={200}
                      />
                    </div>

                    {/* CAP */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="companyPostalCode" className="form-label">CAP *</Label>
                      <Input
                        id="companyPostalCode"
                        type="text"
                        value={companyAddressPostalCode}
                        onChange={(e) => setCompanyAddressPostalCode(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                        maxLength={20}
                      />
                    </div>

                    {/* Provincia */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="companyProvince" className="form-label">Provincia *</Label>
                      <Input
                        id="companyProvince"
                        type="text"
                        value={companyAddressProvince}
                        onChange={(e) => setCompanyAddressProvince(e.target.value)}
                        required
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base"
                      />
                    </div>

                    {/* Paese */}
                    <div className="form-field-wrapper">
                      <Label htmlFor="companyCountry" className="form-label">Paese *</Label>
                      <Input
                        id="companyCountry"
                        type="text"
                        value="Italia"
                        disabled
                        className="form-input w-full rounded-lg h-10 md:h-11 text-sm md:text-base bg-gray-100"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* CTA Button */}
            <div className="mt-8 md:mt-12">
              <Button
                type="submit"
                form="checkout-form"
                disabled={isProcessing}
                className="w-full py-4 md:py-6 text-base md:text-lg font-semibold rounded-xl"
                style={{ 
                  backgroundColor: '#F8AA5C',
                  color: '#1A0841'
                }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  `Procedi al pagamento - ${pricingService.formatPrice(totalPrice)}`
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <FooterNext ref={footerRef} />
    </div>
  );
}

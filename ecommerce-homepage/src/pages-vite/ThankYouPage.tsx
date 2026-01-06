/**
 * Thank You Page
 * Shows booking confirmation after successful Stripe payment
 * Loads data instantly from Stripe session without waiting for webhook
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, Users, Dog, Receipt, Check, X, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { MobileMenu } from '../components/MobileMenu';
import { getSupabaseConfig } from '../utils/env';
import { logger } from '../utils/logger';
import '../styles/program-list.css';

interface ThankYouData {
  sessionId: string;
  paymentStatus: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  product: {
    id: string;
    name: string;
    description: string | null;
    type: 'experience' | 'class' | 'trip';
    images: string[];
    price_adult_base: number;
    price_dog_base: number;
    no_adults?: boolean;
    highlights?: string[];
    included_items?: string[];
    excluded_items?: string[];
    meeting_info?: { text: string; google_maps_link: string } | null;
    show_meeting_info?: boolean;
    cancellation_policy?: string | null;
    attributes?: string[];
    location?: string | null;
    duration_hours?: number | null;
    duration_days?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    program?: {
      days: Array<{
        id: string;
        day_number: number;
        introduction: string | null;
        items: Array<{
          id: string;
          activity_text: string;
          order_index: number;
        }>;
      }>;
    } | null;
  };
  booking: {
    date: string;
    time: string | null;
    numberOfAdults: number;
    numberOfDogs: number;
    totalAmount: number;
    currency: string;
  };
  amountTotal: number;
  currency: string;
}

export function ThankYouPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ThankYouData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('Session ID mancante');
      setLoading(false);
      return;
    }

    loadCheckoutData();
  }, [sessionId]);

  const loadCheckoutData = async () => {
    try {
      setLoading(true);
      const supabaseConfig = getSupabaseConfig();

      // Step 1: Create booking (using new transactional function)
      // CRITICAL: This ensures booking is ALWAYS created, even if webhook fails
      logger.debug('ThankYouPage: Step 1: Creating booking for session', { sessionId });
      try {
        const createBookingUrl = `${supabaseConfig.url.replace(/\/$/, '')}/functions/v1/create-booking`;
        logger.debug('ThankYouPage: Calling create-booking', { url: createBookingUrl });
        
        const createBookingResponse = await fetch(createBookingUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseConfig.anonKey}`,
            'apikey': supabaseConfig.anonKey,
          },
          body: JSON.stringify({ 
            stripeCheckoutSessionId: sessionId,
          }),
        });

        logger.debug('ThankYouPage: create-booking response status', { status: createBookingResponse.status });

        if (createBookingResponse.ok) {
          const createBookingResult = await createBookingResponse.json();
          logger.debug('ThankYouPage: Booking created/verified successfully', { 
            bookingId: createBookingResult.bookingId,
            alreadyExisted: createBookingResult.alreadyExisted 
          });
        } else {
          const errorText = await createBookingResponse.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }
          logger.error('ThankYouPage: Failed to create booking', undefined, {
            status: createBookingResponse.status,
            statusText: createBookingResponse.statusText,
            error: errorData,
          });
          // Continue anyway - we'll try to load data
        }
      } catch (createBookingError) {
        logger.error('ThankYouPage: Error creating booking', createBookingError);
        // Continue anyway - we'll try to load data
      }

      // Step 2: Fetch checkout session details from Edge Function
      const functionsUrl = `${supabaseConfig.url.replace(/\/$/, '')}/functions/v1/get-checkout-session?session_id=${sessionId}`;
      
      const response = await fetch(functionsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseConfig.anonKey}`,
          'apikey': supabaseConfig.anonKey,
        },
      });

      if (!response.ok) {
        let errorMessage = 'Errore nel caricamento dei dettagli della prenotazione';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          
          // Translate common error messages to Italian
          if (errorMessage.includes('Session not found') || errorMessage.includes('not found')) {
            errorMessage = 'Sessione di pagamento non trovata. Si prega di verificare l\'URL o contattare l\'assistenza.';
          } else if (errorMessage.includes('expired') || errorMessage.includes('scaduta')) {
            errorMessage = 'La sessione di pagamento è scaduta. Si prega di effettuare una nuova prenotazione.';
          } else if (errorMessage.includes('unauthorized') || errorMessage.includes('autenticazione')) {
            errorMessage = 'Errore di autenticazione. Si prega di ricaricare la pagina e riprovare.';
          }
        } catch {
          // If JSON parsing fails, use default message
        }
        throw new Error(errorMessage);
      }

      const checkoutData = await response.json();
      setData(checkoutData);
    } catch (err) {
      logger.error('Error loading checkout data', err);
      let errorMessage = 'Errore nel caricamento dei dettagli della prenotazione';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Ensure message is user-friendly and in Italian
      if (!errorMessage || errorMessage.includes('Failed to') || errorMessage.includes('Error')) {
        errorMessage = 'Si è verificato un errore durante il caricamento dei dettagli della prenotazione. Si prega di ricaricare la pagina o contattare l\'assistenza se il problema persiste.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Europe/Rome',
    });
  };

  const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  };

  const getProductTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      experience: 'Esperienza',
      class: 'Classe',
      trip: 'Viaggio',
    };
    return typeMap[type] || type;
  };

  const formatOrderNumber = (sessionId: string): string => {
    // Use last 8 characters of session ID as order number
    return sessionId.slice(-8).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
          <p style={{ color: 'var(--text-gray)' }}>Caricamento conferma prenotazione...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="max-w-md">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-3" style={{ color: 'var(--text-dark)' }}>
            Errore nel caricamento della conferma
          </h2>
          <p className="mb-6" style={{ color: 'var(--text-gray)', lineHeight: '1.6' }}>
            {error || 'Non è stato possibile caricare i dettagli della prenotazione. Si prega di verificare l\'URL o contattare l\'assistenza.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              className="px-6 py-3 rounded-full font-semibold transition-opacity hover:opacity-90"
              style={{ 
                backgroundColor: '#F8AA5C',
                color: '#1A0841'
              }}
              onClick={() => window.location.reload()}
            >
              Ricarica la pagina
            </button>
            <button
              className="px-6 py-3 rounded-full border-2 font-medium transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--primary-purple)', color: 'var(--primary-purple)' }}
              onClick={() => navigate('/')}
            >
              Torna alla Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SVG placeholder inline per evitare 404
  const PLACEHOLDER_SVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

  // Normalizza l'URL dell'immagine per assicurarsi che sia completo e valido
  const normalizeImageUrl = (url: string | null | undefined): string => {
    if (!url) return PLACEHOLDER_SVG;
    
    // Se è già un URL completo HTTPS, restituiscilo così com'è
    if (url.startsWith('https://')) {
      return url;
    }
    
    // Se è HTTP, convertilo in HTTPS
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    
    // Se inizia con /, potrebbe essere un path relativo o Supabase Storage
    if (url.startsWith('/')) {
      // Se è un path di Supabase Storage, costruisci l'URL completo
      if (url.includes('/storage/') || url.startsWith('/storage/')) {
        const supabaseConfig = getSupabaseConfig();
        const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
        return `${supabaseConfig.url.replace(/\/$/, '')}/${cleanUrl}`;
      }
      // Altri path relativi non supportati
      return PLACEHOLDER_SVG;
    }
    
    // Se è un path di Supabase Storage senza /, costruisci l'URL completo
    const supabaseConfig = getSupabaseConfig();
    if (url.includes('storage/') || url.includes('supabase') || !url.includes('://')) {
      // Se contiene già il dominio Supabase, restituiscilo
      if (url.includes(supabaseConfig.url)) {
        return url;
      }
      // Costruisci l'URL completo per Supabase Storage
      const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
      // Se non inizia già con storage/, aggiungilo
      if (!cleanUrl.startsWith('storage/')) {
        return `${supabaseConfig.url.replace(/\/$/, '')}/storage/v1/object/public/${cleanUrl}`;
      }
      return `${supabaseConfig.url.replace(/\/$/, '')}/${cleanUrl}`;
    }
    
    return url;
  };

  // Ottieni l'immagine del prodotto - usa la STESSA logica della product page (mapRowToProduct)
  // La logica è: se c'è un'immagine nell'array e NON è URL esterno, usala; altrimenti usa placeholder locale
  const getProductImage = (): string => {
    // Array di immagini locali (stesso di productMapper.ts)
    const ALL_DOG_IMAGES = [
      '/images/webp/Lago_2_.webp',
      '/images/webp/Mare_1_.webp',
      '/images/webp/Montagna_1_.webp',
      '/images/webp/Parco_1_.webp',
      '/images/webp/Checco_from_Pixelcut.webp',
      '/images/webp/Checco_1_.webp',
      '/images/webp/Sniffing_Dog_Closeup.webp',
      '/images/webp/WhatsApp_Image.webp',
      '/images/webp/WhatsApp_Image_1_.webp',
      '/images/webp/WhatsApp_Image_Apr_10_2025.webp',
      '/images/webp/WhatsApp_Image_Dec_31_2025.webp',
      '/images/webp/WhatsApp_Image_Dec_31_2025_1_.webp',
      '/images/webp/WhatsApp_Image_Dec_31_2025_2_.webp',
      '/images/webp/WhatsApp_Image_Dec_31_2025_3_.webp',
      '/images/webp/WhatsApp_Image_Dec_31_2025_4_.webp',
      '/images/webp/WhatsApp_Image_Dec_31_2025_5_.webp',
    ];
    const EXPERIENCE_IMAGES = ALL_DOG_IMAGES.length > 0 ? ALL_DOG_IMAGES : ['/images/webp/Mare_1_.webp'];
    const CLASS_IMAGES = ALL_DOG_IMAGES.length > 0 ? ALL_DOG_IMAGES : ['/images/webp/Mare_1_.webp'];
    const TRIP_IMAGES = ALL_DOG_IMAGES.length > 0 ? ALL_DOG_IMAGES : ['/images/webp/Mare_1_.webp'];
    const DEFAULT_PLACEHOLDER = ALL_DOG_IMAGES[0] || '/images/webp/Mare_1_.webp';

    // Calcola placeholder locale basato su ID, tipo e nome (stessa logica di getProductImage in productMapper.ts)
    const getPlaceholderImage = (id: string, type: string, name: string): string => {
      let imagePool: string[];
      switch (type) {
        case 'experience':
          imagePool = EXPERIENCE_IMAGES;
          break;
        case 'class':
          imagePool = CLASS_IMAGES;
          break;
        case 'trip':
          imagePool = TRIP_IMAGES;
          break;
        default:
          imagePool = [DEFAULT_PLACEHOLDER];
      }
      if (imagePool.length === 0) {
        return DEFAULT_PLACEHOLDER;
      }
      const hashString = `${id}-${type}-${name || ''}`;
      const hash = hashString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const index = hash % imagePool.length;
      return imagePool[index] ?? DEFAULT_PLACEHOLDER;
    };

    // Stessa logica di mapRowToProduct:
    // 1. Calcola placeholder locale di default
    let imageUrl = getPlaceholderImage(data.product.id, data.product.type, data.product.name);
    
    // 2. Se c'è un'immagine nell'array
    if (data.product.images && Array.isArray(data.product.images) && data.product.images.length > 0) {
      const firstImage = data.product.images[0];
      // Se è un URL esterno (http/https), usa placeholder locale invece (come nella product page)
      if (typeof firstImage === 'string' && (firstImage.startsWith('http://') || firstImage.startsWith('https://'))) {
        // Usa placeholder locale (già calcolato sopra) - NON usare l'URL esterno
        imageUrl = getPlaceholderImage(data.product.id, data.product.type, data.product.name);
      } else if (typeof firstImage === 'string' && firstImage.trim() !== '') {
        // Se NON è URL esterno, usa l'immagine (può essere path locale o Supabase Storage)
        const normalized = normalizeImageUrl(firstImage);
        if (normalized && normalized !== PLACEHOLDER_SVG) {
          imageUrl = normalized;
        }
      }
    }
    
    return imageUrl;
  };

  const productImage = getProductImage();

  const handleNavigate = (view: string) => {
    if (view === 'home') {
      navigate('/');
    } else if (view === 'experiences') {
      navigate('/esperienze');
    } else if (view === 'trips') {
      navigate('/viaggi');
    } else if (view === 'classes') {
      navigate('/classi');
    } else if (view === 'contacts') {
      navigate('/contatti');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media (min-width: 768px) {
          .thank-you-product-card {
            flex-direction: row !important;
          }
          .thank-you-product-image {
            width: 40% !important;
            height: auto !important;
            min-height: 400px !important;
          }
          .thank-you-product-details {
            width: 60% !important;
          }
          .thank-you-actions {
            flex-direction: row !important;
          }
        }
      `}</style>
      <Header 
        onMenuClick={() => setIsMenuOpen(true)} 
        onNavigate={handleNavigate}
      />
      <MobileMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        onNavigate={handleNavigate}
      />

      <main>
        <div style={{ 
          paddingTop: '80px', 
          paddingBottom: '48px', 
          paddingLeft: '16px', 
          paddingRight: '16px',
          maxWidth: '1200px',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}>
        {/* Success Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            backgroundColor: '#dcfce7', 
            marginBottom: '16px' 
          }}>
            <CheckCircle style={{ width: '48px', height: '48px', color: '#16a34a' }} />
          </div>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 700, 
            marginBottom: '8px', 
            color: 'var(--text-dark)' 
          }}>
            Pagamento Confermato!
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-gray)' }}>
            La tua prenotazione è stata confermata con successo
          </p>
        </div>

        {/* Order Number */}
        <div style={{ 
          backgroundColor: '#f9fafb', 
          borderRadius: '12px', 
          padding: '20px', 
          marginBottom: '24px', 
          textAlign: 'center', 
          border: '1px solid #e5e7eb' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <Receipt style={{ width: '20px', height: '20px', color: 'var(--primary-purple)' }} />
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-gray)' }}>Numero Ordine</p>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-purple)', letterSpacing: '0.05em' }}>
            #{formatOrderNumber(data.sessionId)}
          </p>
        </div>

        {/* Product Card */}
        <div style={{ 
          backgroundColor: '#f9fafb', 
          borderRadius: '12px', 
          overflow: 'hidden', 
          marginBottom: '24px', 
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div className="thank-you-product-card" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Product Image */}
            <div className="thank-you-product-image" style={{ 
              width: '100%', 
              height: '300px', 
              backgroundColor: '#e5e7eb',
              flexShrink: 0
            }}>
              <img
                src={productImage}
                alt={data.product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = PLACEHOLDER_SVG;
                }}
              />
            </div>
            
            {/* Product Details */}
            <div className="thank-you-product-details" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ 
                  display: 'inline-block', 
                  padding: '6px 16px', 
                  borderRadius: '9999px', 
                  fontSize: '0.875rem', 
                  fontWeight: 600,
                  backgroundColor: 'var(--primary-purple)', 
                  color: 'white',
                  marginBottom: '12px'
                }}>
                  {getProductTypeLabel(data.product.type)}
                </span>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 700, 
                  marginBottom: '12px', 
                  color: 'var(--text-dark)' 
                }}>
                  {data.product.name}
                </h2>
                {data.product.description && (
                  <p style={{ 
                    fontSize: '0.875rem', 
                    lineHeight: '1.6', 
                    marginBottom: '16px', 
                    color: 'var(--text-gray)' 
                  }}>
                    {data.product.description.substring(0, 200)}
                    {data.product.description.length > 200 && '...'}
                  </p>
                )}
              </div>

              {/* Price */}
              <div style={{ 
                paddingTop: '16px', 
                borderTop: '2px solid #d1d5db', 
                marginTop: 'auto' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                    Totale Pagato
                  </p>
                  <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-purple)' }}>
                    {data.currency === 'EUR' ? '€' : data.currency}{data.amountTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Details */}
        <div style={{ 
          backgroundColor: '#f9fafb', 
          borderRadius: '12px', 
          padding: '24px', 
          marginBottom: '24px', 
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 600, 
            marginBottom: '24px', 
            color: 'var(--text-dark)' 
          }}>
            Dettagli Prenotazione
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Booking Date */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ marginTop: '4px', flexShrink: 0 }}>
                <Calendar style={{ width: '24px', height: '24px', color: 'var(--primary-purple)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px', color: 'var(--text-gray)' }}>Data</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                  {formatDate(data.booking.date)}
                </p>
              </div>
            </div>

            {/* Booking Time */}
            {data.booking.time && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ marginTop: '4px', flexShrink: 0 }}>
                  <Clock style={{ width: '24px', height: '24px', color: 'var(--primary-purple)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px', color: 'var(--text-gray)' }}>Orario</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                    {formatTime(data.booking.time)}
                  </p>
                </div>
              </div>
            )}

            {/* Duration */}
            {(data.product.duration_hours || data.product.duration_days) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ marginTop: '4px', flexShrink: 0 }}>
                  <Clock style={{ width: '24px', height: '24px', color: 'var(--primary-purple)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px', color: 'var(--text-gray)' }}>Durata</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                    {data.product.duration_days 
                      ? `${data.product.duration_days} ${data.product.duration_days === 1 ? 'giorno' : 'giorni'}`
                      : data.product.duration_hours 
                        ? `${data.product.duration_hours} ${data.product.duration_hours === 1 ? 'ora' : 'ore'}`
                        : ''
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Participants - Only show if no_adults is false or numberOfAdults > 0 */}
            {!((data.product.no_adults === true || data.product.no_adults === 1) && data.booking.numberOfAdults === 0) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ marginTop: '4px', flexShrink: 0 }}>
                  <Users style={{ width: '24px', height: '24px', color: 'var(--primary-purple)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px', color: 'var(--text-gray)' }}>Partecipanti</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                    {data.booking.numberOfAdults} {data.booking.numberOfAdults === 1 ? 'persona' : 'persone'}
                  </p>
                </div>
              </div>
            )}

            {/* Dogs */}
            {data.booking.numberOfDogs > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ marginTop: '4px', flexShrink: 0 }}>
                  <Dog style={{ width: '24px', height: '24px', color: 'var(--primary-purple)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px', color: 'var(--text-gray)' }}>Cani</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                    {data.booking.numberOfDogs} {data.booking.numberOfDogs === 1 ? 'cane' : 'cani'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Highlights */}
        {data.product.highlights && Array.isArray(data.product.highlights) && data.product.highlights.length > 0 && (
          <div style={{ 
            backgroundColor: '#f9fafb', 
            borderRadius: '12px', 
            padding: '24px', 
            marginBottom: '24px', 
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              marginBottom: '16px', 
              color: 'var(--text-dark)' 
            }}>
              Cosa Rende Speciale Questa Esperienza
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.product.highlights.map((highlight, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div 
                    style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                      backgroundColor: '#f3e8ff'
                    }}
                  >
                    <Check style={{ width: '16px', height: '16px', color: 'var(--primary-purple)' }} />
                  </div>
                  <span style={{ color: 'var(--text-dark)', fontSize: '1rem', lineHeight: '1.6' }}>
                    {highlight}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Included Items */}
        {data.product.included_items && Array.isArray(data.product.included_items) && data.product.included_items.length > 0 && (
          <div style={{ 
            backgroundColor: '#f9fafb', 
            borderRadius: '12px', 
            padding: '24px', 
            marginBottom: '24px', 
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              marginBottom: '16px', 
              color: 'var(--text-dark)' 
            }}>
              Cosa è Incluso
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.product.included_items.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <Check style={{ 
                    width: '20px', 
                    height: '20px', 
                    flexShrink: 0, 
                    marginTop: '2px',
                    color: 'var(--primary-purple)' 
                  }} />
                  <span style={{ color: 'var(--text-dark)', fontSize: '1rem', lineHeight: '1.6' }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Excluded Items */}
        {data.product.excluded_items && Array.isArray(data.product.excluded_items) && data.product.excluded_items.length > 0 && (
          <div style={{ 
            backgroundColor: '#f9fafb', 
            borderRadius: '12px', 
            padding: '24px', 
            marginBottom: '24px', 
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              marginBottom: '16px', 
              color: 'var(--text-dark)' 
            }}>
              Cosa non è Incluso
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.product.excluded_items.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <X style={{ 
                    width: '20px', 
                    height: '20px', 
                    flexShrink: 0, 
                    marginTop: '2px',
                    color: '#ef4444' 
                  }} />
                  <span style={{ color: 'var(--text-dark)', fontSize: '1rem', lineHeight: '1.6' }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location (for trips) */}
        {data.product.type === 'trip' && data.product.location && (
          <div style={{ 
            backgroundColor: '#f9fafb', 
            borderRadius: '12px', 
            padding: '24px', 
            marginBottom: '24px', 
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              marginBottom: '16px', 
              color: 'var(--text-dark)' 
            }}>
              Destinazione
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin style={{ width: '20px', height: '20px', color: 'var(--primary-purple)' }} />
              <span style={{ color: 'var(--text-dark)', fontSize: '1rem' }}>
                {data.product.location}
              </span>
            </div>
          </div>
        )}

        {/* Program */}
        {data.product.program && data.product.program.days && data.product.program.days.length > 0 && (
          <div style={{ 
            backgroundColor: '#f9fafb', 
            borderRadius: '12px', 
            padding: '24px', 
            marginBottom: '24px', 
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              marginBottom: '16px', 
              color: 'var(--text-dark)' 
            }}>
              Programma
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.product.program.days.map((day) => {
                // Calculate date for trips if startDate is available
                let dayTitle = `Giorno ${day.day_number}`;
                if (data.product.type === 'trip' && data.product.start_date) {
                  const startDate = new Date(data.product.start_date);
                  const dayDate = new Date(startDate);
                  dayDate.setDate(startDate.getDate() + (day.day_number - 1));
                  dayTitle = `Giorno ${day.day_number} - ${dayDate.toLocaleDateString('it-IT', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'Europe/Rome',
                  })}`;
                }

                const dayKey = day.id || `day-${day.day_number}`;
                const isExpanded = expandedDays.has(dayKey);
                
                const toggleDay = () => {
                  setExpandedDays(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(dayKey)) {
                      newSet.delete(dayKey);
                    } else {
                      newSet.add(dayKey);
                    }
                    return newSet;
                  });
                };

                return (
                  <div key={dayKey} style={{ marginBottom: isExpanded ? '32px' : '8px' }}>
                    <button
                      onClick={toggleDay}
                      style={{ 
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        cursor: 'pointer',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        margin: 0,
                        color: 'var(--text-dark)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                        {dayTitle}
                      </h4>
                      {isExpanded ? (
                        <ChevronUp style={{ width: '20px', height: '20px', flexShrink: 0, marginLeft: '8px', color: 'var(--text-dark)' }} />
                      ) : (
                        <ChevronDown style={{ width: '20px', height: '20px', flexShrink: 0, marginLeft: '8px', color: 'var(--text-dark)' }} />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Introduction */}
                        {day.introduction && (
                          <p style={{ color: 'var(--text-gray)', fontSize: '1rem', lineHeight: '1.6' }}>
                            {day.introduction}
                          </p>
                        )}

                        {/* Activities */}
                        {day.items && day.items.length > 0 && (
                          <ul className="space-y-2 program-activities-list" style={{ color: 'var(--text-dark)' }}>
                            {day.items.map((item) => (
                              <li key={item.id || item.order_index} style={{ color: 'var(--text-dark)' }}>
                                {item.activity_text}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Il Patto del Branco */}
        <div style={{ 
          backgroundColor: '#f9fafb', 
          borderRadius: '12px', 
          padding: '24px', 
          marginBottom: '24px', 
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 600, 
            marginBottom: '16px', 
            color: 'var(--text-dark)' 
          }}>
            Prima di partire: Il Patto del Branco
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ color: 'var(--text-dark)', fontSize: '1rem', lineHeight: '1.6' }}>
              Per garantire la sicurezza e il divertimento di tutti, ogni tour FlixDog segue un piccolo regolamento di partecipazione.
              <br />
              <a 
                href="/regolamento-a-6-zampe"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/regolamento-a-6-zampe');
                }}
                style={{ 
                  fontWeight: 600,
                  color: 'var(--primary-purple)',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Consulta il Regolamento qui
              </a>
              .
            </p>
            <p style={{ color: 'var(--text-gray)', fontSize: '1rem', lineHeight: '1.6', fontStyle: 'italic' }}>
              <strong style={{ color: 'var(--text-dark)' }}>Nota:</strong> Procedendo con la prenotazione, confermi di aver letto e accettato integralmente il regolamento.
            </p>
          </div>
        </div>

        {/* Luogo d'Incontro */}
        {data.product.show_meeting_info && data.product.meeting_info && (
          <div style={{ 
            backgroundColor: '#f9fafb', 
            borderRadius: '12px', 
            padding: '24px', 
            marginBottom: '24px', 
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              marginBottom: '16px', 
              color: 'var(--text-dark)' 
            }}>
              Luogo d'Incontro
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.product.meeting_info.text && (
                <p style={{ color: 'var(--text-dark)', fontSize: '1rem', lineHeight: '1.6' }}>
                  {data.product.meeting_info.text}
                </p>
              )}
              {data.product.meeting_info.google_maps_link && (
                <a
                  href={data.product.meeting_info.google_maps_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--primary-purple)',
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <MapPin style={{ width: '20px', height: '20px' }} />
                  Visualizza su Google Maps
                </a>
              )}
            </div>
          </div>
        )}

        {/* Cancellation Policy */}
        {data.product.cancellation_policy && (
          <div style={{ 
            backgroundColor: '#f9fafb', 
            borderRadius: '12px', 
            padding: '24px', 
            marginBottom: '24px', 
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              marginBottom: '16px', 
              color: 'var(--text-dark)' 
            }}>
              Policy di Cancellazione
            </h3>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#ffffff', 
              borderRadius: '8px', 
              border: '1px solid #e5e7eb'
            }}>
              <p style={{ color: 'var(--text-dark)', fontSize: '1rem', lineHeight: '1.6' }}>
                {data.product.cancellation_policy}
              </p>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div style={{ 
          backgroundColor: '#eff6ff', 
          borderRadius: '12px', 
          padding: '24px', 
          marginBottom: '24px', 
          border: '1px solid #bfdbfe' 
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-dark)' }}>
            Cosa succede ora?
          </h3>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-gray)' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#2563eb', marginTop: '4px' }}>•</span>
              <span>Ti abbiamo inviato una email di conferma all'indirizzo: <strong style={{ color: '#1e40af' }}>{data.customerEmail}</strong></span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#2563eb', marginTop: '4px' }}>•</span>
              <span>Riceverai ulteriori dettagli via email prima della data della prenotazione</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#2563eb', marginTop: '4px' }}>•</span>
              <span>Se hai domande, contattaci tramite email o telefono</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="thank-you-actions" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button
            style={{ 
              flex: 1, 
              padding: '12px 24px', 
              borderRadius: '9999px', 
              color: '#1A0841', 
              backgroundColor: '#F8AA5C',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 700,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            onClick={() => navigate('/')}
          >
            Torna alla Home
          </button>
          <button
            style={{ 
              flex: 1, 
              padding: '12px 24px', 
              borderRadius: '9999px', 
              border: '2px solid var(--primary-purple)', 
              color: 'var(--primary-purple)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 700,
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            onClick={() => window.print()}
          >
            Stampa Conferma
          </button>
        </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

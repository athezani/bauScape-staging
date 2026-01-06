'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Users, Calendar, Check, Dog, AlertCircle, X, Loader2, Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { Header } from './Header';
import { FooterNext } from './FooterNext';
import { MobileMenu } from './MobileMenu';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ProductImageCarousel } from './ProductImageCarousel';
import { AvailabilitySelector } from './AvailabilitySelector';
import { Alert, AlertDescription } from './ui/alert';
import { ProductAttributes } from './ProductAttributes';
import type { Product } from '../types/product';
import { getSupabaseClient } from '../lib/supabaseClient';
import { pricingService } from '../services/pricingService';
import { logger } from '../utils/logger';
import '../styles/program-list.css';

interface ProductDetailPageClientProps {
  product: Product;
}

export function ProductDetailPageClient({ product }: ProductDetailPageClientProps) {
  const router = useRouter();
  
  // Debug: Log product noAdults value (only in development)
  useEffect(() => {
    logger.debug('ProductDetailPage product data', {
      productId: product.id,
      productType: product.type,
      noAdults: product.noAdults,
    });
  }, [product]);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [dogs, setDogs] = useState(1);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tripDateInfo, setTripDateInfo] = useState<{ startDate: string; endDate: string | null; durationDays: number | null } | null>(null);
  const [slotAvailability, setSlotAvailability] = useState<{ maxAdults: number; maxDogs: number; bookedAdults: number; bookedDogs: number } | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedFAQs, setExpandedFAQs] = useState<Set<string>>(new Set());
  const bookingCardRef = useRef<HTMLDivElement>(null);

  // Load trip information and auto-select slot
  useEffect(() => {
    if (product.type === 'trip' && !selectedSlotId) {
      const loadTripData = async () => {
        try {
          const supabase = getSupabaseClient();
          
          // Load trip product data for dates
          const { data: tripData, error: tripError } = await supabase
            .from('trip')
            .select('start_date, end_date, duration_days')
            .eq('id', product.id)
            .single();

          if (tripError) {
            logger.error('ProductDetailPage: Error loading trip data', tripError);
          } else if (tripData) {
            // Set trip date info for display
            setTripDateInfo({
              startDate: tripData.start_date || '',
              endDate: tripData.end_date || null,
              durationDays: tripData.duration_days || null,
            });
          }

          // Load and auto-select slot
          // For trips, we don't filter by future date because a trip might have started
          // but still be bookable if it hasn't ended yet. We'll check trip validity instead.
          let slotsQuery = supabase
            .from('availability_slot')
            .select('id, date, time_slot')
            .eq('product_id', product.id)
            .eq('product_type', 'trip')
            .order('date', { ascending: true })
            .limit(1);

          // Only filter by future date if we have trip data and can verify the trip hasn't started
          if (tripData && tripData.start_date) {
            const today = new Date().toISOString().split('T')[0];
            const tripStartDate = tripData.start_date;
            // If trip hasn't started yet, filter by future date
            if (tripStartDate >= today) {
              slotsQuery = slotsQuery.gte('date', today);
            }
            // If trip has started, check if it's still valid (not ended)
            else if (tripData.end_date) {
              const tripEndDate = tripData.end_date;
              const todayDate = new Date(today);
              const endDate = new Date(tripEndDate);
              // If trip has ended, don't show it
              if (endDate < todayDate) {
                logger.warn('ProductDetailPage: Trip has ended', { 
                  productId: product.id, 
                  endDate: tripData.end_date,
                  today 
                });
                return;
              }
            } else if (tripData.duration_days) {
              // Calculate end date from start_date + duration_days
              const startDate = new Date(tripData.start_date);
              const endDate = new Date(startDate);
              endDate.setDate(endDate.getDate() + tripData.duration_days - 1);
              const todayDate = new Date(today);
              if (endDate < todayDate) {
                logger.warn('ProductDetailPage: Trip has ended (calculated)', { 
                  productId: product.id, 
                  startDate: tripData.start_date,
                  durationDays: tripData.duration_days,
                  calculatedEndDate: endDate.toISOString().split('T')[0],
                  today 
                });
                return;
              }
            }
          }

          const { data: slots, error } = await slotsQuery;

          if (error) {
            logger.error('ProductDetailPage: Error loading trip slots', { 
              error, 
              productId: product.id,
              tripData 
            });
            return;
          }

          logger.debug('ProductDetailPage: Trip slots query result', { 
            productId: product.id,
            slotsCount: slots?.length || 0,
            slots: slots,
            tripData 
          });

          if (slots && slots.length > 0) {
            const tripSlot = slots[0];
            logger.debug('ProductDetailPage: Auto-selecting trip slot', {
              slotId: tripSlot.id,
              date: tripSlot.date,
              productId: product.id
            });
            setSelectedSlotId(tripSlot.id);
            setSelectedDate(tripSlot.date);
            setSelectedTimeSlot(null);
            logger.debug('ProductDetailPage: Trip slot auto-selected successfully');
          } else {
            logger.warn('ProductDetailPage: No trip slots found', { 
              productId: product.id,
              tripData,
              queryFilters: 'product_id, product_type=trip'
            });
          }
        } catch (err) {
          logger.error('ProductDetailPage: Error in loadTripData', err);
        }
      };

      loadTripData();
    } else if (product.type === 'trip' && product.startDate) {
      // If we already have product data with dates, use it
      setTripDateInfo({
        startDate: product.startDate,
        endDate: product.endDate || null,
        durationDays: product.durationDays || null,
      });
    }
  }, [product.type, product.id, selectedSlotId, product.startDate, product.endDate, product.durationDays]);

  const handleAvailabilitySelect = useCallback((slotId: string, date: string, timeSlot: string | null) => {
    logger.debug('ProductDetailPage: handleAvailabilitySelect called', { slotId, date, timeSlot, productType: product.type });
    setSelectedSlotId(slotId);
    setSelectedDate(date);
    setSelectedTimeSlot(timeSlot);
    logger.debug('ProductDetailPage: State updated', { selectedSlotId: slotId, selectedDate: date });
  }, [product.type]);

  // Load slot availability when selectedSlotId changes
  useEffect(() => {
    const loadSlotAvailability = async () => {
      if (!selectedSlotId) {
        setSlotAvailability(null);
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { data: slotData, error: slotError } = await supabase
          .from('availability_slot')
          .select('max_adults, max_dogs, booked_adults, booked_dogs')
          .eq('id', selectedSlotId)
          .single();

        if (slotError) {
          logger.error('ProductDetailPage: Error loading slot availability', slotError);
          setSlotAvailability(null);
          return;
        }

        if (slotData) {
          const availability = {
            maxAdults: slotData.max_adults || 0,
            maxDogs: slotData.max_dogs || 0,
            bookedAdults: slotData.booked_adults || 0,
            bookedDogs: slotData.booked_dogs || 0,
          };
          setSlotAvailability(availability);
          logger.debug('ProductDetailPage: Slot availability loaded', availability);

          // Adjust guests and dogs if they exceed availability
          const availableAdults = availability.maxAdults - availability.bookedAdults;
          const availableDogs = availability.maxDogs - availability.bookedDogs;

          const isNoAdults = product.noAdults === true && (product.type === 'class' || product.type === 'experience');
          
          if (!isNoAdults && guests > availableAdults) {
            logger.debug('ProductDetailPage: Adjusting guests', { from: guests, to: availableAdults });
            setGuests(Math.max(1, availableAdults));
          }

          if (dogs > availableDogs) {
            logger.debug('ProductDetailPage: Adjusting dogs', { from: dogs, to: availableDogs });
            setDogs(Math.max(1, availableDogs));
          }
        }
      } catch (err) {
        logger.error('ProductDetailPage: Error in loadSlotAvailability', err);
        setSlotAvailability(null);
      }
    };

    loadSlotAvailability();
  }, [selectedSlotId, product.noAdults, product.type, guests, dogs]);

  const handleBooking = async () => {
    // Set processing state
    setIsProcessing(true);
    setError(null);
    
    // For products with no_adults, set guests to 0
    const isNoAdults = product.noAdults === true && (product.type === 'class' || product.type === 'experience');
    const finalGuests = isNoAdults ? 0 : guests;
    
    logger.debug('ProductDetailPage: handleBooking called', { 
      selectedSlotId, 
      selectedDate, 
      productType: product.type,
      productId: product.id,
      guests: finalGuests,
      dogs,
    });
    
    // For trips, we need to wait a bit for auto-selection to complete
    // Check if we have a trip without selected slot - try to get it from availability
    if (product.type === 'trip' && (!selectedSlotId || !selectedDate)) {
      logger.debug('ProductDetailPage: Trip without selected slot, trying to load directly', {
        productId: product.id,
        selectedSlotId,
        selectedDate
      });
      
      // Try to load slot directly as fallback
      try {
        const supabase = getSupabaseClient();
        
        // First, check if trip is active and get trip data
        const { data: tripData, error: tripError } = await supabase
          .from('trip')
          .select('id, active, start_date, end_date, duration_days')
          .eq('id', product.id)
          .single();

        if (tripError) {
          logger.error('ProductDetailPage: Error loading trip data in handleBooking', { 
            error: tripError, 
            productId: product.id 
          });
          setError('Errore nel caricamento dei dati del viaggio. Si prega di ricaricare la pagina e riprovare.');
          setIsProcessing(false);
          bookingCardRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          return;
        }

        if (!tripData) {
          logger.error('ProductDetailPage: Trip not found', { productId: product.id });
          setError('Viaggio non trovato. Si prega di ricaricare la pagina e riprovare.');
          setIsProcessing(false);
          bookingCardRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          return;
        }

        if (!tripData.active) {
          logger.warn('ProductDetailPage: Trip is not active', { productId: product.id });
          setError('Il viaggio non è al momento disponibile. Si prega di ricaricare la pagina e riprovare più tardi.');
          setIsProcessing(false);
          bookingCardRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          return;
        }

        // Check if trip has ended
        const today = new Date().toISOString().split('T')[0];
        if (tripData.end_date && tripData.end_date < today) {
          logger.warn('ProductDetailPage: Trip has ended', { 
            productId: product.id, 
            endDate: tripData.end_date,
            today 
          });
          setError('Il viaggio non è al momento disponibile. Si prega di ricaricare la pagina e riprovare più tardi.');
          setIsProcessing(false);
          bookingCardRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          return;
        }

        // Calculate end date if we have duration_days but not end_date
        if (!tripData.end_date && tripData.duration_days && tripData.start_date) {
          const startDate = new Date(tripData.start_date);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + tripData.duration_days - 1);
          const todayDate = new Date(today);
          if (endDate < todayDate) {
            logger.warn('ProductDetailPage: Trip has ended (calculated)', { 
              productId: product.id, 
              startDate: tripData.start_date,
              durationDays: tripData.duration_days,
              calculatedEndDate: endDate.toISOString().split('T')[0],
              today 
            });
            setError('Il viaggio non è al momento disponibile. Si prega di ricaricare la pagina e riprovare più tardi.');
            setIsProcessing(false);
            bookingCardRef.current?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            return;
          }
        }

        // Now try to load the slot - don't filter by future date for trips
        // because a trip might have started but still be bookable
        let slotsQuery = supabase
          .from('availability_slot')
          .select('id, date, time_slot, max_adults, max_dogs, booked_adults, booked_dogs')
          .eq('product_id', product.id)
          .eq('product_type', 'trip')
          .order('date', { ascending: true })
          .limit(1);

        // Only filter by future date if trip hasn't started yet
        if (tripData.start_date && tripData.start_date >= today) {
          slotsQuery = slotsQuery.gte('date', today);
        }

        const { data: slots, error } = await slotsQuery;

        if (error) {
          logger.error('ProductDetailPage: Error loading trip slots in handleBooking', { 
            error, 
            productId: product.id,
            tripData 
          });
          setError('Errore nel caricamento della disponibilità. Si prega di ricaricare la pagina e riprovare.');
          setIsProcessing(false);
          bookingCardRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          return;
        }

        logger.debug('ProductDetailPage: Trip slots query result in handleBooking', { 
          productId: product.id,
          slotsCount: slots?.length || 0,
          slots: slots,
          tripData 
        });

        if (slots && slots.length > 0) {
          const tripSlot = slots[0];
          
          // Verify slot has capacity
          const availableAdults = (tripSlot.max_adults || 0) - (tripSlot.booked_adults || 0);
          const availableDogs = (tripSlot.max_dogs || 0) - (tripSlot.booked_dogs || 0);
          
          if (availableAdults < finalGuests || availableDogs < dogs) {
            logger.warn('ProductDetailPage: Trip slot has insufficient capacity', {
              slotId: tripSlot.id,
              availableAdults,
              requestedAdults: finalGuests,
              availableDogs,
              requestedDogs: dogs
            });
            setError('Il viaggio non ha più posti disponibili per le date selezionate. Si prega di ricaricare la pagina e riprovare.');
            setIsProcessing(false);
            bookingCardRef.current?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            return;
          }

          logger.debug('ProductDetailPage: Found trip slot, selecting it', { 
            slotId: tripSlot.id,
            date: tripSlot.date,
            availableAdults,
            availableDogs
          });
          setSelectedSlotId(tripSlot.id);
          setSelectedDate(tripSlot.date);
          setSelectedTimeSlot(null);
          // Wait a moment for state to update
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          logger.warn('ProductDetailPage: No trip slots available', {
            productId: product.id,
            tripData,
            queryFilters: 'product_id, product_type=trip'
          });
          setError('Il viaggio non è al momento disponibile. Si prega di ricaricare la pagina e riprovare più tardi.');
          setIsProcessing(false);
          bookingCardRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          return;
        }
      } catch (err) {
        logger.error('ProductDetailPage: Error in handleBooking trip fallback', { 
          error: err, 
          productId: product.id 
        });
        setError('Errore nel caricamento della disponibilità. Si prega di ricaricare la pagina e riprovare.');
        setIsProcessing(false);
        bookingCardRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        return;
      }
    }
    
    // For experiences/classes, require manual selection
    if (product.type !== 'trip' && (!selectedSlotId || !selectedDate)) {
      logger.warn('ProductDetailPage: Missing required fields for booking', { selectedSlotId, selectedDate });
      setError('Per favore seleziona una data e un orario disponibili per continuare con la prenotazione.');
      setIsProcessing(false);
      bookingCardRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      return;
    }

           // Validate inputs before making request
           // Only validate guests if no_adults is false
           if (!isNoAdults) {
             if (guests < 1 || guests > 100) {
               setError('Il numero di ospiti deve essere compreso tra 1 e 100. Si prega di correggere e riprovare.');
               setIsProcessing(false);
               bookingCardRef.current?.scrollIntoView({ 
                 behavior: 'smooth', 
                 block: 'center' 
               });
               return;
             }
           }

    if (dogs < 1 || dogs > 100) {
      setError('Il numero di cani deve essere compreso tra 1 e 100. Si prega di correggere e riprovare.');
      setIsProcessing(false);
      bookingCardRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      return;
    }
    
    // Clear any previous errors
    setError(null);

    try {
      // Normalize timeSlot: convert empty string to null
      const normalizedTimeSlot = selectedTimeSlot && selectedTimeSlot.trim() !== '' 
        ? selectedTimeSlot.trim() 
        : null;

      // Build checkout URL with all parameters
      const checkoutParams = new URLSearchParams({
        productId: product.id,
        productType: product.type,
        slotId: selectedSlotId!,
        date: selectedDate,
        guests: String(finalGuests), // Use finalGuests (0 if no_adults is true)
        dogs: String(dogs),
      });

      // Add timeSlot only if present
      if (normalizedTimeSlot) {
        checkoutParams.append('timeSlot', normalizedTimeSlot);
      }

      logger.debug('Redirecting to internal checkout', {
        productId: product.id,
        productType: product.type,
        availabilitySlotId: selectedSlotId,
        date: selectedDate,
        guests: finalGuests,
        dogs,
      });

      // Redirect to internal checkout page
      router.push(`/checkout?${checkoutParams.toString()}`);
    } catch (error) {
      logger.error('Unable to navigate to checkout', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Errore sconosciuto durante la navigazione al checkout. Si prega di ricaricare la pagina e riprovare.';
      setError(errorMessage);
      setIsProcessing(false);
      bookingCardRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  // Use dynamic highlights and included items from product, fallback to empty arrays
  const highlights = product.highlights && product.highlights.length > 0 
    ? product.highlights 
    : [];
  
  const included = product.includedItems && product.includedItems.length > 0 
    ? product.includedItems 
    : [];
  
  const excluded = product.excludedItems && product.excludedItems.length > 0 
    ? product.excludedItems 
    : [];

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
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-white">
      <Header 
        onMenuClick={() => setIsMenuOpen(true)}
        onNavigate={handleNavigate}
      />
      <MobileMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Back Button */}
      <div className="max-w-[1200px] mx-auto px-4 py-4">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity font-semibold"
          style={{ color: 'var(--text-dark)' }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Torna indietro</span>
        </button>
      </div>

      {/* Hero Image with Carousel */}
      <div className="max-w-[1200px] mx-auto px-4 mb-8">
        <ProductImageCarousel
          mainImage={product.imageUrl || ''}
          secondaryImages={product.secondaryImages}
          productTitle={product.title}
        />
      </div>

      <div className="max-w-[1200px] mx-auto px-4 pb-16">
        <div className="lg:grid lg:grid-cols-3 lg:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Title & Location */}
            <div className="mb-6">
              <h1 className="mb-3">
                {product.title}
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1" style={{ color: 'var(--text-gray)' }}>
                  <MapPin className="w-5 h-5" />
                  <span>{product.location}</span>
                </div>
              </div>
            </div>

            {/* Product Attributes - Between location and dates */}
            {product.attributes && product.attributes.length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <ProductAttributes attributes={product.attributes} />
              </div>
            )}

            {/* Trip Date - Only for trips, between location and description */}
            {product.type === 'trip' && tripDateInfo && tripDateInfo.startDate && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-dark)' }}>
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">Data del viaggio</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ color: 'var(--text-gray)', fontSize: '1.1em' }}>
                    {new Date(tripDateInfo.startDate).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  {tripDateInfo.endDate && (
                    <>
                      <span style={{ color: 'var(--text-gray)' }}>-</span>
                      <span style={{ color: 'var(--text-gray)', fontSize: '1.1em' }}>
                        {new Date(tripDateInfo.endDate).toLocaleDateString('it-IT', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </>
                  )}
                  {tripDateInfo.durationDays && tripDateInfo.durationDays > 1 && (
                    <span style={{ color: 'var(--text-gray)', fontSize: '0.9em', marginLeft: '8px' }}>
                      ({tripDateInfo.durationDays} giorni)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="mb-8 pb-8 border-b border-gray-100">
                <h3 className="mb-4">
                  Descrizione
                </h3>
                <p style={{ color: 'var(--text-gray)' }}>
                  {product.description}
                </p>
              </div>
            )}

            {/* Highlights */}
            {highlights.length > 0 && (
              <div className="mb-8 pb-8 border-b border-gray-100">
                <h3 className="mb-4">
                  Cosa Rende Speciale Questa Esperienza
                </h3>
                <div className="grid gap-3">
                  {highlights.map((highlight, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: 'var(--accent-soft)' }}
                      >
                        <Check className="w-4 h-4" style={{ color: 'var(--primary-purple)' }} />
                      </div>
                      <span style={{ color: 'var(--text-dark)' }}>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What's Included */}
            {included.length > 0 && (
              <div className="mb-8 pb-8 border-b border-gray-100">
                <h3 className="mb-4">
                  Cosa è Incluso
                </h3>
                <div className="grid gap-3">
                  {included.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--primary-purple)' }} />
                      <span style={{ color: 'var(--text-dark)' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What's Not Included */}
            {excluded.length > 0 && (
              <div className="mb-8 pb-8 border-b border-gray-100">
                <h3 className="mb-4">
                  Cosa non è Incluso
                </h3>
                <ul className="grid gap-3 list-none">
                  {excluded.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <X className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                      <span style={{ color: 'var(--text-dark)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Meeting Info */}
            {product.showMeetingInfo && product.meetingInfo && (
              <div className="mb-8 pb-8 border-b border-gray-100">
                <h3 className="mb-4">
                  Orario e Punto di Incontro
                </h3>
                <div className="space-y-3">
                  {product.meetingInfo.text && (
                    <p style={{ color: 'var(--text-dark)' }}>
                      {product.meetingInfo.text}
                    </p>
                  )}
                  {product.meetingInfo.googleMapsLink && (
                    <a
                      href={product.meetingInfo.googleMapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 font-semibold hover:opacity-80 transition-opacity"
                      style={{ 
                        color: 'var(--primary-purple)',
                        textDecoration: 'underline',
                      }}
                    >
                      <MapPin className="w-5 h-5" />
                      Visualizza su Google Maps
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Program */}
            {product.program && product.program.days && product.program.days.length > 0 && (
              <div className="mb-8 pb-8 border-b border-gray-100">
                <h3 className="mb-4">
                  Programma
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {product.program.days.map((day) => {
                    // Calculate date for trips if startDate is available
                    let dayTitle = `Giorno ${day.day_number}`;
                    if (product.type === 'trip' && product.startDate) {
                      const startDate = new Date(product.startDate);
                      const dayDate = new Date(startDate);
                      dayDate.setDate(startDate.getDate() + (day.day_number - 1));
                      dayTitle = `Giorno ${day.day_number} - ${dayDate.toLocaleDateString('it-IT', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
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
                      <div key={dayKey} className={isExpanded ? "mb-8" : "mb-2"}>
                        <button
                          onClick={toggleDay}
                          className="w-full flex items-center justify-between text-left cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ 
                            color: 'var(--text-dark)',
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            margin: 0
                          }}
                        >
                          <h4 className="text-lg font-semibold" style={{ color: 'var(--text-dark)' }}>
                            {dayTitle}
                          </h4>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 flex-shrink-0 ml-2" style={{ color: 'var(--text-dark)' }} />
                          ) : (
                            <ChevronDown className="w-5 h-5 flex-shrink-0 ml-2" style={{ color: 'var(--text-dark)' }} />
                          )}
                        </button>
                        
                        {isExpanded && (
                          <div className="space-y-4 mt-4">
                            {/* Introduction */}
                            {day.introduction && (
                              <p style={{ color: 'var(--text-gray)', lineHeight: '1.6' }}>
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
            <div className="mb-8 pb-8 border-b border-gray-100">
              <h3 className="mb-4">
                Prima di partire: Il Patto del Branco
              </h3>
              <div className="space-y-3">
                <p style={{ color: 'var(--text-dark)', lineHeight: '1.6' }}>
                  Per garantire la sicurezza e il divertimento di tutti, ogni tour FlixDog segue un piccolo regolamento di partecipazione.
                  <br />
                  <a 
                    href="/regolamento-a-6-zampe"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push('/regolamento-a-6-zampe');
                    }}
                    className="font-semibold hover:opacity-80 transition-opacity"
                    style={{ 
                      color: 'var(--primary-purple)',
                      textDecoration: 'underline',
                      cursor: 'pointer'
                    }}
                  >
                    Consulta il Regolamento qui
                  </a>
                  .
                </p>
                <p style={{ color: 'var(--text-gray)', lineHeight: '1.6', fontStyle: 'italic' }}>
                  <strong style={{ color: 'var(--text-dark)' }}>Nota:</strong> Procedendo con la prenotazione, confermi di aver letto e accettato integralmente il regolamento.
                </p>
              </div>
            </div>

            {/* Cancellation Policy */}
            {product.cancellationPolicy && (
              <div className="mb-8 pb-8 border-b border-gray-100">
                <h3 className="mb-4">
                  Policy di Cancellazione
                </h3>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p style={{ color: 'var(--text-dark)', lineHeight: '1.6' }}>
                    {product.cancellationPolicy}
                  </p>
                </div>
              </div>
            )}

            {/* FAQs */}
            {product.faqs && product.faqs.length > 0 && (
              <div className="mb-8">
                <h3 className="mb-4">
                  Domande Frequenti
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {product.faqs.map((faq) => {
                    const faqKey = faq.id;
                    const isExpanded = expandedFAQs.has(faqKey);
                    
                    const toggleFAQ = () => {
                      setExpandedFAQs(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(faqKey)) {
                          newSet.delete(faqKey);
                        } else {
                          newSet.add(faqKey);
                        }
                        return newSet;
                      });
                    };

                    return (
                      <div key={faqKey} className={isExpanded ? "mb-4" : "mb-2"}>
                        <button
                          onClick={toggleFAQ}
                          className="w-full flex items-center justify-between text-left cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ 
                            color: 'var(--text-dark)',
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            margin: 0
                          }}
                        >
                          <h4 className="text-lg font-semibold" style={{ color: 'var(--text-dark)' }}>
                            {faq.question}
                          </h4>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 flex-shrink-0 ml-2" style={{ color: 'var(--text-dark)' }} />
                          ) : (
                            <ChevronDown className="w-5 h-5 flex-shrink-0 ml-2" style={{ color: 'var(--text-dark)' }} />
                          )}
                        </button>
                        
                        {isExpanded && (
                          <div className="mt-4">
                            <p style={{ color: 'var(--text-gray)', lineHeight: '1.6' }}>
                              {faq.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div 
              className="sticky top-24 p-6 rounded-2xl border-2 shadow-lg"
              style={{ borderColor: 'var(--accent-soft)' }}
              ref={bookingCardRef}
            >
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl" style={{ color: 'var(--primary-purple)' }}>
                    {pricingService.formatPriceFromNoDecimals(pricingService.getMinimumPrice(product))}
                  </span>
                </div>
                <small style={{ color: 'var(--text-gray)' }}>
                  Tasse e spese incluse
                </small>
              </div>

              {/* Error Message */}
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-start justify-between gap-2">
                    <span>{error}</span>
                    <button
                      onClick={() => setError(null)}
                      className="flex-shrink-0 p-1 rounded hover:bg-red-100 transition-colors"
                      aria-label="Chiudi messaggio di errore"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </AlertDescription>
                </Alert>
              )}

              {isSoldOut ? (
                /* Sold Out Badge */
                <div className="mb-6">
                  <div className="inline-flex items-center px-4 py-2 rounded-lg bg-red-50 border-2 border-red-200">
                    <span className="text-lg font-semibold text-red-600">Sold out</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Availability Selection - Only for experiences and classes, not trips */}
                  {product.type !== 'trip' && (
                    <div className="mb-4" ref={bookingCardRef}>
                      <AvailabilitySelector
                        productId={product.id}
                        productType={product.type}
                        onSelect={handleAvailabilitySelect}
                        selectedSlotId={selectedSlotId}
                        onSoldOutChange={setIsSoldOut}
                      />
                    </div>
                  )}

                  {/* For trips, AvailabilitySelector is hidden but still needs to be rendered for slot selection */}
                  {product.type === 'trip' && (
                    <div className="hidden">
                      <AvailabilitySelector
                        productId={product.id}
                        productType={product.type}
                        onSelect={handleAvailabilitySelect}
                        selectedSlotId={selectedSlotId}
                        onSoldOutChange={setIsSoldOut}
                      />
                    </div>
                  )}

                  {/* Guests Selection - Only show if no_adults is false */}
                  {!(product.noAdults === true && (product.type === 'class' || product.type === 'experience')) && (
                    <div className="mb-6">
                      <label className="block mb-2" style={{ color: 'var(--text-dark)' }}>
                        <Users className="w-4 h-4 inline mr-2" />
                        Numero di persone
                      </label>
                      {(() => {
                        // Calculate available adults
                        // If slot is selected, use slot availability; otherwise use product max
                        const availableAdults = slotAvailability 
                          ? Math.max(0, slotAvailability.maxAdults - slotAvailability.bookedAdults)
                          : (product.maxAdults || 5);
                        
                        const minAdults = 1;
                        const maxAdults = Math.min(availableAdults, 9); // Cap at 9
                        
                        const handleDecrease = () => {
                          if (guests > minAdults) {
                            setGuests(guests - 1);
                          }
                        };
                        
                        const handleIncrease = () => {
                          if (guests < maxAdults) {
                            setGuests(guests + 1);
                          }
                        };
                        
                        return (
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={handleDecrease}
                              disabled={guests <= minAdults}
                              className="flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
                              style={{ 
                                borderColor: guests <= minAdults ? 'var(--text-gray)' : 'var(--primary-purple)',
                                color: guests <= minAdults ? 'var(--text-gray)' : 'var(--primary-purple)'
                              }}
                              aria-label="Diminuisci numero persone"
                            >
                              <Minus className="w-5 h-5" />
                            </button>
                            <div className="px-6 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-center min-w-[180px]">
                              <span className="text-lg font-semibold" style={{ color: 'var(--text-dark)' }}>
                                {guests} {guests === 1 ? 'persona' : 'persone'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleIncrease}
                              disabled={guests >= maxAdults}
                              className="flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
                              style={{ 
                                borderColor: guests >= maxAdults ? 'var(--text-gray)' : 'var(--primary-purple)',
                                color: guests >= maxAdults ? 'var(--text-gray)' : 'var(--primary-purple)'
                              }}
                              aria-label="Aumenta numero persone"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Dogs Selection */}
                  <div className="mb-6">
                    <label className="block mb-2" style={{ color: 'var(--text-dark)' }}>
                      <Dog className="w-4 h-4 inline mr-2" />
                      Numero di cani
                    </label>
                    {(() => {
                      // Calculate available dogs
                      // If slot is selected, use slot availability; otherwise use product max
                      const availableDogs = slotAvailability 
                        ? Math.max(0, slotAvailability.maxDogs - slotAvailability.bookedDogs)
                        : (product.maxDogs || 5);
                      
                      const minDogs = 1;
                      const maxDogs = Math.min(availableDogs, 9); // Cap at 9
                      
                      const handleDecrease = () => {
                        if (dogs > minDogs) {
                          setDogs(dogs - 1);
                        }
                      };
                      
                      const handleIncrease = () => {
                        if (dogs < maxDogs) {
                          setDogs(dogs + 1);
                        }
                      };
                      
                      return (
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={handleDecrease}
                            disabled={dogs <= minDogs}
                            className="flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
                            style={{ 
                              borderColor: dogs <= minDogs ? 'var(--text-gray)' : 'var(--primary-purple)',
                              color: dogs <= minDogs ? 'var(--text-gray)' : 'var(--primary-purple)'
                            }}
                            aria-label="Diminuisci numero cani"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <div className="px-6 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-center min-w-[180px]">
                            <span className="text-lg font-semibold" style={{ color: 'var(--text-dark)' }}>
                              {dogs} {dogs === 1 ? 'cane' : 'cani'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleIncrease}
                            disabled={dogs >= maxDogs}
                            className="flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
                            style={{ 
                              borderColor: dogs >= maxDogs ? 'var(--text-gray)' : 'var(--primary-purple)',
                              color: dogs >= maxDogs ? 'var(--text-gray)' : 'var(--primary-purple)'
                            }}
                            aria-label="Aumenta numero cani"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Price Summary */}
                  <div className="mb-6 pb-6 border-b border-gray-100">
                    {(() => {
                      // Calculate price using the same logic as backend
                      const priceCalc = pricingService.calculatePrice(product, guests, dogs);
                      const showAdults = !(product.noAdults === true && (product.type === 'class' || product.type === 'experience'));
                      
                      return (
                        <>
                          {/* Show adult price only if no_adults is false */}
                          {showAdults && priceCalc.pricePerAdult > 0 && (
                            <div className="flex justify-between mb-2">
                              <span style={{ color: 'var(--text-gray)' }}>
                                {pricingService.formatPrice(priceCalc.pricePerAdult)} x {guests} {guests === 1 ? 'persona' : 'persone'}
                              </span>
                              <span style={{ color: 'var(--text-dark)' }}>
                                {pricingService.formatPrice(priceCalc.subtotalAdults)}
                              </span>
                            </div>
                          )}
                          {priceCalc.pricePerDog > 0 && (
                            <div className="flex justify-between mb-2">
                              <span style={{ color: 'var(--text-gray)' }}>
                                {pricingService.formatPrice(priceCalc.pricePerDog)} x {dogs} {dogs === 1 ? 'cane' : 'cani'}
                              </span>
                              <span style={{ color: 'var(--text-dark)' }}>
                                {pricingService.formatPrice(priceCalc.subtotalDogs)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
                            <span style={{ color: 'var(--text-dark)', fontWeight: '600' }}>
                              Totale
                            </span>
                            <span style={{ color: 'var(--primary-purple)', fontWeight: '600', fontSize: '1.1em' }}>
                              €{priceCalc.totalAmount.toFixed(2)}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* CTA Button */}
                  <button 
                    className="w-full px-6 py-4 rounded-xl font-semibold transition-all hover:translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{ 
                      backgroundColor: 'var(--accent-orange)',
                      color: '#1A0841',
                      fontWeight: 700,
                      boxShadow: '0 10px 22px rgba(8, 2, 20, 0.45)'
                    }}
                    onClick={handleBooking}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Elaborazione in corso...</span>
                      </>
                    ) : (
                      'Prenota Ora'
                    )}
                  </button>

                  <p className="text-center mt-4" style={{ color: 'var(--text-gray)' }}>
                    <small>Non ti verrà addebitato nulla ora</small>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <FooterNext />

             {/* Sticky Bottom CTA - Mobile */}
             <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-lg lg:hidden z-40">
               <div className="flex items-center justify-between gap-4">
                 <div>
                   <div className="flex items-baseline gap-1">
                     <span className="text-xl" style={{ color: 'var(--primary-purple)' }}>
                       {pricingService.formatPrice(pricingService.calculateTotal(product, guests, dogs))}
                     </span>
                     <small style={{ color: 'var(--text-gray)' }}>
                       totale
                     </small>
                   </div>
                   {selectedDate && (
                    <small style={{ color: 'var(--text-gray)' }}>
                      {!(product.noAdults === true && (product.type === 'class' || product.type === 'experience')) && `${guests} ${guests === 1 ? 'persona' : 'persone'}`}
                      {!(product.noAdults === true && (product.type === 'class' || product.type === 'experience')) && ' • '}
                      {dogs} {dogs === 1 ? 'cane' : 'cani'}
                    </small>
                   )}
                 </div>
          <button 
            className="px-6 py-3 rounded-full font-semibold transition-all hover:translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ 
              backgroundColor: 'var(--accent-orange)',
              color: '#1A0841',
              fontWeight: 700,
              boxShadow: '0 10px 22px rgba(8, 2, 20, 0.45)'
            }}
            onClick={handleBooking}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Elaborazione...</span>
              </>
            ) : (
              'Prenota Ora'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
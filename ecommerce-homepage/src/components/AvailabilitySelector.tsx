/**
 * Availability Selector Component
 * Displays available dates/slots for a product and allows selection
 */

import { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { ProductType } from '../types/product';
import { logger } from '../utils/logger';

const SHOW_MORE_STEP = 5;

interface AvailabilitySlot {
  id: string;
  date: string;
  time_slot: string | null;
  end_time: string | null;
  max_adults: number;
  max_dogs: number;
  booked_adults: number;
  booked_dogs: number;
}

interface AvailabilitySelectorProps {
  productId: string;
  productType: ProductType;
  onSelect: (slotId: string, date: string, timeSlot: string | null) => void;
  selectedSlotId?: string | null;
  onSoldOutChange?: (isSoldOut: boolean) => void;
}

export function AvailabilitySelector({
  productId,
  productType,
  onSelect,
  selectedSlotId,
  onSoldOutChange,
}: AvailabilitySelectorProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [tripDurationDays, setTripDurationDays] = useState<number | null>(null);
  const [tripStartDate, setTripStartDate] = useState<string | null>(null);
  const [tripEndDate, setTripEndDate] = useState<string | null>(null);
  const [step, setStep] = useState<'date' | 'time'>('date'); // Two-step selection: date first, then time
  const [dateDisplayCount, setDateDisplayCount] = useState(SHOW_MORE_STEP);
  const [timeDisplayCount, setTimeDisplayCount] = useState(SHOW_MORE_STEP);

  useEffect(() => {
    loadAvailability();
  }, [productId, productType]);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let supabase;
      try {
        supabase = getSupabaseClient();
      } catch (configError) {
        logger.error('AvailabilitySelector: Failed to get Supabase client', configError);
        const errorMsg = configError instanceof Error ? configError.message : 'Errore di configurazione';
        if (errorMsg.includes('configuration') || errorMsg.includes('missing')) {
          setError('Errore di configurazione. Si prega di contattare il supporto.');
        } else {
          setError('Errore nel caricamento della disponibilità. Si prega di ricaricare la pagina e riprovare.');
        }
        setLoading(false);
        return;
      }

      // First check if product is active and get cutoff_hours
      // For trips, also get duration_days, start_date, end_date to show period
      const tableName = productType === 'class' ? 'class' : productType === 'experience' ? 'experience' : 'trip';
      const selectFields = productType === 'trip' 
        ? 'active, cutoff_hours, duration_days, start_date, end_date'
        : 'active, cutoff_hours';
      const { data: productData, error: productError } = await supabase
        .from(tableName)
        .select(selectFields)
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      
      // Type assertion for productData
      const product = productData as { active?: boolean; cutoff_hours?: number; duration_days?: number; start_date?: string; end_date?: string } | null;
      
      if (!product?.active) {
        setIsSoldOut(true);
        onSoldOutChange?.(true);
        setSlots([]);
        return;
      }

      // Store trip data for date range display
      if (productType === 'trip') {
        if (product?.duration_days) {
          setTripDurationDays(product.duration_days);
        }
        if (product?.start_date) {
          setTripStartDate(product.start_date);
        }
        if (product?.end_date) {
          setTripEndDate(product.end_date);
        }
      }

      let query = supabase
        .from('availability_slot')
        .select('*')
        .eq('product_id', productId)
        .eq('product_type', productType);
      
      if (productType !== 'trip') {
        query = query.gte('date', new Date().toISOString().split('T')[0]);
      }
      
      const { data, error: fetchError } = await query
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (fetchError) throw fetchError;

      // Filter available slots considering cutoff time
      const now = new Date();
      const cutoffHours = product?.cutoff_hours || 0;
      const availableSlots = (data || []).filter(slot => {
        // Check capacity
        if (slot.booked_adults >= slot.max_adults || slot.booked_dogs >= slot.max_dogs) {
          return false;
        }

        // Check cutoff time if set
        if (cutoffHours > 0) {
          const slotDate = new Date(slot.date);
          const slotTime = slot.time_slot ? slot.time_slot.split(':') : [0, 0];
          slotDate.setHours(parseInt(slotTime[0]), parseInt(slotTime[1]), 0, 0);
          
          const cutoffTime = new Date(now.getTime() + cutoffHours * 60 * 60 * 1000);
          
          if (slotDate <= cutoffTime) {
            return false; // Too late to book
          }
        }

        return true;
      });

      setSlots(availableSlots);

      // Check if product is completely sold out
      // Sold out = no available slots AND there are slots in DB (meaning they're all full)
      const soldOut = availableSlots.length === 0 && (data || []).length > 0;
      setIsSoldOut(soldOut);
      onSoldOutChange?.(soldOut);

      // For trips: always auto-select the first (and only) slot immediately
      if (productType === 'trip' && availableSlots.length > 0) {
        const tripSlot = availableSlots[0];
        logger.debug('AvailabilitySelector: Auto-selecting trip slot', {
          slotId: tripSlot.id,
          date: tripSlot.date,
          productType,
          availableSlotsCount: availableSlots.length
        });
        setSelectedDate(tripSlot.date);
        // Call onSelect immediately and synchronously
        onSelect(tripSlot.id, tripSlot.date, null);
        logger.debug('AvailabilitySelector: onSelect called for trip slot');
      }
      // Auto-select if only one date with one slot (for experiences/classes)
      else if (availableSlots.length === 1) {
        const singleSlot = availableSlots[0];
        setSelectedDate(singleSlot.date);
        setStep('time'); // Skip to time step (but there's only one option)
        onSelect(singleSlot.id, singleSlot.date, singleSlot.time_slot);
      } else {
        // Reset to date selection step
        setStep('date');
        setSelectedDate(null);
      }
    } catch (err) {
      logger.error('Error loading availability', err);
      const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto';
      
      // Check if it's a configuration error
      if (errorMsg.includes('not configured') || errorMsg.includes('configuration is missing') || errorMsg.includes('Supabase')) {
        logger.error('Supabase configuration error in AvailabilitySelector', err);
        setError('Errore di configurazione. Si prega di contattare il supporto.');
      } else {
        let userMessage = 'Errore nel caricamento della disponibilità. Si prega di ricaricare la pagina e riprovare.';
        if (errorMsg.includes('network') || errorMsg.includes('rete')) {
          userMessage = 'Errore di connessione. Si prega di verificare la connessione internet e riprovare.';
        } else if (errorMsg.includes('timeout') || errorMsg.includes('scaduto')) {
          userMessage = 'Tempo di attesa scaduto. Si prega di ricaricare la pagina e riprovare.';
        }
        setError(userMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Backup auto-selection for trips (ensure slot is selected after slots load)
  useEffect(() => {
    if (productType === 'trip' && slots.length > 0) {
      const tripSlot = slots[0]; // Trips have only one slot per product
      // Check if already selected by comparing with prop from parent
      if (selectedSlotId !== tripSlot.id) {
        logger.debug('AvailabilitySelector: Backup auto-selection of trip slot', {
          slotId: tripSlot.id,
          date: tripSlot.date,
          currentSelectedSlotId: selectedSlotId,
        });
        // Use a small delay to ensure parent state is ready
        const timeoutId = setTimeout(() => {
          onSelect(tripSlot.id, tripSlot.date, null);
        }, 50);
        return () => clearTimeout(timeoutId);
      } else {
        logger.debug('AvailabilitySelector: Trip slot already selected via prop', { slotId: tripSlot.id });
      }
    }
  }, [productType, slots, selectedSlotId, onSelect]);

  // Reset display counts when slots change
  useEffect(() => {
    setDateDisplayCount(SHOW_MORE_STEP);
  }, [slots]);

  // Reset time display count when selected date changes
  useEffect(() => {
    setTimeDisplayCount(SHOW_MORE_STEP);
  }, [selectedDate]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  };

  const formatTimeRange = (start: string | null, end: string | null): string => {
    if (!start) return '';
    if (!end) return formatTime(start);
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  // Group slots by date
  const slotsByDate: Record<string, AvailabilitySlot[]> = {};
  slots.forEach(slot => {
    if (!slotsByDate[slot.date]) {
      slotsByDate[slot.date] = [];
    }
    slotsByDate[slot.date].push(slot);
  });

  const dates = Object.keys(slotsByDate).sort();
  const displayedDates = dates.slice(0, dateDisplayCount);

  // Don't show calendar if single date with single slot
  const shouldShowCalendar = dates.length > 1 || (dates.length === 1 && slotsByDate[dates[0]]?.length > 1);

  if (loading) {
    return (
      <div className="text-center py-4" style={{ color: 'var(--text-gray)' }}>
        Caricamento disponibilità...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 px-4 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-600 font-medium mb-1">Errore nel caricamento della disponibilità</p>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (isSoldOut) {
    return (
      <div className="text-center py-6 px-4 bg-red-50 rounded-lg border border-red-200">
        <p className="text-lg font-semibold text-red-600 mb-2">Esaurito</p>
        <p className="text-sm text-red-500">
          Questo prodotto non è al momento disponibile.
        </p>
      </div>
    );
  }

  if (slots.length === 0) {
    // For trips, if no slots but product is active, show trip period
    if (productType === 'trip' && tripStartDate) {
      // Calculate end date if we have duration_days but not end_date
      let endDateToShow = tripEndDate;
      if (!endDateToShow && tripDurationDays && tripDurationDays > 0) {
        const start = new Date(tripStartDate);
        const end = new Date(start);
        end.setDate(end.getDate() + tripDurationDays - 1);
        endDateToShow = end.toISOString().split('T')[0];
      }
      
      return (
        <div className="space-y-4">
          <div className="font-medium" style={{ color: 'var(--text-dark)' }}>
            {formatDate(tripStartDate)}
            {endDateToShow && ` - ${formatDate(endDateToShow)}`}
          </div>
          {tripDurationDays && tripDurationDays > 1 && (
            <div className="text-sm" style={{ color: 'var(--text-gray)' }}>
              {tripDurationDays} giorni
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="text-center py-4" style={{ color: 'var(--text-gray)' }}>
        Nessuna disponibilità al momento.
      </div>
    );
  }

  // For trips: show the fixed period (start_date to end_date) - no selection needed
  if (productType === 'trip' && slots.length > 0) {
    const tripSlot = slots[0]; // Trips have only one slot per product
    
    // Calculate end date from start_date + duration_days
    let endDateStr = '';
    if (tripDurationDays && tripDurationDays > 0) {
      const start = new Date(tripSlot.date);
      const end = new Date(start);
      end.setDate(end.getDate() + tripDurationDays - 1);
      endDateStr = end.toISOString().split('T')[0];
    } else if (tripEndDate) {
      endDateStr = tripEndDate;
    }
    
    return (
      <div className="space-y-4">
        <div className="font-medium" style={{ color: 'var(--text-dark)' }}>
          {formatDate(tripSlot.date)}
          {endDateStr && ` - ${formatDate(endDateStr)}`}
        </div>
        {tripDurationDays && tripDurationDays > 1 && (
          <div className="text-sm" style={{ color: 'var(--text-gray)' }}>
            {tripDurationDays} giorni
          </div>
        )}
      </div>
    );
  }

  // Single date with single slot - don't show calendar
  if (!shouldShowCalendar && dates.length === 1 && slotsByDate[dates[0]]?.length === 1) {
    const slot = slotsByDate[dates[0]][0];
    return (
      <div className="space-y-4">
        <div className="font-medium" style={{ color: 'var(--text-dark)' }}>
          {formatDate(dates[0])}
        </div>
        {slot.time_slot && (
          <div className="flex items-center gap-2" style={{ color: 'var(--text-gray)' }}>
            <Clock className="w-4 h-4" />
            <span>{formatTimeRange(slot.time_slot, slot.end_time)}</span>
          </div>
        )}
      </div>
    );
  }

  // Get slots for selected date
  const selectedDateSlots = selectedDate ? slotsByDate[selectedDate] || [] : [];
  const displayedTimeSlots = selectedDateSlots.slice(0, timeDisplayCount);
  const selectedDateHasMultipleSlots = selectedDateSlots.length > 1;
  const selectedDateHasTimeSlots = selectedDateSlots.some(s => s.time_slot !== null);

  // Show two-step selection: date first, then time
  return (
    <div className="space-y-4">
      {step === 'date' ? (
        /* Step 1: Date Selection */
        <>
          <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--text-dark)' }}>
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Seleziona data</span>
          </div>

          {productType === 'trip' ? (
            /* Trip: Should not reach here as trips are handled above (single period, no selection) */
            <div className="text-center py-4" style={{ color: 'var(--text-gray)' }}>
              Nessuna disponibilità al momento.
            </div>
          ) : (
            /* Experience/Class: Show dates */
            <div className="space-y-3">
              {displayedDates.map(date => {
                const dateSlots = slotsByDate[date] || [];
                const slotCount = dateSlots.length;
                
                return (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedDate(date);
                      // If only one slot for this date, select it directly
                      if (slotCount === 1 && dateSlots[0]) {
                        const slot = dateSlots[0];
                        onSelect(slot.id, date, slot.time_slot);
                        setStep('time'); // Show time step even if only one slot (for consistency)
                      } else {
                        // Multiple slots, go to time selection step
                        setStep('time');
                      }
                    }}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all cursor-pointer font-semibold ${
                      selectedDate === date
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-medium" style={{ color: 'var(--text-dark)' }}>
                      {formatDate(date)}
                    </div>
                  </button>
                );
              })}
              {dates.length > dateDisplayCount && (
                <div className="text-center">
                  <button
                    onClick={() => setDateDisplayCount(prev => prev + SHOW_MORE_STEP)}
                    className="px-8 py-3 rounded-full font-semibold transition-all hover:translate-y-0.5 focus:outline-none border-2 active:border-2"
                    style={{ 
                      backgroundColor: '#FFFFFF',
                      color: '#1A0841',
                      fontWeight: 700,
                      borderColor: '#1A0841',
                      borderWidth: '2px'
                    }}
                  >
                    Mostra altro
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Step 2: Time Selection (only for experiences/classes with multiple slots) */
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2" style={{ color: 'var(--text-dark)' }}>
              <Clock className="w-5 h-5" />
              <span className="font-medium">Seleziona orario</span>
            </div>
            <button
              onClick={() => {
                setStep('date');
                setSelectedDate(null);
              }}
              className="text-sm text-purple-600 hover:text-purple-700 underline font-semibold"
            >
              Cambia data
            </button>
          </div>

          {selectedDate && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium" style={{ color: 'var(--text-dark)' }}>
                {formatDate(selectedDate)}
              </div>
            </div>
          )}

          {selectedDateHasTimeSlots ? (
            /* Show time slots */
            <div className="space-y-2">
              {displayedTimeSlots.map(slot => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    onSelect(slot.id, selectedDate!, slot.time_slot);
                  }}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md font-semibold ${
                    selectedSlotId === slot.id
                      ? 'border-purple-500 bg-purple-50 shadow-sm'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: 'var(--text-gray)' }} />
                    <span style={{ color: 'var(--text-dark)', fontWeight: selectedSlotId === slot.id ? '600' : '400' }}>
                      {formatTimeRange(slot.time_slot, slot.end_time)}
                    </span>
                  </div>
                </button>
              ))}
              {selectedDateSlots.length > timeDisplayCount && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setTimeDisplayCount(prev => prev + SHOW_MORE_STEP)}
                    className="px-8 py-3 rounded-full font-semibold transition-all hover:translate-y-0.5 focus:outline-none border-2 active:border-2"
                    style={{ 
                      backgroundColor: '#FFFFFF',
                      color: '#1A0841',
                      fontWeight: 700,
                      borderColor: '#1A0841',
                      borderWidth: '2px'
                    }}
                  >
                    Mostra altro
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Full-day session */
            <button
              type="button"
              onClick={() => {
                if (selectedDateSlots.length > 0) {
                  onSelect(selectedDateSlots[0].id, selectedDate!, null);
                }
              }}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md font-semibold ${
                selectedSlotId === selectedDateSlots[0]?.id
                  ? 'border-purple-500 bg-purple-50 shadow-sm'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <span style={{ color: 'var(--text-dark)', fontWeight: selectedSlotId === selectedDateSlots[0]?.id ? '600' : '400' }}>
                Giornata intera
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}


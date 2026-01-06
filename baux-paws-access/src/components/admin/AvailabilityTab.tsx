/**
 * Availability Tab Component
 * Manages product availability (dates, time slots, capacity)
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ProductType } from '@/types/product.types';
import type { 
  AvailabilitySlot, 
  AvailabilitySlotFormData, 
  TripAvailabilityFormData,
  FullDayTimeFormData 
} from '@/types/availability.types';
import {
  fetchProductAvailability,
  createAvailabilitySlots,
  createTripAvailability,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
} from '@/services/availability.service';

interface AvailabilityTabProps {
  productId: string | null;
  productType: ProductType;
  // durationHours is no longer needed - duration is calculated from slots automatically
  onAvailabilityChange?: () => void;
}

export function AvailabilityTab({
  productId,
  productType,
  onAvailabilityChange,
}: AvailabilityTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [cutoffHours, setCutoffHours] = useState<number | null>(null);
  const [fullDayTimes, setFullDayTimes] = useState<FullDayTimeFormData>({
    start_time: '09:00',
    end_time: '18:00',
  });

  // For Experiences/Classes: selected dates and their time slots
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dateTimeSlots, setDateTimeSlots] = useState<Record<string, AvailabilitySlotFormData[]>>({});

  // For Trips: only max adults and dogs (ogni prodotto ha un solo periodo predefinito)
  const [tripAvailability, setTripAvailability] = useState<TripAvailabilityFormData>({
    max_adults: 999,
    max_dogs: 999,
  });

  useEffect(() => {
    if (productId) {
      loadAvailability();
      loadProductSettings();
    }
  }, [productId]);

  const loadAvailability = async () => {
    if (!productId) return;

    try {
      setLoading(true);
      const data = await fetchProductAvailability(productId, productType);
      setSlots(data);

      // For trips, populate tripAvailability (only max adults and dogs)
      if (productType === 'trip' && data.length > 0) {
        const tripSlot = data[0];
        setTripAvailability({
          max_adults: tripSlot.max_adults,
          max_dogs: tripSlot.max_dogs,
        });
      } else if (productType !== 'trip') {
        // Group slots by date
        const dates = [...new Set(data.map(s => s.date))];
        setSelectedDates(dates);
        const grouped: Record<string, AvailabilitySlotFormData[]> = {};
        dates.forEach(date => {
          const dateSlots = data.filter(s => s.date === date);
          grouped[date] = dateSlots.map(s => ({
            date: s.date,
            time_slot: s.time_slot,
            end_time: s.end_time,
            max_adults: s.max_adults,
            max_dogs: s.max_dogs,
          }));
        });
        setDateTimeSlots(grouped);
      }
    } catch (error) {
      console.error('Error loading availability:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare la disponibilità',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProductSettings = async () => {
    if (!productId) return;

    try {
      const tableName = productType === 'class' ? 'class' : productType === 'experience' ? 'experience' : 'trip';
      // For trips, don't select full_day times (they don't exist in trip table)
      const selectFields = productType === 'trip' 
        ? 'cutoff_hours'
        : 'cutoff_hours, full_day_start_time, full_day_end_time';
      
      const { data, error } = await supabase
        .from(tableName)
        .select(selectFields)
        .eq('id', productId)
        .single();

      if (!error && data) {
        setCutoffHours(data.cutoff_hours);
        // Only set full_day times for experiences and classes (not trips)
        if (productType !== 'trip' && data.full_day_start_time && data.full_day_end_time) {
          setFullDayTimes({
            start_time: data.full_day_start_time.substring(0, 5), // HH:mm
            end_time: data.full_day_end_time.substring(0, 5),
          });
        }
      }
    } catch (error) {
      console.error('Error loading product settings:', error);
    }
  };

  const handleAddDate = () => {
    // Usa il mese corrente come default
    const today = new Date();
    const currentMonth = today.toISOString().substring(0, 7); // YYYY-MM
    const defaultDate = `${currentMonth}-01`; // Primo giorno del mese corrente
    
    const newDate = prompt('Inserisci una data (YYYY-MM-DD):', defaultDate);
    if (newDate && !selectedDates.includes(newDate)) {
      const updatedDates = [...selectedDates, newDate].sort();
      setSelectedDates(updatedDates);
      if (!dateTimeSlots[newDate]) {
        setDateTimeSlots({ ...dateTimeSlots, [newDate]: [] });
      }
    }
  };

  const handleRemoveDate = (date: string) => {
    setSelectedDates(selectedDates.filter(d => d !== date));
    const updated = { ...dateTimeSlots };
    delete updated[date];
    setDateTimeSlots(updated);
  };

  const handleAddTimeSlot = (date: string) => {
    const slots = dateTimeSlots[date] || [];
    // Calculate average duration from existing slots to suggest end_time
    const avgDuration = calculateAverageDurationFromSlots(slots);
    const newSlot: AvailabilitySlotFormData = {
      date,
      time_slot: '10:00',
      end_time: avgDuration ? calculateEndTime('10:00', avgDuration) : '12:00', // Default 2 hours if no slots
      max_adults: 999,
      max_dogs: 999,
    };
    setDateTimeSlots({ ...dateTimeSlots, [date]: [...slots, newSlot] });
  };
  
  const calculateAverageDurationFromSlots = (slots: AvailabilitySlotFormData[]): number | null => {
    if (slots.length === 0) return null;
    let totalDuration = 0;
    let validSlots = 0;
    
    slots.forEach(slot => {
      if (slot.time_slot && slot.end_time) {
        const duration = calculateDurationFromTimes(slot.time_slot, slot.end_time);
        if (duration > 0) {
          totalDuration += duration;
          validSlots++;
        }
      }
    });
    
    return validSlots > 0 ? totalDuration / validSlots : null;
  };
  
  const calculateDurationFromTimes = (startTime: string, endTime: string): number => {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const start = startHours * 60 + startMinutes;
    const end = endHours * 60 + endMinutes;
    const duration = end >= start ? (end - start) / 60 : (24 * 60 - start + end) / 60;
    return duration;
  };

  const handleRemoveTimeSlot = (date: string, index: number) => {
    const slots = dateTimeSlots[date] || [];
    setDateTimeSlots({ ...dateTimeSlots, [date]: slots.filter((_, i) => i !== index) });
  };

  const handleTimeSlotChange = (
    date: string,
    index: number,
    field: keyof AvailabilitySlotFormData,
    value: string | number
  ) => {
    const slots = dateTimeSlots[date] || [];
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate end_time if start_time changes, using average duration from other slots
    if (field === 'time_slot' && typeof value === 'string') {
      const avgDuration = calculateAverageDurationFromSlots(slots.filter((_, i) => i !== index));
      if (avgDuration) {
        updated[index].end_time = calculateEndTime(value, avgDuration);
      } else if (!updated[index].end_time) {
        // Default to 2 hours if no other slots exist
        updated[index].end_time = calculateEndTime(value, 2);
      }
    }
    
    setDateTimeSlots({ ...dateTimeSlots, [date]: updated });
  };

  const calculateEndTime = (startTime: string, hours: number): string => {
    const [hoursStr, minutesStr] = startTime.split(':');
    const start = new Date();
    start.setHours(parseInt(hoursStr), parseInt(minutesStr || '0'), 0);
    start.setHours(start.getHours() + hours);
    return `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
  };

  const handleSaveAvailability = async () => {
    if (!productId) {
      toast({
        title: 'Errore',
        description: 'Salva prima il prodotto per gestire la disponibilità',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Save product settings (cutoff_hours, full_day times)
      // NOTE: active è gestito nel tab Informazioni, non qui
      // NOTE: full_day times don't exist for trips, so we only update them for experiences/classes
      const tableName = productType === 'class' ? 'class' : productType === 'experience' ? 'experience' : 'trip';
      
      // Build update object based on product type
      const updateData: Record<string, any> = {
        cutoff_hours: cutoffHours,
      };
      
      // Only add full_day times for experiences and classes (not trips)
      if (productType !== 'trip') {
        updateData.full_day_start_time = fullDayTimes.start_time;
        updateData.full_day_end_time = fullDayTimes.end_time;
      }
      
      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', productId);

      if (updateError) throw updateError;

      // Delete existing slots
      await Promise.all(slots.map(slot => deleteAvailabilitySlot(slot.id)));

      // Create new slots
      if (productType === 'trip') {
        // For trips: ogni prodotto ha un solo periodo predefinito
        // La data viene presa dal prodotto, qui gestiamo solo max_adults e max_dogs
        await createTripAvailability(productId, {
          max_adults: tripAvailability.max_adults,
          max_dogs: tripAvailability.max_dogs,
        });
      } else {
        // For Experiences/Classes
        const slotsToCreate: AvailabilitySlotFormData[] = [];
        
        selectedDates.forEach(date => {
          const dateSlots = dateTimeSlots[date] || [];
          if (dateSlots.length === 0) {
            // Full-day slot (no time slots)
            slotsToCreate.push({
              date,
              time_slot: null,
              end_time: null,
              max_adults: 999,
              max_dogs: 999,
            });
          } else {
            slotsToCreate.push(...dateSlots);
          }
        });

        if (slotsToCreate.length > 0) {
          await createAvailabilitySlots(productId, productType, slotsToCreate);
        }
      }

      toast({
        title: 'Successo',
        description: 'Disponibilità salvata con successo',
      });

      await loadAvailability();
      onAvailabilityChange?.();
    } catch (error) {
      console.error('Error saving availability:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile salvare la disponibilità',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!productId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Salva prima il prodotto per gestire la disponibilità</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Impostazioni Prodotto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cutoffHours">Cutoff Time (ore prima dell'inizio)</Label>
            <Input
              id="cutoffHours"
              type="number"
              min={0}
              value={cutoffHours ?? ''}
              onChange={(e) => setCutoffHours(e.target.value ? parseInt(e.target.value) : null)}
              placeholder="24 (es. 24 ore prima)"
            />
            <p className="text-sm text-muted-foreground">
              Tempo minimo richiesto per prenotare (in ore prima dell'inizio)
            </p>
          </div>

          {productType !== 'trip' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullDayStart">Orario Inizio Giornata Intera</Label>
                <Input
                  id="fullDayStart"
                  type="time"
                  value={fullDayTimes.start_time}
                  onChange={(e) => setFullDayTimes({ ...fullDayTimes, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullDayEnd">Orario Fine Giornata Intera</Label>
                <Input
                  id="fullDayEnd"
                  type="time"
                  value={fullDayTimes.end_time}
                  onChange={(e) => setFullDayTimes({ ...fullDayTimes, end_time: e.target.value })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Availability Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Gestione Disponibilità
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {productType === 'trip' ? (
            /* Trip Availability - Solo max adulti e cani (ogni prodotto ha un solo periodo predefinito) */
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Per i trip, ogni prodotto ha un solo periodo predefinito (data inizio e fine definite nel prodotto). Qui puoi gestire solo la disponibilità massima.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tripMaxAdults">Max Adulti</Label>
                  <Input
                    id="tripMaxAdults"
                    type="number"
                    min={1}
                    value={tripAvailability.max_adults}
                    onChange={(e) => setTripAvailability({ ...tripAvailability, max_adults: parseInt(e.target.value) || 999 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tripMaxDogs">Max Cani</Label>
                  <Input
                    id="tripMaxDogs"
                    type="number"
                    min={0}
                    value={tripAvailability.max_dogs}
                    onChange={(e) => setTripAvailability({ ...tripAvailability, max_dogs: parseInt(e.target.value) || 999 })}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Experience/Class Availability */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Date Disponibili</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddDate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi Data
                </Button>
              </div>

              {selectedDates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessuna data selezionata. Aggiungi una data per iniziare.
                </p>
              ) : (
                <div className="space-y-4">
                  {selectedDates.map(date => (
                    <Card key={date}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {new Date(date).toLocaleDateString('it-IT', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveDate(date)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Time Slots</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddTimeSlot(date)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Aggiungi Slot
                          </Button>
                        </div>

                        {(dateTimeSlots[date] || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Nessuno slot. Usa "Aggiungi Slot" per creare slot orari, oppure lascia vuoto per giornata intera.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {(dateTimeSlots[date] || []).map((slot, index) => (
                              <div key={index} className="flex items-end gap-2 p-3 border rounded-lg">
                                <div className="flex-1 space-y-1">
                                  <Label className="text-xs">Inizio</Label>
                                  <Input
                                    type="time"
                                    value={slot.time_slot || ''}
                                    onChange={(e) => handleTimeSlotChange(date, index, 'time_slot', e.target.value)}
                                  />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <Label className="text-xs">Fine</Label>
                                  <Input
                                    type="time"
                                    value={slot.end_time || ''}
                                    onChange={(e) => handleTimeSlotChange(date, index, 'end_time', e.target.value)}
                                  />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <Label className="text-xs">Max Adulti</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={slot.max_adults}
                                    onChange={(e) => handleTimeSlotChange(date, index, 'max_adults', parseInt(e.target.value) || 999)}
                                  />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <Label className="text-xs">Max Cani</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={slot.max_dogs}
                                    onChange={(e) => handleTimeSlotChange(date, index, 'max_dogs', parseInt(e.target.value) || 999)}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveTimeSlot(date, index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveAvailability} disabled={loading}>
          {loading ? 'Salvataggio...' : 'Salva Disponibilità'}
        </Button>
      </div>
    </div>
  );
}


/**
 * Program Tab Component
 * Manages product program (days and activities)
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ProductType, ProductProgram, ProgramDay, ProgramItem } from '@/types/product.types';
import { loadProductProgram } from '@/services/product.service';

interface ProgramTabProps {
  productId?: string;
  productType: ProductType;
  durationDays?: number; // For trips: max days allowed
  program: ProductProgram | null;
  onProgramChange: (program: ProductProgram | null) => void;
}

export function ProgramTab({
  productId,
  productType,
  durationDays,
  program,
  onProgramChange,
}: ProgramTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [localProgram, setLocalProgram] = useState<ProductProgram | null>(program);

  // Load program when editing existing product
  useEffect(() => {
    if (productId && !localProgram && !loading) {
      loadProgram();
    }
  }, [productId]);

  // Sync local program with parent
  useEffect(() => {
    if (localProgram !== program) {
      setLocalProgram(program);
    }
  }, [program]);

  // Notify parent when program changes
  useEffect(() => {
    onProgramChange(localProgram);
  }, [localProgram, onProgramChange]);

  const loadProgram = async () => {
    if (!productId) return;

    setLoading(true);
    try {
      const loadedProgram = await loadProductProgram(productId, productType);
      setLocalProgram(loadedProgram);
    } catch (error) {
      console.error('Error loading program:', error);
      toast({
        title: 'Errore',
        description: 'Errore nel caricamento del programma',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getMaxDays = (): number => {
    if (productType === 'trip' && durationDays) {
      return durationDays;
    }
    return 1; // For experiences and classes
  };

  const getAvailableDays = (): number[] => {
    const maxDays = getMaxDays();
    const existingDays = localProgram?.days.map(d => d.day_number) || [];
    const available: number[] = [];
    
    for (let i = 1; i <= maxDays; i++) {
      if (!existingDays.includes(i)) {
        available.push(i);
      }
    }
    
    return available;
  };

  const handleAddDay = () => {
    const available = getAvailableDays();
    if (available.length === 0) {
      toast({
        title: 'Limite raggiunto',
        description: `Hai già aggiunto tutti i giorni disponibili (${getMaxDays()})`,
        variant: 'destructive',
      });
      return;
    }

    const newDayNumber = available[0];
    const newDay: ProgramDay = {
      day_number: newDayNumber,
      introduction: null,
      items: [],
    };

    const updatedDays = [...(localProgram?.days || []), newDay].sort((a, b) => a.day_number - b.day_number);
    setLocalProgram({ days: updatedDays });
  };

  const handleRemoveDay = (dayNumber: number) => {
    if (!localProgram) return;

    const updatedDays = localProgram.days.filter(d => d.day_number !== dayNumber);
    setLocalProgram(updatedDays.length > 0 ? { days: updatedDays } : null);
  };

  const handleUpdateDayIntroduction = (dayNumber: number, introduction: string) => {
    if (!localProgram) return;

    const updatedDays = localProgram.days.map(day =>
      day.day_number === dayNumber
        ? { ...day, introduction: introduction || null }
        : day
    );
    setLocalProgram({ days: updatedDays });
  };

  const handleAddActivity = (dayNumber: number) => {
    if (!localProgram) return;

    const day = localProgram.days.find(d => d.day_number === dayNumber);
    if (!day) return;

    if (day.items.length >= 10) {
      toast({
        title: 'Limite raggiunto',
        description: 'Massimo 10 attività per giorno',
        variant: 'destructive',
      });
      return;
    }

    const newItem: ProgramItem = {
      activity_text: '',
      order_index: day.items.length,
    };

    const updatedDays = localProgram.days.map(d =>
      d.day_number === dayNumber
        ? { ...d, items: [...d.items, newItem] }
        : d
    );
    setLocalProgram({ days: updatedDays });
  };

  const handleRemoveActivity = (dayNumber: number, itemIndex: number) => {
    if (!localProgram) return;

    const updatedDays = localProgram.days.map(day =>
      day.day_number === dayNumber
        ? {
            ...day,
            items: day.items
              .filter((_, i) => i !== itemIndex)
              .map((item, i) => ({ ...item, order_index: i })),
          }
        : day
    );
    setLocalProgram({ days: updatedDays });
  };

  const handleUpdateActivity = (dayNumber: number, itemIndex: number, activityText: string) => {
    if (!localProgram) return;

    const updatedDays = localProgram.days.map(day =>
      day.day_number === dayNumber
        ? {
            ...day,
            items: day.items.map((item, i) =>
              i === itemIndex ? { ...item, activity_text: activityText } : item
            ),
          }
        : day
    );
    setLocalProgram({ days: updatedDays });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Caricamento programma...</p>
        </CardContent>
      </Card>
    );
  }

  const days = localProgram?.days || [];

  // For experiences and classes: single day view
  if (productType === 'experience' || productType === 'class') {
    const day = days.find(d => d.day_number === 1) || { day_number: 1, introduction: null, items: [] };

    return (
      <Card>
        <CardHeader>
          <CardTitle>Programma</CardTitle>
          <p className="text-sm text-muted-foreground">
            Aggiungi un'introduzione opzionale e le attività previste per questa esperienza/classe
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Introduction */}
          <div className="space-y-2">
            <Label htmlFor="day-introduction">Introduzione (opzionale)</Label>
            <Textarea
              id="day-introduction"
              placeholder="Aggiungi un'introduzione al programma..."
              value={day.introduction || ''}
              onChange={(e) => {
                const updatedDays = day.day_number === 1
                  ? [{ ...day, introduction: e.target.value || null }]
                  : [{ day_number: 1, introduction: e.target.value || null, items: [] }];
                setLocalProgram({ days: updatedDays });
              }}
              rows={3}
            />
          </div>

          {/* Activities */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Attività</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddActivity(1)}
                disabled={day.items.length >= 10}
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi attività
              </Button>
            </div>

            {day.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna attività aggiunta</p>
            ) : (
              <div className="space-y-2">
                {day.items.map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder={`Attività ${index + 1}`}
                        value={item.activity_text}
                        onChange={(e) => handleUpdateActivity(1, index, e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveActivity(1, index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // For trips: tabs for each day
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Programma</CardTitle>
            <p className="text-sm text-muted-foreground">
              Aggiungi il programma per ciascun giorno del viaggio
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddDay}
            disabled={getAvailableDays().length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi giorno
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {days.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Nessun giorno aggiunto</p>
            <Button type="button" variant="outline" onClick={handleAddDay}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi primo giorno
            </Button>
          </div>
        ) : (
          <Tabs defaultValue={`day-${days[0]?.day_number}`} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(days.length, 5)}, 1fr)` }}>
              {days.map((day) => (
                <TabsTrigger key={day.day_number} value={`day-${day.day_number}`}>
                  Giorno {day.day_number}
                </TabsTrigger>
              ))}
            </TabsList>

            {days.map((day) => (
              <TabsContent key={day.day_number} value={`day-${day.day_number}`} className="space-y-6 mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Giorno {day.day_number}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDay(day.day_number)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rimuovi giorno
                  </Button>
                </div>

                {/* Introduction */}
                <div className="space-y-2">
                  <Label htmlFor={`day-${day.day_number}-introduction`}>Introduzione (opzionale)</Label>
                  <Textarea
                    id={`day-${day.day_number}-introduction`}
                    placeholder="Aggiungi un'introduzione per questo giorno..."
                    value={day.introduction || ''}
                    onChange={(e) => handleUpdateDayIntroduction(day.day_number, e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Activities */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Attività</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddActivity(day.day_number)}
                      disabled={day.items.length >= 10}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi attività
                    </Button>
                  </div>

                  {day.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessuna attività aggiunta</p>
                  ) : (
                    <div className="space-y-2">
                      {day.items.map((item, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="flex-1">
                            <Input
                              placeholder={`Attività ${index + 1}`}
                              value={item.activity_text}
                              onChange={(e) => handleUpdateActivity(day.day_number, index, e.target.value)}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveActivity(day.day_number, index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}


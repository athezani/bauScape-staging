/**
 * Product Form Component
 * Form for creating/editing classes, experiences, and trips
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Image, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ProductType, PricingType, ProductFormData, PredefinedPrice, Product, ProductProgram } from '@/types/product.types';
import type { Provider } from '@/types/provider.types';
import { AvailabilityTab } from './AvailabilityTab';
import { ProgramTab } from './ProgramTab';
import { FAQSelector } from './FAQSelector';
import { ProductImagesUpload } from './ProductImagesUpload';
import { validateProductFormData, isValidUrl, sanitizeString } from '@/utils/validation';
import { PRODUCT_ATTRIBUTES, getAvailableAttributeKeys, type ProductAttributeKey } from '@/constants/productAttributes';
import { loadProductFAQs } from '@/services/product.service';

interface ProductFormProps {
  providers: Provider[];
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Product;
  isLoading?: boolean;
}

export function ProductForm({ 
  providers, 
  onSubmit, 
  onCancel, 
  initialData,
  isLoading = false 
}: ProductFormProps) {
  const { toast } = useToast();
  const [type, setType] = useState<ProductType>(initialData?.type || 'experience');
  const [providerId, setProviderId] = useState(initialData?.provider_id || '');
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [maxAdults, setMaxAdults] = useState(initialData?.max_adults || 10);
  const [maxDogs, setMaxDogs] = useState(initialData?.max_dogs || 999);
  const [pricingType, setPricingType] = useState<PricingType>(initialData?.pricing_type || 'linear');
  const [priceAdultBase, setPriceAdultBase] = useState<number | null>(initialData?.price_adult_base || null);
  const [priceDogBase, setPriceDogBase] = useState<number | null>(initialData?.price_dog_base || null);
  const [predefinedPrices, setPredefinedPrices] = useState<PredefinedPrice[]>(
    initialData?.predefined_prices || [{ adults: 1, dogs: 1, price: 0 }]
  );
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [highlights, setHighlights] = useState<string[]>(initialData?.highlights || []);
  const [newHighlight, setNewHighlight] = useState('');
  const [includedItems, setIncludedItems] = useState<string[]>(initialData?.included_items || []);
  const [newIncludedItem, setNewIncludedItem] = useState('');
  const [excludedItems, setExcludedItems] = useState<string[]>(initialData?.excluded_items || []);
  const [newExcludedItem, setNewExcludedItem] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState<string>(
    initialData?.cancellation_policy || 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.'
  );
  const [active, setActive] = useState<boolean>(
    initialData ? ((initialData as any).active !== undefined ? (initialData as any).active : true) : true
  );
  const [attributes, setAttributes] = useState<string[]>(() => {
    try {
      console.log('[ProductForm] Initializing attributes state');
      console.log('[ProductForm] initialData?.attributes:', initialData?.attributes);
      console.log('[ProductForm] initialData?.attributes type:', typeof initialData?.attributes, 'isArray:', Array.isArray(initialData?.attributes));
      
      if (initialData?.attributes && Array.isArray(initialData.attributes)) {
        // Validate that all attributes are valid keys
        const validKeys = getAvailableAttributeKeys();
        console.log('[ProductForm] Valid keys for initialization:', validKeys);
        
        const filtered = initialData.attributes.filter((attr): attr is string => {
          const isValid = typeof attr === 'string' && 
                         validKeys.includes(attr as ProductAttributeKey);
          
          if (!isValid) {
            console.warn('[ProductForm] Filtering out invalid initial attribute:', attr);
          }
          
          return isValid;
        });
        
        console.log('[ProductForm] Initialized attributes:', filtered);
        return filtered;
      }
      
      console.log('[ProductForm] No initial attributes, returning empty array');
      return [];
    } catch (error) {
      console.error('[ProductForm] Error initializing attributes:', error);
      console.error('[ProductForm] Error stack:', error instanceof Error ? error.stack : 'No stack');
      return [];
    }
  });

  // Helper function to safely update attributes - memoized with useCallback
  const updateAttributes = useCallback((updater: (prev: string[]) => string[]) => {
    setAttributes(prev => {
      try {
        // Ensure prev is always an array
        const safePrev = Array.isArray(prev) ? prev : [];
        const newAttributes = updater(safePrev);
        
        // Ensure result is an array
        if (!Array.isArray(newAttributes)) {
          return safePrev;
        }
        
        // Always filter to ensure only valid attributes and no null/undefined
        const validKeys = getAvailableAttributeKeys();
        const filtered = newAttributes
          .filter((attr): attr is string => {
            return attr !== null && 
                   attr !== undefined &&
                   typeof attr === 'string' && 
                   attr.length > 0 &&
                   Array.isArray(validKeys) &&
                   validKeys.includes(attr as ProductAttributeKey);
          });
        
        return filtered;
      } catch (error) {
        console.error('Error updating attributes:', error);
        // Return safe previous state
        return Array.isArray(prev) ? prev : [];
      }
    });
  }, []);
  
  // Class/Experience specific
  const [durationHours, setDurationHours] = useState<number | null>(
    initialData?.type === 'class' || initialData?.type === 'experience' 
      ? (initialData as { duration_hours: number | null }).duration_hours ?? null
      : null
  );
  const [fullDayStartTime, setFullDayStartTime] = useState<string>(
    initialData?.type === 'class' || initialData?.type === 'experience'
      ? (initialData as { full_day_start_time: string | null }).full_day_start_time || '09:00'
      : '09:00'
  );
  const [fullDayEndTime, setFullDayEndTime] = useState<string>(
    initialData?.type === 'class' || initialData?.type === 'experience'
      ? (initialData as { full_day_end_time: string | null }).full_day_end_time || '18:00'
      : '18:00'
  );
  const [meetingPoint, setMeetingPoint] = useState(
    initialData?.type === 'class' || initialData?.type === 'experience'
      ? (initialData as { meeting_point: string | null }).meeting_point || ''
      : ''
  );
  const [noAdults, setNoAdults] = useState<boolean>(
    initialData?.type === 'class' || initialData?.type === 'experience'
      ? (initialData as { no_adults?: boolean }).no_adults || false
      : false
  );
  const [meetingInfo, setMeetingInfo] = useState<{ text: string; google_maps_link: string }>(
    initialData?.meeting_info && typeof initialData.meeting_info === 'object' && initialData.meeting_info !== null
      ? {
          text: typeof (initialData.meeting_info as any).text === 'string' ? (initialData.meeting_info as any).text : '',
          google_maps_link: typeof (initialData.meeting_info as any).google_maps_link === 'string' ? (initialData.meeting_info as any).google_maps_link : '',
        }
      : { text: '', google_maps_link: '' }
  );
  const [showMeetingInfo, setShowMeetingInfo] = useState<boolean>(
    initialData?.show_meeting_info === true || initialData?.show_meeting_info === 1 || false
  );
  
  // Trip specific
  const [durationDays, setDurationDays] = useState(
    initialData?.type === 'trip' ? (initialData as { duration_days: number }).duration_days : 7
  );
  const [location, setLocation] = useState(
    initialData?.type === 'trip' ? (initialData as { location: string | null }).location || '' : ''
  );
  const [startDate, setStartDate] = useState(
    initialData?.type === 'trip' ? (initialData as { start_date: string | null }).start_date || '' : ''
  );
  // Per i trip: ogni prodotto ha un solo periodo predefinito (start_date + duration_days = end_date)
  
  // Program
  const [program, setProgram] = useState<ProductProgram | null>(null);
  const [faqs, setFaqs] = useState<Array<{ faq_id: string; order_index: number }>>([]);

  const isEditMode = !!initialData;

  // Load FAQs when editing existing product
  useEffect(() => {
    const loadFAQs = async () => {
      if (!initialData?.id || !initialData?.type) return;

      try {
        const loadedFAQs = await loadProductFAQs(initialData.id, initialData.type);
        setFaqs(loadedFAQs);
      } catch (error) {
        console.error('Error loading product FAQs:', error);
        // Don't show error toast, just log it
      }
    };

    if (initialData?.id && initialData?.type) {
      loadFAQs();
    }
  }, [initialData?.id, initialData?.type]);

  const handleAddPredefinedPrice = () => {
    setPredefinedPrices([...predefinedPrices, { adults: 1, dogs: 1, price: 0 }]);
  };

  const handleRemovePredefinedPrice = (index: number) => {
    setPredefinedPrices(predefinedPrices.filter((_, i) => i !== index));
  };

  const handlePredefinedPriceChange = (
    index: number, 
    field: keyof PredefinedPrice, 
    value: number
  ) => {
    const updated = [...predefinedPrices];
    updated[index] = { ...updated[index], [field]: value };
    setPredefinedPrices(updated);
  };

  const handleAddImage = () => {
    const trimmedUrl = newImageUrl.trim();
    if (!trimmedUrl) {
      toast({
        title: 'Errore',
        description: 'Inserisci un URL valido per l\'immagine',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate URL
    if (!isValidUrl(trimmedUrl)) {
      toast({
        title: 'Errore',
        description: 'URL immagine non valido. Deve iniziare con http:// o https://',
        variant: 'destructive',
      });
      return;
    }
    
    // Check for duplicates
    if (images.includes(trimmedUrl)) {
      toast({
        title: 'Attenzione',
        description: 'Questa immagine è già stata aggiunta',
        variant: 'default',
      });
      return;
    }
    
    // Limit to 20 images
    if (images.length >= 20) {
      toast({
        title: 'Limite raggiunto',
        description: 'Puoi aggiungere massimo 20 immagini',
        variant: 'destructive',
      });
      return;
    }
    
    setImages([...images, trimmedUrl]);
    setNewImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAddHighlight = () => {
    const trimmed = newHighlight.trim();
    if (!trimmed) {
      toast({
        title: 'Errore',
        description: 'Inserisci un testo per l\'highlight',
        variant: 'destructive',
      });
      return;
    }
    
    if (trimmed.length > 200) {
      toast({
        title: 'Errore',
        description: 'L\'highlight non può superare i 200 caratteri',
        variant: 'destructive',
      });
      return;
    }
    
    if (highlights.length >= 10) {
      toast({
        title: 'Limite raggiunto',
        description: 'Puoi aggiungere massimo 10 highlights',
        variant: 'destructive',
      });
      return;
    }
    
    // Check for duplicates
    if (highlights.includes(trimmed)) {
      toast({
        title: 'Attenzione',
        description: 'Questo highlight è già stato aggiunto',
        variant: 'default',
      });
      return;
    }
    
    const sanitized = sanitizeString(trimmed, 200);
    setHighlights([...highlights, sanitized]);
    setNewHighlight('');
  };

  const handleRemoveHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  const handleAddIncludedItem = () => {
    const trimmed = newIncludedItem.trim();
    if (!trimmed) {
      toast({
        title: 'Errore',
        description: 'Inserisci un testo per l\'elemento incluso',
        variant: 'destructive',
      });
      return;
    }
    
    if (trimmed.length > 200) {
      toast({
        title: 'Errore',
        description: 'L\'elemento incluso non può superare i 200 caratteri',
        variant: 'destructive',
      });
      return;
    }
    
    if (includedItems.length >= 10) {
      toast({
        title: 'Limite raggiunto',
        description: 'Puoi aggiungere massimo 10 elementi inclusi',
        variant: 'destructive',
      });
      return;
    }
    
    // Check for duplicates
    if (includedItems.includes(trimmed)) {
      toast({
        title: 'Attenzione',
        description: 'Questo elemento è già stato aggiunto',
        variant: 'default',
      });
      return;
    }
    
    const sanitized = sanitizeString(trimmed, 200);
    setIncludedItems([...includedItems, sanitized]);
    setNewIncludedItem('');
  };

  const handleRemoveIncludedItem = (index: number) => {
    setIncludedItems(includedItems.filter((_, i) => i !== index));
  };

  const handleAddExcludedItem = () => {
    const trimmed = newExcludedItem.trim();
    if (!trimmed) {
      toast({
        title: 'Errore',
        description: 'Inserisci un testo per l\'elemento non incluso',
        variant: 'destructive',
      });
      return;
    }
    
    if (trimmed.length > 200) {
      toast({
        title: 'Errore',
        description: 'L\'elemento non incluso non può superare i 200 caratteri',
        variant: 'destructive',
      });
      return;
    }
    
    if (excludedItems.length >= 10) {
      toast({
        title: 'Limite raggiunto',
        description: 'Puoi aggiungere massimo 10 elementi non inclusi',
        variant: 'destructive',
      });
      return;
    }
    
    // Check for duplicates
    if (excludedItems.includes(trimmed)) {
      toast({
        title: 'Attenzione',
        description: 'Questo elemento è già stato aggiunto',
        variant: 'default',
      });
      return;
    }
    
    const sanitized = sanitizeString(trimmed, 200);
    setExcludedItems([...excludedItems, sanitized]);
    setNewExcludedItem('');
  };

  const handleRemoveExcludedItem = (index: number) => {
    setExcludedItems(excludedItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data before submission
    const formData: ProductFormData = {
      type,
      provider_id: providerId,
      name,
      description,
      max_adults: maxAdults,
      max_dogs: maxDogs,
      pricing_type: pricingType,
      price_adult_base: pricingType === 'linear' ? priceAdultBase : null,
      price_dog_base: pricingType === 'linear' ? priceDogBase : null,
      predefined_prices: pricingType === 'predefined' 
        ? (predefinedPrices && predefinedPrices.length > 0 ? predefinedPrices : [])
        : [],
      images,
      highlights,
      included_items: includedItems,
      excluded_items: excludedItems,
      cancellation_policy: cancellationPolicy,
      attributes,
      meeting_info: meetingInfo.text.trim() || meetingInfo.google_maps_link.trim() 
        ? { text: meetingInfo.text, google_maps_link: meetingInfo.google_maps_link }
        : undefined,
      show_meeting_info: showMeetingInfo,
      program: program || undefined,
      faqs: faqs.length > 0 ? faqs : undefined,
    };
    
    // Client-side validation
    const validation = validateProductFormData(formData);
    
    if (!validation.valid) {
      toast({
        title: 'Errore di validazione',
        description: validation.errors.join('. '),
        variant: 'destructive',
      });
      return;
    }
    
    // Additional checks
    if (!providerId) {
      toast({
        title: 'Errore',
        description: 'Seleziona un provider',
        variant: 'destructive',
      });
      return;
    }
    
    if (!name || name.trim().length < 3) {
      toast({
        title: 'Errore',
        description: 'Il nome del prodotto deve contenere almeno 3 caratteri',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate pricing based on no_adults
    if (pricingType === 'linear') {
      if (noAdults && (type === 'class' || type === 'experience')) {
        // If no_adults is true, price_dog_base is required
        if (!priceDogBase || priceDogBase < 0) {
          toast({
            title: 'Errore',
            description: 'Il prezzo base cane è obbligatorio quando "No adulti" è selezionato',
            variant: 'destructive',
          });
          return;
        }
      } else {
        // Normal validation: price_adult_base is required
        if (!priceAdultBase || priceAdultBase < 0) {
          toast({
            title: 'Errore',
            description: 'Il prezzo base adulto deve essere maggiore o uguale a 0',
            variant: 'destructive',
          });
          return;
        }
      }
    }
    
    if (pricingType === 'predefined' && (!predefinedPrices || predefinedPrices.length === 0)) {
      toast({
        title: 'Errore',
        description: 'Aggiungi almeno una configurazione di prezzo predefinito',
        variant: 'destructive',
      });
      return;
    }
    
    if (!cancellationPolicy || cancellationPolicy.trim().length < 10) {
      toast({
        title: 'Errore',
        description: 'La policy di cancellazione deve contenere almeno 10 caratteri',
        variant: 'destructive',
      });
      return;
    }
    
    // Type-specific validation
    // Duration is now optional - it will be calculated automatically from slots
    // No validation needed for durationHours
    
    if (type === 'trip') {
      if (!durationDays || durationDays < 1) {
        toast({
          title: 'Errore',
          description: 'La durata in giorni deve essere almeno 1',
          variant: 'destructive',
        });
        return;
      }
      
      if (!startDate) {
        toast({
          title: 'Errore',
          description: 'La data di inizio è obbligatoria per i viaggi',
          variant: 'destructive',
        });
        return;
      }
      
      // Validate date is not in the past
      const start = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (start < today) {
        toast({
          title: 'Errore',
          description: 'La data di inizio non può essere nel passato',
          variant: 'destructive',
        });
        return;
      }
    }

    if (type === 'class' || type === 'experience') {
      // Duration is optional - will be calculated from slots automatically
      formData.duration_hours = durationHours ?? undefined;
      formData.full_day_start_time = fullDayStartTime || undefined;
      formData.full_day_end_time = fullDayEndTime || undefined;
      formData.meeting_point = meetingPoint;
      formData.no_adults = noAdults;
      
      // If no_adults is true, set price_adult_base to 0
      if (noAdults && pricingType === 'linear') {
        formData.price_adult_base = 0;
      }
    } else {
      // Per i trip: ogni prodotto ha un solo periodo predefinito
      formData.duration_days = durationDays;
      formData.location = location;
      formData.start_date = startDate || undefined;
      // Calcola end_date da start_date + duration_days
      if (startDate && durationDays > 0) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + durationDays - 1);
        formData.end_date = end.toISOString().split('T')[0];
      }
    }

    // Add active field to formData (will be saved separately after product creation)
    (formData as any).active = active;

    await onSubmit(formData);
  };

  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="info">Informazioni</TabsTrigger>
        <TabsTrigger value="photos" disabled={!isEditMode && !initialData?.id}>
          Upload Foto
        </TabsTrigger>
        <TabsTrigger value="program">Programma</TabsTrigger>
        <TabsTrigger value="faq">FAQ</TabsTrigger>
        <TabsTrigger value="availability" disabled={!isEditMode && !initialData?.id}>
          Disponibilità
        </TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <form onSubmit={handleSubmit} className="space-y-6">
      {/* Active Toggle - First Field */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label>Prodotto Attivo</Label>
          <p className="text-sm text-muted-foreground">
            Se disattivato, il prodotto non sarà visibile sul sito e-commerce
          </p>
        </div>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-5 w-5"
        />
      </div>

      {/* Product Type */}
      {!isEditMode && (
        <div className="space-y-2">
          <Label htmlFor="type">Tipo Prodotto <span className="text-red-500">*</span></Label>
          <Select value={type} onValueChange={(v) => setType(v as ProductType)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="class">Classe</SelectItem>
              <SelectItem value="experience">Esperienza</SelectItem>
              <SelectItem value="trip">Viaggio</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Provider Selection */}
      <div className="space-y-2">
        <Label htmlFor="provider">Provider <span className="text-red-500">*</span></Label>
        {providers.filter(p => p.active).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun provider attivo disponibile</p>
        ) : (
          <Select value={providerId || undefined} onValueChange={setProviderId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona provider" />
            </SelectTrigger>
            <SelectContent>
              {providers.filter(p => p.active).map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome del prodotto"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxAdults">Max Adulti <span className="text-red-500">*</span></Label>
            <Input
              id="maxAdults"
              type="number"
              min={1}
              value={maxAdults}
              onChange={(e) => setMaxAdults(parseInt(e.target.value) || 1)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxDogs">Max Cani <span className="text-red-500">*</span></Label>
            <Input
              id="maxDogs"
              type="number"
              min={0}
              value={maxDogs}
              onChange={(e) => setMaxDogs(parseInt(e.target.value) || 0)}
              required
            />
          </div>
        </div>
        
        {/* No Adults Option - Only for classes and experiences */}
        {(type === 'class' || type === 'experience') && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="noAdults"
              checked={noAdults}
              onCheckedChange={(checked) => {
                setNoAdults(checked === true);
                // When no_adults is checked, set price_adult_base to 0
                if (checked === true && pricingType === 'linear') {
                  setPriceAdultBase(0);
                }
              }}
            />
            <Label 
              htmlFor="noAdults" 
              className="text-sm font-normal cursor-pointer"
            >
              No adulti (solo cani)
            </Label>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrizione</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrizione del prodotto"
          rows={3}
        />
      </div>

      {/* Type-specific fields */}
          {(type === 'class' || type === 'experience') && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Durata automatica:</strong> La durata viene calcolata automaticamente dagli slot di disponibilità che imposti. 
                Se non ci sono slot con orari specifici, puoi impostare un orario di inizio e fine per la giornata intera.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="fullDayStartTime">Orario Inizio (giornata intera)</Label>
                <Input
                  id="fullDayStartTime"
                  type="time"
                  value={fullDayStartTime}
                  onChange={(e) => setFullDayStartTime(e.target.value)}
                />
                <p className="text-xs text-gray-500">Usato quando non ci sono slot con orari specifici</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullDayEndTime">Orario Fine (giornata intera)</Label>
                <Input
                  id="fullDayEndTime"
                  type="time"
                  value={fullDayEndTime}
                  onChange={(e) => setFullDayEndTime(e.target.value)}
                />
                <p className="text-xs text-gray-500">Usato quando non ci sono slot con orari specifici</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="durationHours">Durata (ore) - Opzionale</Label>
                <Input
                  id="durationHours"
                  type="number"
                  min={0}
                  step="0.1"
                  value={durationHours ?? ''}
                  onChange={(e) => setDurationHours(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Calcolata automaticamente"
                />
                <p className="text-xs text-gray-500">Solo se vuoi sovrascrivere il calcolo automatico</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meetingPoint">Punto d'Incontro</Label>
                <Input
                  id="meetingPoint"
                  value={meetingPoint}
                  onChange={(e) => setMeetingPoint(e.target.value)}
                  placeholder="Indirizzo o luogo"
                />
              </div>
            </div>
          </>
      )}

      {type === 'trip' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="durationDays">Durata (giorni) <span className="text-red-500">*</span></Label>
              <Input
                id="durationDays"
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Località</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Località del viaggio"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inizio <span className="text-red-500">*</span></Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Fine (calcolata automaticamente)</Label>
              <Input
                id="endDate"
                type="date"
                value={
                  startDate && durationDays > 0
                    ? new Date(new Date(startDate).setDate(new Date(startDate).getDate() + durationDays - 1)).toISOString().split('T')[0]
                    : ''
                }
                readOnly
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                La data fine viene calcolata automaticamente dalla data di inizio + durata
              </p>
            </div>
          </div>
        </>
      )}

      {/* Meeting Info - Available for all product types */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Orario e Punto di Incontro</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Informazioni su orario e punto di incontro con link a Google Maps (opzionale)
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showMeetingInfo"
                checked={showMeetingInfo}
                onCheckedChange={(checked) => setShowMeetingInfo(checked === true)}
              />
              <Label htmlFor="showMeetingInfo" className="cursor-pointer">
                Mostra in pagina prodotto
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meetingInfoText">Testo (orario e punto di incontro)</Label>
            <Textarea
              id="meetingInfoText"
              value={meetingInfo.text}
              onChange={(e) => setMeetingInfo({ ...meetingInfo, text: e.target.value })}
              placeholder="Es: Ritrovo alle 9:00 presso il parcheggio del rifugio"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meetingInfoLink">Link Google Maps</Label>
            <Input
              id="meetingInfoLink"
              value={meetingInfo.google_maps_link}
              onChange={(e) => setMeetingInfo({ ...meetingInfo, google_maps_link: e.target.value })}
              placeholder="https://maps.google.com/..."
              type="url"
            />
            <p className="text-sm text-muted-foreground">
              Inserisci il link completo di Google Maps al punto di incontro
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Image className="h-5 w-5" />
            Immagini
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new image */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://esempio.com/immagine.jpg"
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddImage();
                  }
                }}
              />
            </div>
            <Button type="button" variant="outline" onClick={handleAddImage}>
              <Plus className="h-4 w-4 mr-1" />
              Aggiungi
            </Button>
          </div>

          {/* Image list */}
          {images.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {images.map((url, index) => (
                <div 
                  key={index} 
                  className="relative group rounded-lg border border-border overflow-hidden bg-muted"
                >
                  <img
                    src={url}
                    alt={`Immagine ${index + 1}`}
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23ddd" width="100" height="100"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="12">Errore</text></svg>';
                    }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground p-2 truncate">{url}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessuna immagine aggiunta
            </p>
          )}
        </CardContent>
      </Card>

      {/* Highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cosa Rende Speciale Questa Esperienza</CardTitle>
          <p className="text-sm text-muted-foreground">
            Aggiungi fino a 10 elementi che rendono speciale questo prodotto (opzionale)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newHighlight}
              onChange={(e) => setNewHighlight(e.target.value)}
              placeholder="Es: Struttura 100% dog-friendly"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddHighlight();
                }
              }}
              disabled={highlights.length >= 10}
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleAddHighlight}
              disabled={!newHighlight.trim() || highlights.length >= 10}
            >
              <Plus className="h-4 w-4 mr-1" />
              Aggiungi
            </Button>
          </div>
          {highlights.length > 0 && (
            <div className="space-y-2">
              {highlights.map((highlight, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                  <span className="flex-1 text-sm">{highlight}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveHighlight(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {highlights.length >= 10 && (
            <p className="text-sm text-muted-foreground">
              Limite massimo di 10 elementi raggiunto
            </p>
          )}
        </CardContent>
      </Card>

      {/* Included Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cosa è Incluso</CardTitle>
          <p className="text-sm text-muted-foreground">
            Aggiungi fino a 10 elementi inclusi nel prodotto (opzionale)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newIncludedItem}
              onChange={(e) => setNewIncludedItem(e.target.value)}
              placeholder="Es: Pernottamento in camera doppia"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddIncludedItem();
                }
              }}
              disabled={includedItems.length >= 10}
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleAddIncludedItem}
              disabled={!newIncludedItem.trim() || includedItems.length >= 10}
            >
              <Plus className="h-4 w-4 mr-1" />
              Aggiungi
            </Button>
          </div>
          {includedItems.length > 0 && (
            <div className="space-y-2">
              {includedItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                  <span className="flex-1 text-sm">{item}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveIncludedItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {includedItems.length >= 10 && (
            <p className="text-sm text-muted-foreground">
              Limite massimo di 10 elementi raggiunto
            </p>
          )}
        </CardContent>
      </Card>

      {/* Excluded Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cosa non è Incluso</CardTitle>
          <p className="text-sm text-muted-foreground">
            Aggiungi fino a 10 elementi non inclusi nel prodotto (opzionale)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newExcludedItem}
              onChange={(e) => setNewExcludedItem(e.target.value)}
              placeholder="Es: Trasporto da/per l'aeroporto"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddExcludedItem();
                }
              }}
              disabled={excludedItems.length >= 10}
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleAddExcludedItem}
              disabled={!newExcludedItem.trim() || excludedItems.length >= 10}
            >
              <Plus className="h-4 w-4 mr-1" />
              Aggiungi
            </Button>
          </div>
          {excludedItems.length > 0 && (
            <div className="space-y-2">
              {excludedItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                  <span className="flex-1 text-sm">{item}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveExcludedItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {excludedItems.length >= 10 && (
            <p className="text-sm text-muted-foreground">
              Limite massimo di 10 elementi raggiunto
            </p>
          )}
        </CardContent>
      </Card>

      {/* Product Attributes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attributi Prodotto</CardTitle>
          <p className="text-sm text-muted-foreground">
            Seleziona gli attributi che descrivono questo prodotto (opzionale). Questi attributi verranno utilizzati per la ricerca e il filtraggio.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(() => {
              try {
                const availableKeys = getAvailableAttributeKeys();
                
                if (!Array.isArray(availableKeys) || availableKeys.length === 0) {
                  return [];
                }
                
                // Filter to get only valid keys with complete info BEFORE mapping
                const validKeys = availableKeys.filter((attrKey): attrKey is ProductAttributeKey => {
                  const attrInfo = PRODUCT_ATTRIBUTES[attrKey];
                  return !!attrInfo && !!attrInfo.emoji && !!attrInfo.label;
                });
                
                if (validKeys.length === 0) {
                  return [];
                }
                
                // Map only valid keys - no null possible since we filtered above
                const elements = validKeys.map((attrKey) => {
                  const attrInfo = PRODUCT_ATTRIBUTES[attrKey];
                  
                  // Double check - should never be null due to filter above
                  if (!attrInfo || !attrInfo.emoji || !attrInfo.label) {
                    // Skip this item by returning a placeholder that we'll filter out
                    return undefined;
                  }
                  
                  const isSelected = Array.isArray(attributes) && attributes.includes(attrKey);
                  
                  return (
                    <div
                      key={attrKey}
                      className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    >
                      <Checkbox
                        id={`attr-${attrKey}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          try {
                            if (checked) {
                              updateAttributes(prev => {
                                if (prev.includes(attrKey)) return prev;
                                return [...prev, attrKey];
                              });
                            } else {
                              updateAttributes(prev => prev.filter(a => a !== attrKey));
                            }
                          } catch (error) {
                            console.error('Error updating attributes:', error);
                            toast({
                              title: 'Errore',
                              description: 'Errore durante la selezione degli attributi',
                              variant: 'destructive',
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={`attr-${attrKey}`}
                        className="flex items-center gap-2 text-sm font-medium cursor-pointer flex-1"
                      >
                        <span className="text-lg">{attrInfo.emoji}</span>
                        <span>{attrInfo.label}</span>
                      </label>
                    </div>
                  );
                });
                
                // Filter out any undefined values and return only valid JSX elements
                const validElements = elements.filter((el): el is JSX.Element => el !== undefined && el !== null);
                return validElements.length > 0 ? validElements : [];
              } catch (error) {
                console.error('Error rendering attributes:', error);
                return [];
              }
            })()}
          </div>
          {Array.isArray(attributes) && attributes.length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Attributi selezionati:</p>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  try {
                    const validKeys = getAvailableAttributeKeys();
                    if (!Array.isArray(validKeys)) {
                      return [];
                    }
                    
                    const validAttributes = attributes.filter((attrKey): attrKey is ProductAttributeKey => {
                      return typeof attrKey === 'string' && 
                             validKeys.includes(attrKey as ProductAttributeKey);
                    });
                    
                    if (validAttributes.length === 0) {
                      return [];
                    }
                    
                    // Filter out invalid attributes BEFORE mapping to avoid null in array
                    const fullyValidAttributes = validAttributes.filter((attrKey): attrKey is ProductAttributeKey => {
                      const attrInfo = PRODUCT_ATTRIBUTES[attrKey];
                      return !!attrInfo && !!attrInfo.emoji && !!attrInfo.label;
                    });
                    
                    if (fullyValidAttributes.length === 0) {
                      return [];
                    }
                    
                    // Map to JSX elements - no null values possible now since we filtered above
                    const elements = fullyValidAttributes.map((attrKey) => {
                      const attrInfo = PRODUCT_ATTRIBUTES[attrKey];
                      // This should never be null due to filter above
                      if (!attrInfo || !attrInfo.emoji || !attrInfo.label) {
                        return undefined;
                      }
                      
                      return (
                        <div
                          key={attrKey}
                          className="inline-flex items-center gap-1.5 px-2 py-1 bg-background border rounded-md text-sm"
                        >
                          <span>{attrInfo.emoji}</span>
                          <span>{attrInfo.label}</span>
                        </div>
                      );
                    });
                    
                    // Filter out any undefined values and return only valid JSX elements
                    const validElements = elements.filter((el): el is JSX.Element => el !== undefined && el !== null);
                    return validElements.length > 0 ? validElements : [];
                  } catch (error) {
                    console.error('Error rendering selected attributes:', error);
                    return [];
                  }
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancellation Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Policy di Cancellazione <span className="text-red-500">*</span></CardTitle>
          <p className="text-sm text-muted-foreground">
            Definisci la policy di cancellazione per questo prodotto
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={cancellationPolicy}
            onChange={(e) => setCancellationPolicy(e.target.value)}
            placeholder="Es: Cancellazione gratuita fino a 7 giorni prima della data prenotata."
            rows={4}
            required
          />
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prezzi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo Prezzo</Label>
            <Select value={pricingType} onValueChange={(v) => setPricingType(v as PricingType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Lineare (per adulto/cane)</SelectItem>
                <SelectItem value="predefined">Predefinito (configurazioni fisse)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {pricingType === 'linear' && (
            <div className={`grid gap-4 ${noAdults && (type === 'class' || type === 'experience') ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
              {/* Hide price adult input if no_adults is true */}
              {!(noAdults && (type === 'class' || type === 'experience')) && (
                <div className="space-y-2">
                  <Label htmlFor="priceAdult">Prezzo Base Adulto (€)</Label>
                  <Input
                    id="priceAdult"
                    type="number"
                    min={0}
                    step={0.01}
                    value={priceAdultBase ?? ''}
                    onChange={(e) => setPriceAdultBase(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.00"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="priceDog">
                  Prezzo Base Cane (€)
                  {noAdults && (type === 'class' || type === 'experience') && (
                    <span className="text-red-500"> *</span>
                  )}
                </Label>
                <Input
                  id="priceDog"
                  type="number"
                  min={0}
                  step={0.01}
                  value={priceDogBase ?? ''}
                  onChange={(e) => setPriceDogBase(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {pricingType === 'predefined' && (
            <div className="space-y-3">
              {predefinedPrices.map((price, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Adulti</Label>
                    <Input
                      type="number"
                      min={0}
                      value={price.adults}
                      onChange={(e) => handlePredefinedPriceChange(index, 'adults', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Cani</Label>
                    <Input
                      type="number"
                      min={0}
                      value={price.dogs}
                      onChange={(e) => handlePredefinedPriceChange(index, 'dogs', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Prezzo (€)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={price.price}
                      onChange={(e) => handlePredefinedPriceChange(index, 'price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  {predefinedPrices.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePredefinedPrice(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPredefinedPrice}
              >
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi Configurazione
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annulla
        </Button>
        <Button 
          type="submit" 
          disabled={
            isLoading || 
            !providerId || 
            !name || 
            (pricingType === 'predefined' && (!predefinedPrices || predefinedPrices.length === 0))
          }
        >
          {isLoading ? 'Salvataggio...' : isEditMode ? 'Aggiorna' : 'Crea Prodotto'}
        </Button>
      </div>
    </form>
      </TabsContent>

      <TabsContent value="photos">
        <ProductImagesUpload
          productId={initialData?.id || null}
          productType={initialData?.type || type}
          isEditMode={isEditMode}
        />
      </TabsContent>

      <TabsContent value="program">
        <ProgramTab
          productId={initialData?.id}
          productType={initialData?.type || type}
          durationDays={type === 'trip' ? durationDays : undefined}
          program={program}
          onProgramChange={setProgram}
        />
      </TabsContent>

      <TabsContent value="faq">
        <FAQSelector
          productId={initialData?.id}
          productType={initialData?.type || type}
          selectedFAQs={faqs}
          onFAQsChange={setFaqs}
        />
      </TabsContent>

      <TabsContent value="availability">
        <AvailabilityTab
          productId={initialData?.id || null}
          productType={initialData?.type || type}
        />
      </TabsContent>
    </Tabs>
  );
}

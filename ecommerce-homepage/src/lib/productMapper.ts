import type { Product, ProductRow, ProductType } from '../types/product';
import { typeToCategory } from '../types/product';

type PredefinedPriceMeta = {
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
};

// Immagini locali con cani - tutte le immagini WebP ottimizzate da /public/images/webp/
// Usa formato WebP per performance ottimali (Next.js Image può ancora ottimizzare ulteriormente)
// Usa tutte le immagini disponibili per massima varietà
const ALL_DOG_IMAGES = [
  // Immagini WebP ottimizzate - nomi senza spazi/parentesi per evitare errori 400
  '/images/webp/Lago_2_.webp',
  '/images/webp/Mare_1_.webp',
  '/images/webp/Montagna_1_.webp',
  '/images/webp/Parco_1_.webp',
  // Immagini con cani reali in WebP
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

// Immagini locali per Esperienze - attività all'aperto con cani
// Usa tutte le immagini disponibili con cani
const EXPERIENCE_IMAGES = ALL_DOG_IMAGES.length > 0 
  ? ALL_DOG_IMAGES 
  : ['/images/attributes/mare.webp']; // Fallback se nessuna immagine disponibile

// Immagini locali per Classi - addestramento e attività educative
// Usa tutte le immagini disponibili con cani
const CLASS_IMAGES = ALL_DOG_IMAGES.length > 0 
  ? ALL_DOG_IMAGES 
  : ['/images/attributes/parco.webp']; // Fallback se nessuna immagine disponibile

// Immagini locali per Viaggi - destinazioni e avventure
// Usa tutte le immagini disponibili con cani
const TRIP_IMAGES = ALL_DOG_IMAGES.length > 0 
  ? ALL_DOG_IMAGES 
  : ['/images/attributes/mare.webp']; // Fallback se nessuna immagine disponibile

// Immagine di fallback locale - tutte sono WebP ora
const DEFAULT_PLACEHOLDER = ALL_DOG_IMAGES[0] || '/images/webp/Mare_1_.webp';

/**
 * Seleziona un'immagine locale coerente basata sul tipo di prodotto e sul contenuto
 * Ogni prodotto otterrà sempre la stessa immagine basata su ID, tipo e titolo
 * 
 * NOTA: Tutte le immagini sono locali da /public/images/attributes/
 * Non vengono più usati link esterni per garantire performance e controllo
 */
function getProductImage(
  id: string,
  type: ProductType,
  title?: string | null,
  description?: string | null
): string {
  // Determina quale array di immagini usare in base al tipo
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

  // Crea un hash stabile basato su ID, tipo e titolo per selezionare sempre la stessa immagine
  // Questo garantisce che ogni prodotto abbia un'immagine coerente e diversa dagli altri
  const hashString = `${id}-${type}-${title || ''}`;
  const hash = hashString
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const index = hash % imagePool.length;
  return imagePool[index] ?? DEFAULT_PLACEHOLDER;
}

export function mapRowToProduct(row: ProductRow, type: ProductType): Product {
  const meta = (row.predefined_prices ?? {}) as PredefinedPriceMeta;

  // Get image from images array first, then from predefined_prices meta, then product-specific placeholder
  // La priorità è: immagini personalizzate > meta imageUrl > immagine coerente con il tipo di prodotto
  // IMPORTANTE: Se l'immagine è un URL esterno (http/https), viene sostituita con placeholder locale
  let imageUrl = getProductImage(row.id, type, row.name, row.description);
  if (row.images && Array.isArray(row.images) && row.images.length > 0) {
    const firstImage = row.images[0];
    // Se è un URL esterno, usa placeholder locale invece
    if (typeof firstImage === 'string' && (firstImage.startsWith('http://') || firstImage.startsWith('https://'))) {
      imageUrl = getProductImage(row.id, type, row.name, row.description);
    } else {
      imageUrl = firstImage;
    }
  } else if (typeof meta.imageUrl === 'string' && meta.imageUrl.length > 0) {
    // Se è un URL esterno, usa placeholder locale invece
    if (meta.imageUrl.startsWith('http://') || meta.imageUrl.startsWith('https://')) {
      imageUrl = getProductImage(row.id, type, row.name, row.description);
    } else {
      imageUrl = meta.imageUrl;
    }
  }

  const baseProduct: Product = {
    id: row.id,
    type,
    title: row.name,
    description: row.description ?? undefined,
    price: row.price_adult_base ?? 0, // Legacy field (for backward compatibility)
    priceDogBase: row.price_dog_base ?? undefined, // Legacy field (for backward compatibility)
    pricingType: row.pricing_type ?? undefined,
    // New pricing model fields
    pricingModel: row.pricing_model === 'percentage' || row.pricing_model === 'markup' ? row.pricing_model : undefined,
    marginPercentage: row.margin_percentage ?? undefined,
    markupAdult: row.markup_adult ?? undefined,
    markupDog: row.markup_dog ?? undefined,
    providerCostAdultBase: row.provider_cost_adult_base ?? undefined,
    providerCostDogBase: row.provider_cost_dog_base ?? undefined,
    maxAdults: row.max_adults ?? undefined,
    maxDogs: row.max_dogs ?? undefined,
    providerId: row.provider_id ?? undefined,
    category: typeToCategory(type) as 'Esperienza' | 'Classe' | 'Viaggio', // Add Figma category field
    imageUrl,
    highlights: row.highlights && Array.isArray(row.highlights) ? row.highlights : undefined,
    includedItems: row.included_items && Array.isArray(row.included_items) ? row.included_items : undefined,
    excludedItems: row.excluded_items && Array.isArray(row.excluded_items) ? row.excluded_items : undefined,
    cancellationPolicy: row.cancellation_policy ?? undefined,
    meetingInfo: row.meeting_info && typeof row.meeting_info === 'object' && row.meeting_info !== null
      ? {
          text: typeof (row.meeting_info as any).text === 'string' ? (row.meeting_info as any).text : '',
          googleMapsLink: typeof (row.meeting_info as any).google_maps_link === 'string' ? (row.meeting_info as any).google_maps_link : '',
        }
      : undefined,
    showMeetingInfo: row.show_meeting_info === true || (typeof row.show_meeting_info === 'number' && row.show_meeting_info === 1),
    // Map attributes from JSONB array to string array
    attributes: row.attributes && Array.isArray(row.attributes) 
      ? row.attributes.filter((attr): attr is string => typeof attr === 'string')
      : undefined,
    rating:
      typeof meta.rating === 'number' ? Number(meta.rating.toFixed(1)) : undefined,
    reviewCount:
      typeof meta.reviewCount === 'number' ? Math.round(meta.reviewCount) : undefined,
    createdAt: row.created_at ?? undefined,
  };

  // Handle trip-specific fields
  if (type === 'trip') {
    baseProduct.location = row.location ?? 'Location disponibile al momento della prenotazione';
    baseProduct.durationDays = row.duration_days ?? undefined;
    baseProduct.startDate = row.start_date ?? undefined;
    baseProduct.endDate = row.end_date ?? undefined;
    baseProduct.bookingQty = row.booking_qty ?? undefined;
  } else {
    // For experiences and classes
    baseProduct.location = row.meeting_point ?? 'Location disponibile al momento della prenotazione';
    baseProduct.durationHours = row.duration_hours ?? undefined;
    baseProduct.meetingPoint = row.meeting_point ?? undefined;
    // Map no_adults: handle boolean, null, undefined, and numeric values (PostgreSQL boolean can be 1/0)
    const rawNoAdults = row.no_adults;
    baseProduct.noAdults = rawNoAdults === true || 
      (typeof rawNoAdults === 'number' && rawNoAdults === 1) || 
      (typeof rawNoAdults === 'string' && (rawNoAdults === 'true' || rawNoAdults === '1'));
  }

  return baseProduct;
}

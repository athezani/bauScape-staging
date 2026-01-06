#!/usr/bin/env tsx

/**
 * Crea 5 esperienze e 5 viaggi placeholder in staging
 * Tutti i campi compilati + disponibilità da marzo 2026
 */

import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://ilbbviadwedumvvwqqon.supabase.co';
const STAGING_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYzODg2MywiZXhwIjoyMDgzMjE0ODYzfQ.8OsjS-5UsrWbh7Uo5btg0uDtFRMO2AgxXBJfjF9iSS8';

const supabase = createClient(STAGING_URL, STAGING_SERVICE_KEY);

// Provider ID placeholder (dovrai sostituirlo con un provider reale)
const PROVIDER_ID = '00000000-0000-0000-0000-000000000000'; // Placeholder, da aggiornare

// Funzioni rimosse - ora uso getExperienceData e getTripData
async function createExperiences_DEPRECATED() {
  console.log('📝 Creando 5 esperienze placeholder...\n');

  const experiences = [
    {
      provider_id: PROVIDER_ID,
      name: 'Esperienza Cani e Padroni - Escursione Montagna',
      description: 'Un\'escursione guidata in montagna per te e il tuo cane. Scopri sentieri panoramici, natura incontaminata e momenti di relax insieme al tuo amico a quattro zampe.',
      duration_hours: 4,
      meeting_point: 'Parcheggio Rifugio Monte Bianco, Via delle Alpi 123',
      pricing_type: 'fixed',
      price_adult_base: 45.00,
      price_dog_base: 15.00,
      predefined_prices: {},
      images: ['https://images.unsplash.com/photo-1551632811-561732d1e306?w=800'],
      active: true,
      cutoff_hours: 24,
      full_day_start_time: '09:00',
      full_day_end_time: '17:00',
      max_adults: 10,
      max_dogs: 15,
      highlights: [
        'Escursione guidata in montagna',
        'Panorami mozzafiato',
        'Pranzo al sacco incluso',
        'Guida esperta certificata',
        'Assicurazione inclusa'
      ],
      included_items: [
        'Guida esperta',
        'Pranzo al sacco',
        'Assicurazione',
        'Materiale di sicurezza',
        'Foto ricordo'
      ],
      cancellation_policy: 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.',
      no_adults: false,
      pricing_model: 'percentage',
      margin_percentage: 20,
      provider_cost_adult_base: 36.00,
      provider_cost_dog_base: 12.00,
      attributes: [
        { name: 'Difficoltà', value: 'Media' },
        { name: 'Dislivello', value: '500m' },
        { name: 'Lunghezza', value: '8km' }
      ],
      excluded_items: ['Trasporto', 'Attrezzatura personale'],
      meeting_info: {
        address: 'Parcheggio Rifugio Monte Bianco',
        coordinates: { lat: 45.8326, lng: 6.8652 },
        notes: 'Parcheggio gratuito disponibile'
      },
      show_meeting_info: true
    },
    {
      provider_id: PROVIDER_ID,
      name: 'Giornata al Lago con il Cane',
      description: 'Una giornata rilassante al lago dedicata a te e al tuo cane. Nuoto, giochi, relax e momenti di condivisione in un ambiente naturale e sicuro.',
      duration_hours: 6,
      meeting_point: 'Lago di Bracciano, Spiaggia Cani',
      pricing_type: 'fixed',
      price_adult_base: 35.00,
      price_dog_base: 10.00,
      predefined_prices: {},
      images: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800'],
      active: true,
      cutoff_hours: 48,
      full_day_start_time: '10:00',
      full_day_end_time: '16:00',
      max_adults: 15,
      max_dogs: 20,
      highlights: [
        'Accesso spiaggia per cani',
        'Area giochi attrezzata',
        'Ombrelloni e sdraio',
        'Snack e bevande',
        'Docce e servizi'
      ],
      included_items: [
        'Accesso spiaggia',
        'Ombrellone e sdraio',
        'Snack per cani',
        'Bevande',
        'Docce'
      ],
      cancellation_policy: 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.',
      no_adults: false,
      pricing_model: 'percentage',
      margin_percentage: 25,
      provider_cost_adult_base: 28.00,
      provider_cost_dog_base: 7.50,
      attributes: [
        { name: 'Tipo', value: 'Relax' },
        { name: 'Accesso', value: 'Spiaggia attrezzata' }
      ],
      excluded_items: ['Pranzo completo', 'Trasporto'],
      meeting_info: {
        address: 'Lago di Bracciano, Spiaggia Cani',
        coordinates: { lat: 42.1025, lng: 12.1753 },
        notes: 'Parcheggio a 200m dalla spiaggia'
      },
      show_meeting_info: true
    },
    {
      provider_id: PROVIDER_ID,
      name: 'Tour Fotografico Urbano con Cane',
      description: 'Scopri la città attraverso gli occhi del tuo cane. Un tour fotografico guidato nei luoghi più pet-friendly della città, con sessioni fotografiche professionali.',
      duration_hours: 3,
      meeting_point: 'Piazza del Duomo, Milano',
      pricing_type: 'fixed',
      price_adult_base: 55.00,
      price_dog_base: 0,
      predefined_prices: {},
      images: ['https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800'],
      active: true,
      cutoff_hours: 12,
      full_day_start_time: '14:00',
      full_day_end_time: '17:00',
      max_adults: 8,
      max_dogs: 8,
      highlights: [
        'Fotografo professionista',
        'Tour guidato pet-friendly',
        'Foto digitali incluse',
        'Luoghi iconici',
        'Album digitale'
      ],
      included_items: [
        'Fotografo professionista',
        'Tour guidato',
        'Foto digitali (min 20)',
        'Album digitale',
        'Guida esperta'
      ],
      cancellation_policy: 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.',
      no_adults: false,
      pricing_model: 'markup',
      markup_adult: 15.00,
      markup_dog: 0,
      provider_cost_adult_base: 40.00,
      provider_cost_dog_base: 0,
      attributes: [
        { name: 'Durata', value: '3 ore' },
        { name: 'Foto', value: 'Min 20 digitali' }
      ],
      excluded_items: ['Stampa foto', 'Trasporto'],
      meeting_info: {
        address: 'Piazza del Duomo, Milano',
        coordinates: { lat: 45.4642, lng: 9.1900 },
        notes: 'Ritrovo davanti alla Cattedrale'
      },
      show_meeting_info: true
    },
    {
      provider_id: PROVIDER_ID,
      name: 'Agility e Training Avanzato',
      description: 'Sessione di agility e training avanzato per cani di tutte le età. Migliora l\'obbedienza, l\'agilità e il legame con il tuo cane in un ambiente professionale.',
      duration_hours: 2,
      meeting_point: 'Centro Cinofilo Dog Training, Via dello Sport 45',
      pricing_type: 'fixed',
      price_adult_base: 40.00,
      price_dog_base: 0,
      predefined_prices: {},
      images: ['https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800'],
      active: true,
      cutoff_hours: 24,
      full_day_start_time: '10:00',
      full_day_end_time: '12:00',
      max_adults: 6,
      max_dogs: 6,
      highlights: [
        'Istruttore certificato',
        'Attrezzatura professionale',
        'Training personalizzato',
        'Consigli personalizzati',
        'Certificato partecipazione'
      ],
      included_items: [
        'Istruttore certificato',
        'Uso attrezzatura',
        'Materiale didattico',
        'Consulenza personalizzata',
        'Certificato'
      ],
      cancellation_policy: 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.',
      no_adults: false,
      pricing_model: 'percentage',
      margin_percentage: 30,
      provider_cost_adult_base: 28.00,
      provider_cost_dog_base: 0,
      attributes: [
        { name: 'Livello', value: 'Tutti i livelli' },
        { name: 'Età cane', value: 'Tutte le età' }
      ],
      excluded_items: ['Attrezzatura personale'],
      meeting_info: {
        address: 'Centro Cinofilo Dog Training, Via dello Sport 45',
        coordinates: { lat: 41.9028, lng: 12.4964 },
        notes: 'Parcheggio interno disponibile'
      },
      show_meeting_info: true
    },
    {
      provider_id: PROVIDER_ID,
      name: 'Passeggiata Naturalistica con Degustazione',
      description: 'Una passeggiata rilassante in natura seguita da una degustazione di prodotti locali. Perfetta per chi ama natura, buon cibo e momenti di relax con il proprio cane.',
      duration_hours: 5,
      meeting_point: 'Agriturismo La Collina, Strada Provinciale 12',
      pricing_type: 'fixed',
      price_adult_base: 60.00,
      price_dog_base: 5.00,
      predefined_prices: {},
      images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800'],
      active: true,
      cutoff_hours: 72,
      full_day_start_time: '09:00',
      full_day_end_time: '14:00',
      max_adults: 12,
      max_dogs: 12,
      highlights: [
        'Passeggiata guidata',
        'Degustazione prodotti locali',
        'Pranzo incluso',
        'Vino e birra artigianale',
        'Prodotti bio'
      ],
      included_items: [
        'Passeggiata guidata',
        'Degustazione prodotti',
        'Pranzo completo',
        'Vino/birra',
        'Guida naturalistica'
      ],
      cancellation_policy: 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.',
      no_adults: false,
      pricing_model: 'percentage',
      margin_percentage: 20,
      provider_cost_adult_base: 48.00,
      provider_cost_dog_base: 4.00,
      attributes: [
        { name: 'Difficoltà', value: 'Facile' },
        { name: 'Lunghezza', value: '5km' },
        { name: 'Pranzo', value: 'Incluso' }
      ],
      excluded_items: ['Trasporto'],
      meeting_info: {
        address: 'Agriturismo La Collina, Strada Provinciale 12',
        coordinates: { lat: 43.7696, lng: 11.2558 },
        notes: 'Parcheggio gratuito in loco'
      },
      show_meeting_info: true
    }
  ];

  const created = [];
  for (const exp of experiences) {
    const { data, error } = await supabase
      .from('experience')
      .insert(exp)
      .select()
      .single();

    if (error) {
      console.error(`❌ Errore creando ${exp.name}:`, error.message);
    } else {
      console.log(`✅ Creata: ${exp.name} (ID: ${data.id})`);
      created.push(data);
    }
  }

  return created;
}

async function createTrips_DEPRECATED() {
  console.log('\n📝 Creando 5 viaggi placeholder...\n');

  const trips = [
    {
      provider_id: PROVIDER_ID,
      name: 'Weekend in Toscana con il Cane',
      description: 'Un weekend indimenticabile in Toscana con il tuo cane. Scopri borghi medievali, vigneti, colline e spiagge pet-friendly. Pernottamento in agriturismo pet-friendly incluso.',
      pricing_type: 'fixed',
      price_adult_base: 250.00,
      price_dog_base: 30.00,
      predefined_prices: {},
      duration_days: 2,
      start_date: '2026-03-01',
      end_date: '2026-03-02',
      location: 'Toscana, Italia',
      booking_qty: 0,
      images: ['https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800'],
      active: true,
      cutoff_hours: 168, // 7 giorni
      max_adults: 8,
      max_dogs: 8,
      highlights: [
        'Pernottamento agriturismo pet-friendly',
        'Visita borghi medievali',
        'Degustazione vini',
        'Spiagge per cani',
        'Colazione e cena incluse'
      ],
      included_items: [
        'Pernottamento 1 notte',
        'Colazione e cena',
        'Visite guidate',
        'Degustazione vini',
        'Assicurazione'
      ],
      cancellation_policy: 'Cancellazione gratuita fino a 14 giorni prima della data di partenza.',
      pricing_model: 'percentage',
      margin_percentage: 25,
      provider_cost_adult_base: 200.00,
      provider_cost_dog_base: 24.00,
      attributes: [
        { name: 'Durata', value: '2 giorni / 1 notte' },
        { name: 'Regione', value: 'Toscana' },
        { name: 'Alloggio', value: 'Agriturismo' }
      ],
      excluded_items: ['Trasporto', 'Pranzo', 'Bevande extra'],
      meeting_info: {
        address: 'Agriturismo Toscano, Strada Provinciale 45',
        coordinates: { lat: 43.7696, lng: 11.2558 },
        notes: 'Check-in dalle 15:00'
      },
      show_meeting_info: true
    },
    {
      provider_id: PROVIDER_ID,
      name: 'Tour delle Cinque Terre con Cane',
      description: 'Un viaggio spettacolare lungo la costa ligure. Visita i 5 borghi delle Cinque Terre, passeggiate panoramiche, spiagge e momenti di relax con il tuo cane.',
      pricing_type: 'fixed',
      price_adult_base: 320.00,
      price_dog_base: 25.00,
      predefined_prices: {},
      duration_days: 3,
      start_date: '2026-03-15',
      end_date: '2026-03-17',
      location: 'Cinque Terre, Liguria',
      booking_qty: 0,
      images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'],
      active: true,
      cutoff_hours: 168,
      max_adults: 10,
      max_dogs: 10,
      highlights: [
        'Visita tutti e 5 i borghi',
        'Pernottamento hotel pet-friendly',
        'Sentieri panoramici',
        'Spiagge per cani',
        'Tutti i pasti inclusi'
      ],
      included_items: [
        'Pernottamento 2 notti',
        'Tutti i pasti',
        'Treni Cinque Terre',
        'Visite guidate',
        'Assicurazione'
      ],
      cancellation_policy: 'Cancellazione gratuita fino a 14 giorni prima della data di partenza.',
      pricing_model: 'percentage',
      margin_percentage: 20,
      provider_cost_adult_base: 256.00,
      provider_cost_dog_base: 20.00,
      attributes: [
        { name: 'Durata', value: '3 giorni / 2 notti' },
        { name: 'Regione', value: 'Liguria' },
        { name: 'Trasporti', value: 'Treni inclusi' }
      ],
      excluded_items: ['Trasporto da/per casa', 'Bevande extra'],
      meeting_info: {
        address: 'Hotel Cinque Terre, Via dell\'Amore 1',
        coordinates: { lat: 44.1271, lng: 9.7144 },
        notes: 'Check-in dalle 14:00'
      },
      show_meeting_info: true
    },
    {
      provider_id: PROVIDER_ID,
      name: 'Avventura in Dolomiti con Cane',
      description: 'Un\'avventura in montagna tra le Dolomiti. Escursioni, rifugi, panorami mozzafiato e momenti di relax in un ambiente naturale unico. Perfetto per cani attivi.',
      pricing_type: 'fixed',
      price_adult_base: 380.00,
      price_dog_base: 20.00,
      predefined_prices: {},
      duration_days: 4,
      start_date: '2026-03-20',
      end_date: '2026-03-23',
      location: 'Dolomiti, Trentino-Alto Adige',
      booking_qty: 0,
      images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'],
      active: true,
      cutoff_hours: 336, // 14 giorni
      max_adults: 6,
      max_dogs: 6,
      highlights: [
        'Escursioni guidate',
        'Pernottamento in rifugi',
        'Panorami mozzafiato',
        'Guida alpina certificata',
        'Tutti i pasti inclusi'
      ],
      included_items: [
        'Pernottamento 3 notti',
        'Tutti i pasti',
        'Guida alpina',
        'Attrezzatura sicurezza',
        'Assicurazione'
      ],
      cancellation_policy: 'Cancellazione gratuita fino a 21 giorni prima della data di partenza.',
      pricing_model: 'percentage',
      margin_percentage: 30,
      provider_cost_adult_base: 292.00,
      provider_cost_dog_base: 15.00,
      attributes: [
        { name: 'Durata', value: '4 giorni / 3 notti' },
        { name: 'Regione', value: 'Trentino-Alto Adige' },
        { name: 'Difficoltà', value: 'Media-Alta' }
      ],
      excluded_items: ['Trasporto', 'Attrezzatura personale'],
      meeting_info: {
        address: 'Rifugio Dolomiti, Via delle Cime 100',
        coordinates: { lat: 46.5197, lng: 11.9050 },
        notes: 'Check-in dalle 16:00'
      },
      show_meeting_info: true
    },
    {
      provider_id: PROVIDER_ID,
      name: 'Relax al Lago di Garda con Cane',
      description: 'Un weekend di relax sulle rive del Lago di Garda. Spiagge pet-friendly, passeggiate panoramiche, borghi caratteristici e momenti di puro relax con il tuo cane.',
      pricing_type: 'fixed',
      price_adult_base: 180.00,
      price_dog_base: 15.00,
      predefined_prices: {},
      duration_days: 2,
      start_date: '2026-03-08',
      end_date: '2026-03-09',
      location: 'Lago di Garda, Lombardia',
      booking_qty: 0,
      images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'],
      active: true,
      cutoff_hours: 120, // 5 giorni
      max_adults: 12,
      max_dogs: 12,
      highlights: [
        'Hotel pet-friendly sul lago',
        'Spiagge per cani',
        'Passeggiate panoramiche',
        'Borghi caratteristici',
        'Colazione inclusa'
      ],
      included_items: [
        'Pernottamento 1 notte',
        'Colazione',
        'Accesso spiagge',
        'Parcheggio',
        'Assicurazione'
      ],
      cancellation_policy: 'Cancellazione gratuita fino a 7 giorni prima della data di partenza.',
      pricing_model: 'percentage',
      margin_percentage: 22,
      provider_cost_adult_base: 147.60,
      provider_cost_dog_base: 11.70,
      attributes: [
        { name: 'Durata', value: '2 giorni / 1 notte' },
        { name: 'Regione', value: 'Lombardia' },
        { name: 'Tipo', value: 'Relax' }
      ],
      excluded_items: ['Pranzo e cena', 'Trasporto', 'Bevande'],
      meeting_info: {
        address: 'Hotel Lago di Garda, Lungolago 25',
        coordinates: { lat: 45.6023, lng: 10.6917 },
        notes: 'Check-in dalle 15:00'
      },
      show_meeting_info: true
    },
    {
      provider_id: PROVIDER_ID,
      name: 'Tour della Sicilia con Cane',
      description: 'Un viaggio alla scoperta della Sicilia con il tuo cane. Città d\'arte, spiagge paradisiache, cibo tradizionale e cultura. Un\'esperienza indimenticabile in 5 giorni.',
      pricing_type: 'fixed',
      price_adult_base: 450.00,
      price_dog_base: 35.00,
      predefined_prices: {},
      duration_days: 5,
      start_date: '2026-03-25',
      end_date: '2026-03-29',
      location: 'Sicilia, Italia',
      booking_qty: 0,
      images: ['https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800'],
      active: true,
      cutoff_hours: 336,
      max_adults: 8,
      max_dogs: 8,
      highlights: [
        'Tour completo Sicilia',
        'Hotel pet-friendly',
        'Visite guidate',
        'Spiagge paradisiache',
        'Tutti i pasti inclusi'
      ],
      included_items: [
        'Pernottamento 4 notti',
        'Tutti i pasti',
        'Trasporti interni',
        'Visite guidate',
        'Assicurazione'
      ],
      cancellation_policy: 'Cancellazione gratuita fino a 21 giorni prima della data di partenza.',
      pricing_model: 'percentage',
      margin_percentage: 25,
      provider_cost_adult_base: 360.00,
      provider_cost_dog_base: 28.00,
      attributes: [
        { name: 'Durata', value: '5 giorni / 4 notti' },
        { name: 'Regione', value: 'Sicilia' },
        { name: 'Tipo', value: 'Tour completo' }
      ],
      excluded_items: ['Volo', 'Trasporto da/per aeroporto'],
      meeting_info: {
        address: 'Hotel Sicilia, Via del Mare 10',
        coordinates: { lat: 38.1157, lng: 13.3613 },
        notes: 'Check-in dalle 14:00'
      },
      show_meeting_info: true
    }
  ];

  const created = [];
  for (const trip of trips) {
    const { data, error } = await supabase
      .from('trip')
      .insert(trip)
      .select()
      .single();

    if (error) {
      console.error(`❌ Errore creando ${trip.name}:`, error.message);
    } else {
      console.log(`✅ Creato: ${trip.name} (ID: ${data.id})`);
      created.push(data);
    }
  }

  return created;
}

async function createAvailabilitySlots(products: any[]) {
  console.log('\n📝 Creando disponibilità da marzo 2026...\n');

  // Genera date da marzo 2026 per 3 mesi
  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-05-31');
  const dates: Date[] = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }

  const slots = [];

  for (const product of products) {
    const productType = product.duration_hours ? 'experience' : 'trip';
    
    // Per esperienze: crea slot giornalieri
    if (productType === 'experience') {
      for (const date of dates) {
        // Skip weekend per alcune esperienze (opzionale)
        const dayOfWeek = date.getDay();
        
        slots.push({
          product_id: product.id,
          product_type: 'experience',
          date: date.toISOString().split('T')[0],
          time_slot: product.full_day_start_time || '10:00',
          end_time: product.full_day_end_time || '14:00',
          max_adults: product.max_adults || 10,
          max_dogs: product.max_dogs || 15,
          booked_adults: 0,
          booked_dogs: 0
        });
      }
    } else {
      // Per viaggi: crea slot per le date di partenza
      const tripStart = new Date(product.start_date);
      const tripEnd = new Date(product.end_date);
      
      // Crea slot per ogni settimana da marzo a maggio
      for (let d = new Date(tripStart); d <= endDate; d.setDate(d.getDate() + 7)) {
        const endDateSlot = new Date(d);
        endDateSlot.setDate(endDateSlot.getDate() + (product.duration_days - 1));
        
        if (endDateSlot <= endDate) {
          slots.push({
            product_id: product.id,
            product_type: 'trip',
            date: d.toISOString().split('T')[0],
            time_slot: null,
            end_time: null,
            max_adults: product.max_adults || 8,
            max_dogs: product.max_dogs || 8,
            booked_adults: 0,
            booked_dogs: 0
          });
        }
      }
    }
  }

  // Inserisci in batch
  const batchSize = 100;
  for (let i = 0; i < slots.length; i += batchSize) {
    const batch = slots.slice(i, i + batchSize);
    const { error } = await supabase
      .from('availability_slot')
      .insert(batch);

    if (error) {
      console.error(`❌ Errore inserendo batch ${i / batchSize + 1}:`, error.message);
    } else {
      console.log(`✅ Inseriti ${batch.length} slot (batch ${Math.floor(i / batchSize) + 1})`);
    }
  }

  console.log(`\n✅ Creati ${slots.length} slot di disponibilità totali`);
}

async function getOrCreateProvider() {
  // Cerca un provider esistente
  const { data: existing } = await supabase
    .from('profile')
    .select('id, email, company_name')
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log(`✅ Usando provider esistente: ${existing.company_name} (${existing.email})`);
    return existing.id;
  }

  // Se non esiste, usa un UUID placeholder (puoi aggiornarlo dopo)
  console.log('⚠️  Nessun provider trovato. Usando UUID placeholder.');
  console.log('   Puoi aggiornare provider_id dopo aver creato un utente/provider.');
  return '00000000-0000-0000-0000-000000000000';
}

async function main() {
  console.log('🚀 Creazione placeholder staging...\n');

  // Ottieni provider
  const providerId = await getOrCreateProvider();

  // Crea esperienze con provider_id corretto
  console.log('📝 Creando 5 esperienze placeholder...\n');
  const experiences = [];
  for (let i = 0; i < 5; i++) {
    const expData = getExperienceData(i);
    expData.provider_id = providerId;
    
    const { data, error } = await supabase
      .from('experience')
      .insert(expData)
      .select()
      .single();

    if (error) {
      console.error(`❌ Errore creando esperienza ${i + 1}:`, error.message);
    } else {
      console.log(`✅ Creata: ${expData.name} (ID: ${data.id})`);
      experiences.push(data);
    }
  }

  // Crea viaggi con provider_id corretto
  console.log('\n📝 Creando 5 viaggi placeholder...\n');
  const trips = [];
  for (let i = 0; i < 5; i++) {
    const tripData = getTripData(i);
    tripData.provider_id = providerId;
    
    const { data, error } = await supabase
      .from('trip')
      .insert(tripData)
      .select()
      .single();

    if (error) {
      console.error(`❌ Errore creando viaggio ${i + 1}:`, error.message);
    } else {
      console.log(`✅ Creato: ${tripData.name} (ID: ${data.id})`);
      trips.push(data);
    }
  }

  // Crea disponibilità
  await createAvailabilitySlots([...experiences, ...trips]);

  console.log('\n✅ Completato!');
  console.log(`   - ${experiences.length} esperienze create`);
  console.log(`   - ${trips.length} viaggi creati`);
  console.log('   - Disponibilità da marzo 2026 create');
}

function getExperienceData(index: number) {
  const experiences = [
    {
      name: 'Esperienza Cani e Padroni - Escursione Montagna',
      description: 'Un\'escursione guidata in montagna per te e il tuo cane. Scopri sentieri panoramici, natura incontaminata e momenti di relax insieme al tuo amico a quattro zampe.',
      duration_hours: 4,
      meeting_point: 'Parcheggio Rifugio Monte Bianco, Via delle Alpi 123',
      pricing_type: 'fixed',
      price_adult_base: 45.00,
      price_dog_base: 15.00,
      predefined_prices: {},
      images: ['https://images.unsplash.com/photo-1551632811-561732d1e306?w=800'],
      active: true,
      cutoff_hours: 24,
      full_day_start_time: '09:00',
      full_day_end_time: '17:00',
      max_adults: 10,
      max_dogs: 15,
      highlights: ['Escursione guidata in montagna', 'Panorami mozzafiato', 'Pranzo al sacco incluso', 'Guida esperta certificata', 'Assicurazione inclusa'],
      included_items: ['Guida esperta', 'Pranzo al sacco', 'Assicurazione', 'Materiale di sicurezza', 'Foto ricordo'],
      cancellation_policy: 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.',
      no_adults: false,
      pricing_model: 'percentage',
      margin_percentage: 20,
      provider_cost_adult_base: 36.00,
      provider_cost_dog_base: 12.00,
      attributes: [{ name: 'Difficoltà', value: 'Media' }, { name: 'Dislivello', value: '500m' }, { name: 'Lunghezza', value: '8km' }],
      excluded_items: ['Trasporto', 'Attrezzatura personale'],
      meeting_info: { address: 'Parcheggio Rifugio Monte Bianco', coordinates: { lat: 45.8326, lng: 6.8652 }, notes: 'Parcheggio gratuito disponibile' },
      show_meeting_info: true
    },
    {
      name: 'Giornata al Lago con il Cane',
      description: 'Una giornata rilassante al lago dedicata a te e al tuo cane. Nuoto, giochi, relax e momenti di condivisione in un ambiente naturale e sicuro.',
      duration_hours: 6,
      meeting_point: 'Lago di Bracciano, Spiaggia Cani',
      pricing_type: 'fixed',
      price_adult_base: 35.00,
      price_dog_base: 10.00,
      predefined_prices: {},
      images: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800'],
      active: true,
      cutoff_hours: 48,
      full_day_start_time: '10:00',
      full_day_end_time: '16:00',
      max_adults: 15,
      max_dogs: 20,
      highlights: ['Accesso spiaggia per cani', 'Area giochi attrezzata', 'Ombrelloni e sdraio', 'Snack e bevande', 'Docce e servizi'],
      included_items: ['Accesso spiaggia', 'Ombrellone e sdraio', 'Snack per cani', 'Bevande', 'Docce'],
      cancellation_policy: 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.',
      no_adults: false,
      pricing_model: 'percentage',
      margin_percentage: 25,
      provider_cost_adult_base: 28.00,
      provider_cost_dog_base: 7.50,
      attributes: [{ name: 'Tipo', value: 'Relax' }, { name: 'Accesso', value: 'Spiaggia attrezzata' }],
      excluded_items: ['Pranzo completo', 'Trasporto'],
      meeting_info: { address: 'Lago di Bracciano, Spiaggia Cani', coordinates: { lat: 42.1025, lng: 12.1753 }, notes: 'Parcheggio a 200m dalla spiaggia' },
      show_meeting_info: true
    },
    {
      name: 'Tour Fotografico Urbano con Cane',
      description: 'Scopri la città attraverso gli occhi del tuo cane. Un tour fotografico guidato nei luoghi più pet-friendly della città, con sessioni fotografiche professionali.',
      duration_hours: 3,
      meeting_point: 'Piazza del Duomo, Milano',
      pricing_type: 'fixed',
      price_adult_base: 55.00,
      price_dog_base: 0,
      predefined_prices: {},
      images: ['https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800'],
      active: true,
      cutoff_hours: 12,
      full_day_start_time: '14:00',
      full_day_end_time: '17:00',
      max_adults: 8,
      max_dogs: 8,
      highlights: ['Fotografo professionista', 'Tour guidato pet-friendly', 'Foto digitali incluse', 'Luoghi iconici', 'Album digitale'],
      included_items: ['Fotografo professionista', 'Tour guidato', 'Foto digitali (min 20)', 'Album digitale', 'Guida esperta'],
      cancellation_policy: 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.',
      no_adults: false,
      pricing_model: 'markup',
      markup_adult: 15.00,
      markup_dog: 0,
      provider_cost_adult_base: 40.00,
      provider_cost_dog_base: 0,
      attributes: [{ name: 'Durata', value: '3 ore' }, { name: 'Foto', value: 'Min 20 digitali' }],
      excluded_items: ['Stampa foto', 'Trasporto'],
      meeting_info: { address: 'Piazza del Duomo, Milano', coordinates: { lat: 45.4642, lng: 9.1900 }, notes: 'Ritrovo davanti alla Cattedrale' },
      show_meeting_info: true
    },
    {
      name: 'Agility e Training Avanzato',
      description: 'Sessione di agility e training avanzato per cani di tutte le età. Migliora l\'obbedienza, l\'agilità e il legame con il tuo cane in un ambiente professionale.',
      duration_hours: 2,
      meeting_point: 'Centro Cinofilo Dog Training, Via dello Sport 45',
      pricing_type: 'fixed',
      price_adult_base: 40.00,
      price_dog_base: 0,
      predefined_prices: {},
      images: ['https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800'],
      active: true,
      cutoff_hours: 24,
      full_day_start_time: '10:00',
      full_day_end_time: '12:00',
      max_adults: 6,
      max_dogs: 6,
      highlights: ['Istruttore certificato', 'Attrezzatura professionale', 'Training personalizzato', 'Consigli personalizzati', 'Certificato partecipazione'],
      included_items: ['Istruttore certificato', 'Uso attrezzatura', 'Materiale didattico', 'Consulenza personalizzata', 'Certificato'],
      cancellation_policy: 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.',
      no_adults: false,
      pricing_model: 'percentage',
      margin_percentage: 30,
      provider_cost_adult_base: 28.00,
      provider_cost_dog_base: 0,
      attributes: [{ name: 'Livello', value: 'Tutti i livelli' }, { name: 'Età cane', value: 'Tutte le età' }],
      excluded_items: ['Attrezzatura personale'],
      meeting_info: { address: 'Centro Cinofilo Dog Training, Via dello Sport 45', coordinates: { lat: 41.9028, lng: 12.4964 }, notes: 'Parcheggio interno disponibile' },
      show_meeting_info: true
    },
    {
      name: 'Passeggiata Naturalistica con Degustazione',
      description: 'Una passeggiata rilassante in natura seguita da una degustazione di prodotti locali. Perfetta per chi ama natura, buon cibo e momenti di relax con il proprio cane.',
      duration_hours: 5,
      meeting_point: 'Agriturismo La Collina, Strada Provinciale 12',
      pricing_type: 'fixed',
      price_adult_base: 60.00,
      price_dog_base: 5.00,
      predefined_prices: {},
      images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800'],
      active: true,
      cutoff_hours: 72,
      full_day_start_time: '09:00',
      full_day_end_time: '14:00',
      max_adults: 12,
      max_dogs: 12,
      highlights: ['Passeggiata guidata', 'Degustazione prodotti locali', 'Pranzo incluso', 'Vino e birra artigianale', 'Prodotti bio'],
      included_items: ['Passeggiata guidata', 'Degustazione prodotti', 'Pranzo completo', 'Vino/birra', 'Guida naturalistica'],
      cancellation_policy: 'Cancellazione gratuita fino a 7 giorni prima della data prenotata.',
      no_adults: false,
      pricing_model: 'percentage',
      margin_percentage: 20,
      provider_cost_adult_base: 48.00,
      provider_cost_dog_base: 4.00,
      attributes: [{ name: 'Difficoltà', value: 'Facile' }, { name: 'Lunghezza', value: '5km' }, { name: 'Pranzo', value: 'Incluso' }],
      excluded_items: ['Trasporto'],
      meeting_info: { address: 'Agriturismo La Collina, Strada Provinciale 12', coordinates: { lat: 43.7696, lng: 11.2558 }, notes: 'Parcheggio gratuito in loco' },
      show_meeting_info: true
    }
  ];
  return experiences[index];
}

function getTripData(index: number) {
  const trips = [
    {
      name: 'Weekend in Toscana con il Cane',
      description: 'Un weekend indimenticabile in Toscana con il tuo cane. Scopri borghi medievali, vigneti, colline e spiagge pet-friendly. Pernottamento in agriturismo pet-friendly incluso.',
      pricing_type: 'fixed',
      price_adult_base: 250.00,
      price_dog_base: 30.00,
      predefined_prices: {},
      duration_days: 2,
      start_date: '2026-03-01',
      end_date: '2026-03-02',
      location: 'Toscana, Italia',
      booking_qty: 0,
      images: ['https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800'],
      active: true,
      cutoff_hours: 168,
      max_adults: 8,
      max_dogs: 8,
      highlights: ['Pernottamento agriturismo pet-friendly', 'Visita borghi medievali', 'Degustazione vini', 'Spiagge per cani', 'Colazione e cena incluse'],
      included_items: ['Pernottamento 1 notte', 'Colazione e cena', 'Visite guidate', 'Degustazione vini', 'Assicurazione'],
      cancellation_policy: 'Cancellazione gratuita fino a 14 giorni prima della data di partenza.',
      pricing_model: 'percentage',
      margin_percentage: 25,
      provider_cost_adult_base: 200.00,
      provider_cost_dog_base: 24.00,
      attributes: [{ name: 'Durata', value: '2 giorni / 1 notte' }, { name: 'Regione', value: 'Toscana' }, { name: 'Alloggio', value: 'Agriturismo' }],
      excluded_items: ['Trasporto', 'Pranzo', 'Bevande extra'],
      meeting_info: { address: 'Agriturismo Toscano, Strada Provinciale 45', coordinates: { lat: 43.7696, lng: 11.2558 }, notes: 'Check-in dalle 15:00' },
      show_meeting_info: true
    },
    {
      name: 'Tour delle Cinque Terre con Cane',
      description: 'Un viaggio spettacolare lungo la costa ligure. Visita i 5 borghi delle Cinque Terre, passeggiate panoramiche, spiagge e momenti di relax con il tuo cane.',
      pricing_type: 'fixed',
      price_adult_base: 320.00,
      price_dog_base: 25.00,
      predefined_prices: {},
      duration_days: 3,
      start_date: '2026-03-15',
      end_date: '2026-03-17',
      location: 'Cinque Terre, Liguria',
      booking_qty: 0,
      images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'],
      active: true,
      cutoff_hours: 168,
      max_adults: 10,
      max_dogs: 10,
      highlights: ['Visita tutti e 5 i borghi', 'Pernottamento hotel pet-friendly', 'Sentieri panoramici', 'Spiagge per cani', 'Tutti i pasti inclusi'],
      included_items: ['Pernottamento 2 notti', 'Tutti i pasti', 'Treni Cinque Terre', 'Visite guidate', 'Assicurazione'],
      cancellation_policy: 'Cancellazione gratuita fino a 14 giorni prima della data di partenza.',
      pricing_model: 'percentage',
      margin_percentage: 20,
      provider_cost_adult_base: 256.00,
      provider_cost_dog_base: 20.00,
      attributes: [{ name: 'Durata', value: '3 giorni / 2 notti' }, { name: 'Regione', value: 'Liguria' }, { name: 'Trasporti', value: 'Treni inclusi' }],
      excluded_items: ['Trasporto da/per casa', 'Bevande extra'],
      meeting_info: { address: 'Hotel Cinque Terre, Via dell\'Amore 1', coordinates: { lat: 44.1271, lng: 9.7144 }, notes: 'Check-in dalle 14:00' },
      show_meeting_info: true
    },
    {
      name: 'Avventura in Dolomiti con Cane',
      description: 'Un\'avventura in montagna tra le Dolomiti. Escursioni, rifugi, panorami mozzafiato e momenti di relax in un ambiente naturale unico. Perfetto per cani attivi.',
      pricing_type: 'fixed',
      price_adult_base: 380.00,
      price_dog_base: 20.00,
      predefined_prices: {},
      duration_days: 4,
      start_date: '2026-03-20',
      end_date: '2026-03-23',
      location: 'Dolomiti, Trentino-Alto Adige',
      booking_qty: 0,
      images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'],
      active: true,
      cutoff_hours: 336,
      max_adults: 6,
      max_dogs: 6,
      highlights: ['Escursioni guidate', 'Pernottamento in rifugi', 'Panorami mozzafiato', 'Guida alpina certificata', 'Tutti i pasti inclusi'],
      included_items: ['Pernottamento 3 notti', 'Tutti i pasti', 'Guida alpina', 'Attrezzatura sicurezza', 'Assicurazione'],
      cancellation_policy: 'Cancellazione gratuita fino a 21 giorni prima della data di partenza.',
      pricing_model: 'percentage',
      margin_percentage: 30,
      provider_cost_adult_base: 292.00,
      provider_cost_dog_base: 15.00,
      attributes: [{ name: 'Durata', value: '4 giorni / 3 notti' }, { name: 'Regione', value: 'Trentino-Alto Adige' }, { name: 'Difficoltà', value: 'Media-Alta' }],
      excluded_items: ['Trasporto', 'Attrezzatura personale'],
      meeting_info: { address: 'Rifugio Dolomiti, Via delle Cime 100', coordinates: { lat: 46.5197, lng: 11.9050 }, notes: 'Check-in dalle 16:00' },
      show_meeting_info: true
    },
    {
      name: 'Relax al Lago di Garda con Cane',
      description: 'Un weekend di relax sulle rive del Lago di Garda. Spiagge pet-friendly, passeggiate panoramiche, borghi caratteristici e momenti di puro relax con il tuo cane.',
      pricing_type: 'fixed',
      price_adult_base: 180.00,
      price_dog_base: 15.00,
      predefined_prices: {},
      duration_days: 2,
      start_date: '2026-03-08',
      end_date: '2026-03-09',
      location: 'Lago di Garda, Lombardia',
      booking_qty: 0,
      images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'],
      active: true,
      cutoff_hours: 120,
      max_adults: 12,
      max_dogs: 12,
      highlights: ['Hotel pet-friendly sul lago', 'Spiagge per cani', 'Passeggiate panoramiche', 'Borghi caratteristici', 'Colazione inclusa'],
      included_items: ['Pernottamento 1 notte', 'Colazione', 'Accesso spiagge', 'Parcheggio', 'Assicurazione'],
      cancellation_policy: 'Cancellazione gratuita fino a 7 giorni prima della data di partenza.',
      pricing_model: 'percentage',
      margin_percentage: 22,
      provider_cost_adult_base: 147.60,
      provider_cost_dog_base: 11.70,
      attributes: [{ name: 'Durata', value: '2 giorni / 1 notte' }, { name: 'Regione', value: 'Lombardia' }, { name: 'Tipo', value: 'Relax' }],
      excluded_items: ['Pranzo e cena', 'Trasporto', 'Bevande'],
      meeting_info: { address: 'Hotel Lago di Garda, Lungolago 25', coordinates: { lat: 45.6023, lng: 10.6917 }, notes: 'Check-in dalle 15:00' },
      show_meeting_info: true
    },
    {
      name: 'Tour della Sicilia con Cane',
      description: 'Un viaggio alla scoperta della Sicilia con il tuo cane. Città d\'arte, spiagge paradisiache, cibo tradizionale e cultura. Un\'esperienza indimenticabile in 5 giorni.',
      pricing_type: 'fixed',
      price_adult_base: 450.00,
      price_dog_base: 35.00,
      predefined_prices: {},
      duration_days: 5,
      start_date: '2026-03-25',
      end_date: '2026-03-29',
      location: 'Sicilia, Italia',
      booking_qty: 0,
      images: ['https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800'],
      active: true,
      cutoff_hours: 336,
      max_adults: 8,
      max_dogs: 8,
      highlights: ['Tour completo Sicilia', 'Hotel pet-friendly', 'Visite guidate', 'Spiagge paradisiache', 'Tutti i pasti inclusi'],
      included_items: ['Pernottamento 4 notti', 'Tutti i pasti', 'Trasporti interni', 'Visite guidate', 'Assicurazione'],
      cancellation_policy: 'Cancellazione gratuita fino a 21 giorni prima della data di partenza.',
      pricing_model: 'percentage',
      margin_percentage: 25,
      provider_cost_adult_base: 360.00,
      provider_cost_dog_base: 28.00,
      attributes: [{ name: 'Durata', value: '5 giorni / 4 notti' }, { name: 'Regione', value: 'Sicilia' }, { name: 'Tipo', value: 'Tour completo' }],
      excluded_items: ['Volo', 'Trasporto da/per aeroporto'],
      meeting_info: { address: 'Hotel Sicilia, Via del Mare 10', coordinates: { lat: 38.1157, lng: 13.3613 }, notes: 'Check-in dalle 14:00' },
      show_meeting_info: true
    }
  ];
  return trips[index];
}

main().catch(console.error);


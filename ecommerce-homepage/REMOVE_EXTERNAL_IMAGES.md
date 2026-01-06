# Rimozione Immagini da Link Esterni

## 🎯 Obiettivo

Tutte le immagini devono essere salvate localmente, non caricate da link esterni (http/https).

## ✅ Modifiche Applicate

### 1. productMapper.ts - Sostituiti URL Unsplash con Immagini Locali

**Prima:**
- `EXPERIENCE_IMAGES`: Array di URL Unsplash
- `CLASS_IMAGES`: Array di URL Unsplash
- `TRIP_IMAGES`: Array di URL Unsplash
- `DEFAULT_PLACEHOLDER`: URL Unsplash

**Dopo:**
- `EXPERIENCE_IMAGES`: Array di path locali (`/images/attributes/*.webp`)
- `CLASS_IMAGES`: Array di path locali (`/images/attributes/*.webp`)
- `TRIP_IMAGES`: Array di path locali (`/images/attributes/*.webp`)
- `DEFAULT_PLACEHOLDER`: Path locale (`/images/attributes/mare.webp`)

**Immagini locali usate:**
- `/images/attributes/montagna.webp`
- `/images/attributes/lago.webp`
- `/images/attributes/mare.webp`
- `/images/attributes/parco.webp`

### 2. productMapper.ts - Filtro URL Esterni

**Aggiunto filtro:**
- Se `row.images[0]` è un URL esterno (http/https), viene sostituito con placeholder locale
- Se `meta.imageUrl` è un URL esterno (http/https), viene sostituito con placeholder locale
- Solo immagini locali (path relativi `/`) vengono accettate

### 3. ProductCard.tsx - Rifiuta URL Esterni

**Modificato `getImageUrl()`:**
- Rifiuta esplicitamente URL esterni (http/https)
- Accetta solo path relativi locali (`/`) o data URLs
- Usa placeholder locale per URL esterni

### 4. ImageWithFallback.tsx - Rifiuta URL Esterni

**Modificato `isValidImageUrl()`:**
- Rifiuta esplicitamente URL esterni (http/https)
- Accetta solo path relativi locali (`/`) o data URLs
- Tutti i componenti che usano `ImageWithFallback` ora rifiutano URL esterni

## 📝 File Modificati

- `src/lib/productMapper.ts` - Immagini locali e filtro URL esterni
- `src/components/ProductCard.tsx` - Rifiuta URL esterni
- `src/components/figma/ImageWithFallback.tsx` - Rifiuta URL esterni

## 🎯 Comportamento

### Immagini Accettate
- ✅ Path relativi locali: `/images/attributes/mare.webp`
- ✅ Path relativi statici: `/hero-image.jpg`
- ✅ Data URLs: `data:image/svg+xml;base64,...`

### Immagini Rifiutate
- ❌ URL esterni HTTP: `http://example.com/image.jpg`
- ❌ URL esterni HTTPS: `https://images.unsplash.com/...`
- ❌ URL Supabase esterni: `https://*.supabase.co/storage/...` (se non salvati localmente)

## ⚠️ Note Importanti

1. **Immagini da Database**: Se il database contiene URL esterni, vengono automaticamente sostituiti con placeholder locali
2. **Supabase Storage**: Se le immagini sono salvate su Supabase Storage, devono essere scaricate e salvate localmente in `/public`
3. **Placeholder**: Le immagini placeholder vengono selezionate in base al tipo di prodotto (esperienza/viaggio/classe)
4. **Performance**: Usando solo immagini locali, migliorano le performance (nessuna dipendenza da servizi esterni)

## 🔄 Prossimi Passi

1. **Scaricare immagini da Supabase**: Se ci sono immagini salvate su Supabase Storage, scaricarle e salvarle in `/public`
2. **Verificare database**: Controllare se il database contiene URL esterni e sostituirli con path locali
3. **Aggiungere più immagini**: Se necessario, aggiungere più immagini locali in `/public/images/` per varietà

## 📊 Immagini Locali Disponibili

Attualmente disponibili in `/public/images/attributes/`:
- `mare.webp`, `mare.avif`, `mare.png`
- `montagna.webp`, `montagna.avif`, `montagna.png`
- `parco.webp`, `parco.avif`, `parco.png`
- `lago.webp`

Queste vengono usate come placeholder per i prodotti.


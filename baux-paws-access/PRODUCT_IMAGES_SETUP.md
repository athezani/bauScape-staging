# Setup Product Images Feature

Questa guida spiega come configurare la funzionalità di upload immagini multiple per i prodotti.

## 📋 Prerequisiti

1. Supabase Storage configurato
2. Migrazione database applicata
3. Provider autenticato nel provider portal

## 🗄️ Database

La migrazione `20251229000000_create_product_images_table.sql` crea:
- Tabella `product_images` per memorizzare le immagini secondarie
- RLS policies per sicurezza
- Indici per performance

Per applicare la migrazione:
```bash
# Via Supabase CLI
supabase migration up

# O manualmente dal dashboard Supabase
```

## 🪣 Supabase Storage Bucket

Il bucket `product-images` deve essere creato in Supabase Storage.

### Opzione 1: Via Dashboard Supabase

1. Vai su **Storage** > **Buckets**
2. Clicca **New bucket**
3. Nome: `product-images`
4. Imposta come **Public bucket**
5. File size limit: `5242880` (5MB)
6. Allowed MIME types: `image/jpeg, image/jpg, image/png, image/webp`

### Opzione 2: Via Script

```bash
cd baux-paws-access
npx tsx scripts/setup-product-images-bucket.ts
```

## 🔐 RLS Policies

Le RLS policies sono già configurate nella migrazione:
- I provider possono vedere/modificare solo le immagini dei loro prodotti
- Il pubblico può vedere tutte le immagini (per l'ecommerce)

## 📸 Utilizzo

### Nel Provider Portal

1. Vai alla sezione **Prodotti**
2. Crea o modifica un prodotto
3. Vai alla tab **Upload Foto**
4. Carica da 1 a 10 immagini
5. Trascina le immagini per riordinarle
6. Elimina immagini cliccando sulla X

### Nella Pagina Prodotto (Ecommerce)

Le immagini vengono visualizzate automaticamente in un carosello:
- Navigazione con frecce (desktop)
- Swipe su mobile
- Indicatori di posizione
- Contatore immagini

## 🧪 Testing

### Test Unitari

```bash
# Provider portal
cd baux-paws-access
npm test productImages.service.test.ts

# Ecommerce
cd ecommerce-homepage
npm test ProductImageCarousel.test.tsx
```

### Test Manuale

1. **Upload immagini:**
   - Carica 1-10 immagini per un prodotto
   - Verifica che vengano visualizzate correttamente
   - Verifica ordinamento

2. **Riordinamento:**
   - Trascina immagini per cambiarne l'ordine
   - Verifica che l'ordine venga salvato

3. **Eliminazione:**
   - Elimina un'immagine
   - Verifica che venga rimossa da storage e database

4. **Carosello:**
   - Visita una pagina prodotto con immagini
   - Naviga con frecce
   - Testa swipe su mobile
   - Verifica indicatori

## 🐛 Troubleshooting

### Immagini non si caricano

1. Verifica che il bucket `product-images` esista
2. Verifica che il bucket sia pubblico
3. Verifica le RLS policies
4. Controlla la console del browser per errori

### Immagini non si visualizzano nel carosello

1. Verifica che le immagini siano state caricate correttamente
2. Verifica che `secondaryImages` sia popolato nel Product type
3. Controlla la console per errori di caricamento

### Errore "Massimo 10 immagini"

Il sistema limita a 10 immagini per prodotto. Elimina immagini esistenti prima di caricarne di nuove.

## 📊 Performance

- Le immagini vengono caricate lazy
- Il carosello usa transizioni CSS per performance
- Le immagini sono ottimizzate da Supabase Storage
- Cache headers configurati per 1 ora

## 🔒 Sicurezza

- Solo i provider possono modificare le immagini dei loro prodotti
- Validazione file type e size lato client e server
- RLS policies per sicurezza database
- Storage policies per sicurezza file


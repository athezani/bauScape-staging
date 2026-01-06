# Test Plan for Product Images Feature

## 🧪 Test Checklist

### 1. Database Migration
- [ ] Applicare migrazione `20251229000000_create_product_images_table.sql`
- [ ] Verificare che la tabella `product_images` esista
- [ ] Verificare che le RLS policies siano attive
- [ ] Verificare che gli indici siano creati

### 2. Supabase Storage Bucket
- [ ] Creare bucket `product-images` (vedi `PRODUCT_IMAGES_SETUP.md`)
- [ ] Verificare che il bucket sia pubblico
- [ ] Verificare limiti file size (5MB)
- [ ] Verificare MIME types consentiti

### 3. Provider Portal - Upload Images

#### Test Upload Base
- [ ] Creare/modificare un prodotto
- [ ] Andare alla tab "Upload Foto"
- [ ] Verificare che la tab sia disabilitata se il prodotto non è salvato
- [ ] Salvare il prodotto
- [ ] Verificare che la tab "Upload Foto" sia ora abilitata

#### Test Upload File
- [ ] Caricare 1 immagine (JPEG)
- [ ] Caricare 1 immagine (PNG)
- [ ] Caricare 1 immagine (WebP)
- [ ] Verificare che immagini non valide vengano rifiutate (es. TXT)
- [ ] Verificare che file troppo grandi vengano rifiutati (>5MB)
- [ ] Caricare 10 immagini (massimo)
- [ ] Verificare che non sia possibile caricare più di 10 immagini

#### Test Drag & Drop
- [ ] Trascinare immagini nella zona di upload
- [ ] Verificare che le immagini vengano caricate
- [ ] Verificare feedback visivo durante il drag

#### Test Riordinamento
- [ ] Caricare almeno 3 immagini
- [ ] Trascinare un'immagine per cambiarne la posizione
- [ ] Verificare che l'ordine venga salvato
- [ ] Ricaricare la pagina e verificare che l'ordine sia persistito

#### Test Eliminazione
- [ ] Eliminare un'immagine
- [ ] Verificare che l'immagine venga rimossa dalla lista
- [ ] Verificare che l'immagine venga eliminata da Supabase Storage
- [ ] Verificare che il record venga eliminato dal database

#### Test Preview
- [ ] Verificare che le immagini vengano visualizzate correttamente
- [ ] Verificare che immagini con errori mostrino placeholder
- [ ] Verificare che il numero di immagine sia visualizzato correttamente

### 4. Ecommerce - Product Page Carousel

#### Test Visualizzazione Base
- [ ] Visitare una pagina prodotto senza immagini secondarie
- [ ] Verificare che venga mostrata solo l'immagine principale
- [ ] Verificare che non ci siano frecce di navigazione

#### Test Carosello con Immagini
- [ ] Visitare una pagina prodotto con immagini secondarie
- [ ] Verificare che il carosello mostri tutte le immagini
- [ ] Verificare che l'immagine principale sia la prima
- [ ] Verificare che le immagini secondarie seguano l'ordine corretto

#### Test Navigazione Desktop
- [ ] Cliccare freccia destra → verifica avanzamento
- [ ] Cliccare freccia sinistra → verifica indietro
- [ ] Verificare che alla fine si torni all'inizio (loop)
- [ ] Verificare che all'inizio si vada alla fine (loop)
- [ ] Verificare che le frecce appaiano al hover
- [ ] Verificare che le frecce siano accessibili via tastiera

#### Test Navigazione Mobile
- [ ] Swipe a sinistra → verifica avanzamento
- [ ] Swipe a destra → verifica indietro
- [ ] Verificare che lo swipe funzioni su diversi dispositivi

#### Test Navigazione Tastiera
- [ ] Premere freccia destra → verifica avanzamento
- [ ] Premere freccia sinistra → verifica indietro
- [ ] Verificare che funzioni solo quando il carosello è visibile

#### Test Indicatori
- [ ] Verificare che gli indicatori siano visibili
- [ ] Verificare che l'indicatore corrente sia evidenziato
- [ ] Cliccare su un indicatore → verifica che vada all'immagine corrispondente
- [ ] Verificare che il contatore mostri "X / Y" correttamente

#### Test Performance
- [ ] Verificare che le immagini si carichino lazy
- [ ] Verificare che le transizioni siano smooth
- [ ] Verificare che non ci siano lag durante la navigazione
- [ ] Verificare che il carosello funzioni su dispositivi lenti

#### Test Responsive
- [ ] Verificare su desktop (1920x1080)
- [ ] Verificare su tablet (768x1024)
- [ ] Verificare su mobile (375x667)
- [ ] Verificare che il carosello si adatti alle dimensioni dello schermo
- [ ] Verificare che le frecce siano sempre accessibili

### 5. Test Edge Cases

#### Test Limiti
- [ ] Prodotto con 0 immagini secondarie
- [ ] Prodotto con 1 immagine secondaria
- [ ] Prodotto con 10 immagini secondarie (massimo)
- [ ] Tentativo di caricare 11a immagine → verifica errore

#### Test Errori
- [ ] Immagine con URL rotto → verifica fallback
- [ ] Errore durante upload → verifica messaggio di errore
- [ ] Errore durante eliminazione → verifica messaggio di errore
- [ ] Errore durante riordinamento → verifica rollback

#### Test Concorrenza
- [ ] Due utenti che modificano lo stesso prodotto
- [ ] Upload simultaneo di immagini
- [ ] Riordinamento simultaneo

### 6. Test Accessibilità

- [ ] Verificare che le frecce abbiano aria-label
- [ ] Verificare che gli indicatori abbiano aria-label
- [ ] Verificare che le immagini abbiano alt text descrittivo
- [ ] Verificare navigazione via tastiera
- [ ] Verificare contrasto colori
- [ ] Verificare che funzioni con screen reader

### 7. Test Sicurezza

- [ ] Provider A non può modificare immagini di Provider B
- [ ] Utente non autenticato non può caricare immagini
- [ ] Verificare validazione file type lato server
- [ ] Verificare validazione file size lato server
- [ ] Verificare che RLS policies funzionino correttamente

## 📊 Test Results Template

```
Date: [DATA]
Tester: [NOME]
Environment: [DEV/STAGING/PROD]

### Database Migration
- Status: [PASS/FAIL]
- Notes: [NOTE]

### Supabase Storage
- Status: [PASS/FAIL]
- Notes: [NOTE]

### Provider Portal Upload
- Status: [PASS/FAIL]
- Issues Found: [LISTA ISSUE]
- Notes: [NOTE]

### Ecommerce Carousel
- Status: [PASS/FAIL]
- Issues Found: [LISTA ISSUE]
- Notes: [NOTE]

### Performance
- Status: [PASS/FAIL]
- Load Time: [TEMPO]
- Notes: [NOTE]

### Overall
- Status: [PASS/FAIL]
- Critical Issues: [LISTA]
- Recommendations: [LISTA]
```

## 🐛 Known Issues

Nessun problema noto al momento.

## ✅ Sign-off

- [ ] Developer: [NOME] - [DATA]
- [ ] QA: [NOME] - [DATA]
- [ ] Product Owner: [NOME] - [DATA]


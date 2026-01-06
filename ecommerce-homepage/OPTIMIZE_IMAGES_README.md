# Ottimizzazione Immagini - Guida

## 🎯 Obiettivo

Ottimizzare le immagini in `/public` per ridurre le dimensioni e migliorare le performance.

## 📋 Cosa Fa lo Script

1. **Trova tutte le immagini** in `/public` (jpg, jpeg, png)
2. **Converte in WebP** (formato moderno, ~30-50% più piccolo)
3. **Converte in AVIF** (formato più moderno, ~40-60% più piccolo, se supportato)
4. **Ridimensiona** se necessario (max 1920px width)
5. **Ottimizza qualità** (85% per WebP, 80% per AVIF)

## 🚀 Come Usare

### 1. Esegui lo script

```bash
npm run optimize-images
```

### 2. Verifica i risultati

Lo script creerà file `.webp` e `.avif` accanto alle immagini originali:
- `hero-image.jpg` → `hero-image.webp` + `hero-image.avif`
- `favicon.png` → `favicon.webp` + `favicon.avif`

### 3. Next.js Image usa automaticamente i formati ottimizzati

**Non devi cambiare il codice!** Next.js Image:
- Cerca automaticamente `.webp` e `.avif` se disponibili
- Serve il formato migliore supportato dal browser
- Fallback automatico a formato originale se necessario

## 📊 Esempio Output

```
🖼️  Ottimizzazione immagini in /public

📂 Cercando immagini...
✅ Trovate 5 immagini

🔄 Processando: hero-image.jpg...
   ✅ WebP: 1433.6KB → 428.3KB (70.1% riduzione)
   ✅ AVIF: 1433.6KB → 312.5KB (78.2% riduzione)

📊 Riepilogo:
────────────────────────────────────────────────────────────
Immagini processate: 5
Dimensione originale totale: 3.17MB
Dimensione ottimizzata totale: 0.95MB
Risparmio totale: 2.22MB (70.0%)
────────────────────────────────────────────────────────────
```

## ⚙️ Configurazione

Puoi modificare i parametri nello script `scripts/optimize-images.js`:

```javascript
const MAX_WIDTH = 1920;      // Max width per desktop
const QUALITY_WEBP = 85;     // Qualità WebP (0-100)
const QUALITY_AVIF = 80;     // Qualità AVIF (0-100)
```

## 🔍 Verifica Risultati

Dopo l'ottimizzazione, verifica:

1. **Dimensioni file**: Le immagini `.webp` dovrebbero essere ~30-50% più piccole
2. **Qualità visiva**: Controlla che la qualità sia accettabile
3. **Performance**: Testa con Lighthouse per vedere il miglioramento LCP

## ⚠️ Note Importanti

1. **Le immagini originali vengono mantenute**: Lo script non elimina i file originali
2. **Next.js Image usa automaticamente i formati ottimizzati**: Non serve cambiare il codice
3. **Browser support**: 
   - WebP: Supportato da tutti i browser moderni (95%+)
   - AVIF: Supportato da browser moderni (Chrome, Firefox, Safari 16+)
4. **Fallback automatico**: Se il browser non supporta WebP/AVIF, Next.js serve il formato originale

## 🐛 Troubleshooting

### Errore: "sharp non è installato"

Next.js include `sharp` di default. Se vedi questo errore:
```bash
npm install sharp
```

### Le immagini non vengono ottimizzate

Verifica che:
1. Le immagini siano in `/public` o sottocartelle
2. I formati siano `.jpg`, `.jpeg`, o `.png`
3. I permessi di scrittura siano corretti

### Qualità troppo bassa

Aumenta `QUALITY_WEBP` o `QUALITY_AVIF` nello script (max 100).

### Qualità troppo alta (file troppo grandi)

Riduci `QUALITY_WEBP` o `QUALITY_AVIF` nello script (min 0).

## 📝 Best Practices

1. **Esegui lo script prima di ogni deploy** se aggiungi nuove immagini
2. **Mantieni le immagini originali** come backup
3. **Testa la qualità** dopo l'ottimizzazione
4. **Monitora le performance** con Lighthouse

## 🎯 Risultati Attesi

Dopo l'ottimizzazione:
- **Dimensioni immagini**: Riduzione del 30-70%
- **LCP**: Miglioramento significativo (da 9.9s a ~4-6s)
- **PageSpeed Score**: Miglioramento di 10-20 punti
- **Bandwidth**: Risparmio significativo per utenti mobile


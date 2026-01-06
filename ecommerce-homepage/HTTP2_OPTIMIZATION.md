# Ottimizzazioni HTTP/2

## ✅ HTTP/2 è già attivo su Vercel

**Vercel abilita automaticamente HTTP/2** per tutti i progetti deployati. Non è necessaria alcuna configurazione aggiuntiva per abilitarlo.

## 🚀 Vantaggi di HTTP/2

HTTP/2 offre significativi miglioramenti rispetto a HTTP/1.1:

1. **Multiplexing**: Più richieste simultanee su una singola connessione TCP, riducendo la latenza
2. **Header Compression (HPACK)**: Compressione delle intestazioni HTTP, riducendo l'overhead
3. **Server Push**: Il server può inviare risorse al client prima che vengano richieste (meno usato ora)
4. **Binary Framing**: Framing binario più efficiente rispetto al testo di HTTP/1.1

## 📋 Ottimizzazioni Implementate

### 1. Resource Hints nel Layout (`src/app/layout.tsx`)

Aggiunti resource hints per ottimizzare il caricamento delle risorse esterne:

- **DNS Prefetch**: Risolve i DNS in anticipo per domini esterni
  - Google Tag Manager
  - Supabase (tutti i sottodomini)
  - Stripe (API, JS, Checkout)
  - Google Fonts
  - iubenda

- **Preconnect**: Stabilisce connessioni TCP/TLS in anticipo per risorse critiche
  - Google Tag Manager
  - Google Fonts
  - Stripe (API e JS)

Questi hint permettono al browser di preparare le connessioni prima che siano necessarie, sfruttando il multiplexing di HTTP/2.

### 2. Configurazioni Next.js (`next.config.js`)

#### Compressione
- `compress: true` - Abilita compressione gzip (fallback per client che non supportano HTTP/2)

#### Cache Headers per Asset Statici
- Asset statici (JS, CSS, font, immagini) hanno `Cache-Control: public, max-age=31536000, immutable`
- Questo sfrutta meglio HTTP/2 riducendo le richieste ripetute

#### Client Hints
- `Accept-CH: DPR, Viewport-Width, Width` - Permette al server di ottimizzare le risorse in base al dispositivo

### 3. Ottimizzazioni Immagini

Le immagini sono già configurate con:
- Formati moderni (AVIF, WebP)
- Cache ottimizzata
- Compressione automatica

## ⚠️ Note Importanti

### Domain Sharding NON è necessario con HTTP/2

Con HTTP/1.1, era comune usare il "domain sharding" (caricare risorse da più domini) per aggirare il limite di 6 connessioni per dominio. 

**Con HTTP/2 questo NON è più necessario** perché:
- HTTP/2 supporta multiplexing su una singola connessione
- Il domain sharding può addirittura peggiorare le prestazioni con HTTP/2

### HTTPS è obbligatorio

HTTP/2 funziona solo su HTTPS. Vercel fornisce HTTPS automaticamente per tutti i progetti, quindi non c'è nulla da configurare.

## 🔍 Verifica HTTP/2

Per verificare che HTTP/2 sia attivo:

1. Apri il sito in Chrome/Firefox
2. Apri DevTools → Network
3. Clicca su una richiesta
4. Nella tab "Headers", cerca "Protocol" → dovrebbe mostrare "h2" (HTTP/2)

Oppure usa strumenti online:
- [HTTP/2 Test](https://tools.keycdn.com/http2-test)
- [WebPageTest](https://www.webpagetest.org/)

## 📊 Benefici Attesi

Con queste ottimizzazioni, dovresti vedere:

- ⚡ **Riduzione della latenza**: Multiplexing riduce il tempo di attesa tra le richieste
- 📦 **Riduzione dell'overhead**: Header compression riduce la dimensione delle richieste
- 🚀 **Caricamento più veloce**: Resource hints preparano le connessioni in anticipo
- 💾 **Meno richieste**: Cache ottimizzata riduce le richieste ripetute

## 🔄 Prossimi Passi (Opzionali)

Per ulteriori ottimizzazioni, considera:

1. **HTTP/3 (QUIC)**: Vercel supporta anche HTTP/3, che sarà abilitato automaticamente quando disponibile
2. **Resource Preloading**: Preload di risorse critiche specifiche (già fatto parzialmente con resource hints)
3. **Code Splitting**: Next.js già fa code splitting automatico, ma puoi ottimizzare ulteriormente
4. **Service Workers**: Per caching offline e prestazioni ancora migliori

## 📚 Riferimenti

- [HTTP/2 su Vercel](https://vercel.com/docs/concepts/edge-network/overview)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev - HTTP/2](https://web.dev/performance-http2/)


# Checklist Test Frontend - Pagine Migrate Next.js

## 🎯 Obiettivo
Verificare che tutte le pagine migrate funzionino correttamente e che non ci siano regressioni rispetto alla versione Vite.

---

## 📋 Test Generali (Tutte le Pagine)

### ✅ Layout e UI
- [ ] Header visibile e funzionante
- [ ] Footer visibile e funzionante
- [ ] Menu mobile funziona (su mobile/tablet)
- [ ] Logo cliccabile e porta alla home
- [ ] Link di navigazione nel footer funzionano
- [ ] Stili CSS applicati correttamente
- [ ] Design responsive (mobile, tablet, desktop)

### ✅ Performance
- [ ] Pagina carica velocemente (< 2s)
- [ ] Nessun errore in console del browser
- [ ] Immagini caricano correttamente
- [ ] Font caricano correttamente

### ✅ SEO
- [ ] Titolo pagina corretto (verifica nella tab del browser)
- [ ] Meta description presente (View Page Source → cerca `<meta name="description"`)
- [ ] Open Graph tags presenti (View Page Source → cerca `og:`)
- [ ] URL corretto nella barra degli indirizzi

---

## 🏠 HomePage (`/`)

### ✅ Contenuto
- [ ] Hero section visibile con immagine
- [ ] Testo "Avventure a 4 zampe" visibile
- [ ] CTA "Esplora le Esperienze" funziona
- [ ] Sezione "Prodotti in Evidenza" visibile
- [ ] Prodotti vengono caricati e visualizzati
- [ ] Prodotti mostrano: immagine, titolo, prezzo
- [ ] Click su prodotto porta alla pagina dettaglio
- [ ] Sezione "ValueSection" visibile
- [ ] CTA finale "Scopri Tutte le Esperienze" funziona

### ✅ Interattività
- [ ] Click su prodotto → naviga a `/prodotto/[type]/[id]`
- [ ] Pulsante "Mostra altro" funziona (se ci sono >9 prodotti)
- [ ] Pulsante "Mostra altro" carica altri 9 prodotti
- [ ] Navigazione da header funziona (Esperienze, Viaggi, Classi, Contatti)

### ✅ SEO Specifico
- [ ] Titolo: "FlixDog - Avventure a 4 zampe"
- [ ] Meta description contiene "esperienze uniche pensate per te e il tuo cane"
- [ ] Open Graph title e description presenti

### ✅ Errori
- [ ] Se non ci sono prodotti, mostra messaggio "Nessun prodotto disponibile"
- [ ] Se c'è errore nel caricamento, mostra messaggio di errore

---

## 🍪 Cookie Policy (`/cookie-policy`)

### ✅ Contenuto
- [ ] Titolo "Cookie Policy" visibile
- [ ] Data ultimo aggiornamento visibile
- [ ] Tutte le sezioni presenti (1-12):
  - [ ] Cosa sono i Cookie
  - [ ] Tipi di Cookie Utilizzati
  - [ ] Finalità dell'Utilizzo
  - [ ] Durata dei Cookie
  - [ ] Gestione dei Cookie
  - [ ] Cookie di Terze Parti
  - [ ] I Tuoi Diritti
  - [ ] Base Giuridica
  - [ ] Trasferimento dei Dati
  - [ ] Modifiche alla Policy
  - [ ] Contatti
  - [ ] Autorità di Controllo
- [ ] Link a Stripe Privacy Policy funziona
- [ ] Link a Garante Privacy funziona
- [ ] Email info@flixdog.com cliccabile

### ✅ SEO Specifico
- [ ] Titolo: "Cookie Policy - FlixDog"
- [ ] Meta description contiene "gestione dei cookie su FlixDog"

---

## 📜 Regolamento (`/regolamento-a-6-zampe`)

### ✅ Contenuto
- [ ] Titolo "Regolamento di Partecipazione FlixDog" visibile
- [ ] Tutte le sezioni presenti (1-6):
  - [ ] Il Patto di Responsabilità e Collaborazione
  - [ ] Protezione FlixDog: Viaggi Senza Pensieri
  - [ ] Identikit del Partecipante
  - [ ] Logistica e Condizioni di Viaggio
  - [ ] Codice di Condotta e Attrezzatura
  - [ ] Sorrisi, Code e Community
- [ ] Box finale con testo evidenziato visibile

### ✅ SEO Specifico
- [ ] Titolo: "Regolamento a 6 Zampe - FlixDog"
- [ ] Meta description contiene "regolamento e linee guida"

---

## 📧 Contatti (`/contatti`)

### ✅ Contenuto
- [ ] Titolo "Contatti" visibile
- [ ] Email di contatto visibile: info@flixdog.com
- [ ] Form di contatto presente con campi:
  - [ ] Nome (obbligatorio)
  - [ ] Cognome (obbligatorio)
  - [ ] Email (obbligatorio)
  - [ ] Messaggio (obbligatorio)
- [ ] Pulsante "Invia messaggio" visibile

### ✅ Funzionalità Form
- [ ] Form non invia se campi vuoti
- [ ] Validazione email (formato corretto)
- [ ] Click "Invia messaggio" → mostra loading
- [ ] Dopo invio riuscito → mostra messaggio di successo verde
- [ ] Dopo invio riuscito → form si resetta
- [ ] Dopo errore → mostra messaggio di errore rosso
- [ ] Scroll automatico al messaggio di successo/errore

### ✅ Test Invio Email
- [ ] Compila tutti i campi
- [ ] Clicca "Invia messaggio"
- [ ] Verifica che arrivi email a info@flixdog.com
- [ ] Verifica contenuto email (nome, cognome, email, messaggio)

### ✅ SEO Specifico
- [ ] Titolo: "Contatti - FlixDog"
- [ ] Meta description contiene "contatta FlixDog"

---

## 🔍 Test SEO Avanzati

### ✅ View Page Source (Ctrl+U / Cmd+U)
Per ogni pagina, apri "View Page Source" e verifica:

#### HomePage
- [ ] `<title>FlixDog - Avventure a 4 zampe</title>` presente
- [ ] `<meta name="description" content="...">` presente
- [ ] `<meta property="og:title" content="...">` presente
- [ ] `<meta property="og:description" content="...">` presente
- [ ] `<meta property="og:url" content="https://flixdog.com">` presente
- [ ] Google Analytics script presente nel `<head>`

#### Cookie Policy
- [ ] `<title>Cookie Policy - FlixDog</title>` presente
- [ ] Meta description presente

#### Regolamento
- [ ] `<title>Regolamento a 6 Zampe - FlixDog</title>` presente
- [ ] Meta description presente

#### Contatti
- [ ] `<title>Contatti - FlixDog</title>` presente
- [ ] Meta description presente

### ✅ Google Analytics
- [ ] Apri DevTools → Network tab
- [ ] Filtra per "gtag" o "google-analytics"
- [ ] Naviga tra le pagine
- [ ] Verifica che le richieste a Google Analytics vengano inviate

---

## 📱 Test Responsive

### ✅ Mobile (< 768px)
- [ ] Menu hamburger funziona
- [ ] Menu mobile si apre e chiude correttamente
- [ ] Tutti i contenuti sono leggibili
- [ ] Form contatti è usabile
- [ ] Prodotti in griglia (1 colonna su mobile)

### ✅ Tablet (768px - 1024px)
- [ ] Layout si adatta correttamente
- [ ] Prodotti in griglia (2 colonne)

### ✅ Desktop (> 1024px)
- [ ] Layout completo
- [ ] Prodotti in griglia (3 colonne)
- [ ] Menu desktop visibile

---

## 🔗 Test Navigazione

### ✅ Link Interni
- [ ] Header → Home → funziona
- [ ] Header → Esperienze → funziona (ancora Vite, ma link deve funzionare)
- [ ] Header → Viaggi → funziona (ancora Vite)
- [ ] Header → Classi → funziona (ancora Vite)
- [ ] Header → Contatti → funziona (Next.js)
- [ ] Footer → Cookie Policy → funziona (Next.js)
- [ ] Footer → Privacy Policy → funziona (link esterno)
- [ ] Footer → Termini di Servizio → funziona (link esterno)

### ✅ Link Prodotti
- [ ] Click su prodotto dalla HomePage → naviga correttamente
- [ ] URL formato: `/prodotto/[type]/[id]`
- [ ] Pagina prodotto carica (ancora Vite, ma deve funzionare)

---

## ⚡ Test Performance

### ✅ Lighthouse (Chrome DevTools)
Per ogni pagina migrate, esegui Lighthouse:

1. Apri Chrome DevTools (F12)
2. Tab "Lighthouse"
3. Seleziona: Performance, Accessibility, Best Practices, SEO
4. Click "Generate report"

#### Metriche da verificare:
- [ ] **Performance Score**: > 80 (obiettivo: > 90)
- [ ] **First Contentful Paint (FCP)**: < 1.8s
- [ ] **Largest Contentful Paint (LCP)**: < 2.5s
- [ ] **Time to Interactive (TTI)**: < 3.8s
- [ ] **SEO Score**: > 90
- [ ] **Accessibility Score**: > 90

### ✅ Network Tab
- [ ] Nessuna richiesta fallita (rosso)
- [ ] Immagini caricate correttamente
- [ ] Font caricate correttamente
- [ ] JavaScript bundle non troppo grande

---

## 🐛 Test Errori e Edge Cases

### ✅ HomePage
- [ ] Se Supabase non risponde → mostra errore gracefully
- [ ] Se non ci sono prodotti → mostra messaggio appropriato
- [ ] Se ci sono molti prodotti → "Mostra altro" funziona

### ✅ Contatti
- [ ] Form vuoto → pulsante disabilitato
- [ ] Email non valida → validazione funziona
- [ ] Invio fallito → mostra errore
- [ ] Invio riuscito → mostra successo e resetta form

---

## 📊 Confronto con Versione Vite

### ✅ Verifica che non ci siano regressioni:
- [ ] Stili identici alla versione Vite
- [ ] Funzionalità identiche
- [ ] Performance uguale o migliore
- [ ] Nessun elemento mancante
- [ ] Nessun link rotto

---

## ✅ Checklist Rapida (5 minuti)

Se hai poco tempo, testa almeno:

1. [ ] HomePage carica e mostra prodotti
2. [ ] Click su prodotto → naviga correttamente
3. [ ] Cookie Policy → tutte le sezioni visibili
4. [ ] Regolamento → tutte le sezioni visibili
5. [ ] Contatti → form funziona e invia email
6. [ ] Header/Footer → link funzionano
7. [ ] Mobile → menu hamburger funziona
8. [ ] View Source → meta tag presenti
9. [ ] Console browser → nessun errore
10. [ ] Performance → pagina carica velocemente

---

## 📝 Note

- **Pagine ancora su Vite**: Esperienze, Viaggi, Classi, ProductDetail, Checkout, ThankYou
- **Pagine migrate a Next.js**: Home, Cookie Policy, Regolamento, Contatti
- Se trovi problemi, annotali e me li comunichi per fix immediati

---

## 🎯 Priorità Test

### 🔴 Alta Priorità (Test Subito)
1. HomePage carica prodotti
2. Form Contatti invia email
3. Navigazione funziona
4. SEO meta tag presenti

### 🟡 Media Priorità
1. Performance Lighthouse
2. Responsive design
3. Error handling

### 🟢 Bassa Priorità
1. Test avanzati SEO
2. Confronto dettagliato con Vite


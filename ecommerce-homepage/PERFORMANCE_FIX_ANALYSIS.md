# Analisi Problemi Performance e Soluzioni

## 📊 Metriche Attuali (in rosso)

- **First Contentful Paint (FCP)**: 3.0s ⚠️ (target: < 1.8s)
- **Largest Contentful Paint (LCP)**: 15.3s 🔴 (target: < 2.5s)
- **Time to Interactive (TTI)**: 16.2s 🔴 (target: < 3.8s)

## 🔍 Problemi Identificati

### 1. **LCP (15.3s) - Immagine Hero Non Ottimizzata** 🔴 CRITICO

**Problema:**
- L'immagine Hero (`/hero-image.jpg`) usa `ImageWithFallback` invece di Next.js `Image`
- Non ha `priority` loading, quindi viene caricata con lazy loading
- Immagine non ottimizzata (formato, dimensioni, compressione)
- Nessun preload dell'immagine critica

**File coinvolti:**
- `src/components/Hero.tsx` - usa `ImageWithFallback`
- `src/components/HomePageClient.tsx` - passa `imageUrl="/hero-image.jpg"`

**Impatto:** LCP è 15.3s perché l'immagine Hero (elemento più grande) viene caricata troppo tardi.

---

### 2. **FCP (3.0s) - Font e Script Bloccanti** ⚠️

**Problemi:**

#### a) Google Fonts caricato in modo bloccante
- Font caricato con `@import` nel CSS (`src/index.css` e `src/styles/globals.css`)
- `@import` blocca il rendering fino al caricamento del font
- Nessun uso di `next/font` per ottimizzazione automatica

#### b) Script nel `<head>` bloccanti
- Google Analytics caricato nel `<head>` (anche se async, può ritardare)
- Script iubenda caricato nel `<head>` di `index.html` (bloccante)
- Script duplicati tra `layout.tsx` e `index.html`

**File coinvolti:**
- `src/index.css` - `@import url('https://fonts.googleapis.com/css2?family=Ubuntu...')`
- `src/styles/globals.css` - stesso import duplicato
- `src/app/layout.tsx` - Google Analytics nel head
- `index.html` - Google Analytics e iubenda nel head

**Impatto:** FCP ritardato perché il browser deve attendere font e script prima di renderizzare.

---

### 3. **TTI (16.2s) - Bundle JavaScript Grande** 🔴

**Problemi:**
- Molte dipendenze Radix UI (20+ componenti) caricate insieme
- Nessun code splitting per componenti non critici
- Script esterni (iubenda, Google Analytics) possono bloccare l'interattività
- Font caricato in modo bloccante ritarda l'interattività

**Impatto:** TTI molto alto perché il browser deve scaricare ed eseguire tutto il JavaScript prima che la pagina sia interattiva.

---

## ✅ Soluzioni Proposte

### **Soluzione 1: Ottimizzare Immagine Hero (LCP)** 🔴 PRIORITÀ ALTA

**Azione:** Usare Next.js `Image` con `priority` per l'immagine Hero

**Modifiche:**

1. **Modificare `src/components/Hero.tsx`:**
   - Sostituire `ImageWithFallback` con Next.js `Image`
   - Aggiungere `priority` prop
   - Aggiungere `fetchpriority="high"` e dimensioni esplicite

2. **Aggiungere preload nel `layout.tsx`:**
   - Preload dell'immagine Hero nel `<head>`

**Beneficio atteso:** LCP da 15.3s → ~2-3s (miglioramento ~80%)

---

### **Soluzione 2: Ottimizzare Font Loading (FCP)** ⚠️ PRIORITÀ ALTA

**Azione:** Usare `next/font/google` invece di `@import`

**Modifiche:**

1. **Modificare `src/app/layout.tsx`:**
   - Importare `Ubuntu` da `next/font/google`
   - Rimuovere `@import` da CSS files
   - Applicare font al body

2. **Rimuovere import da:**
   - `src/index.css`
   - `src/styles/globals.css`

**Beneficio atteso:** FCP da 3.0s → ~1.5-2.0s (miglioramento ~40%)

---

### **Soluzione 3: Defer Script Non Critici (FCP + TTI)** ⚠️

**Azione:** Spostare script non critici dopo il rendering iniziale

**Modifiche:**

1. **Google Analytics:**
   - Spostare in un componente client separato
   - Caricare dopo `useEffect` (dopo il rendering iniziale)
   - Rimuovere duplicati tra `layout.tsx` e `index.html`

2. **iubenda:**
   - Caricare in modo asincrono dopo il rendering
   - Usare `defer` o caricare dinamicamente

**Beneficio atteso:** FCP migliorato, TTI da 16.2s → ~8-10s (miglioramento ~40%)

---

### **Soluzione 4: Code Splitting Componenti Non Critici (TTI)** ⚠️

**Azione:** Lazy load componenti non visibili sopra la fold

**Modifiche:**

1. **Lazy load componenti:**
   - `ValueSection` (sotto la fold)
   - `FooterNext` (sotto la fold)
   - `MobileMenu` (solo quando aperto)

2. **Usare `next/dynamic` con `ssr: false` per componenti pesanti**

**Beneficio atteso:** TTI migliorato riducendo JavaScript iniziale

---

### **Soluzione 5: Ottimizzare Immagini ProductCard (LCP secondario)** 

**Azione:** Usare Next.js `Image` anche per ProductCard

**Modifiche:**

1. **Modificare `src/components/ProductCard.tsx`:**
   - Sostituire `ImageWithFallback` con Next.js `Image`
   - Mantenere `loading="lazy"` (non priority)
   - Aggiungere dimensioni esplicite

**Beneficio atteso:** Miglioramento generale delle performance delle immagini

---

## 📋 Piano di Implementazione

### Fase 1: Fix Critici (LCP)
1. ✅ Ottimizzare immagine Hero con Next.js Image + priority
2. ✅ Aggiungere preload immagine Hero

### Fase 2: Fix FCP
3. ✅ Migrare Google Fonts a `next/font`
4. ✅ Defer Google Analytics

### Fase 3: Fix TTI
5. ✅ Defer iubenda
6. ✅ Code splitting componenti non critici

### Fase 4: Ottimizzazioni Aggiuntive
7. ✅ Ottimizzare ProductCard images
8. ✅ Verificare bundle size e ottimizzare

---

## 🎯 Risultati Attesi

Dopo le ottimizzazioni:

- **FCP**: 3.0s → **~1.5-2.0s** ✅ (target: < 1.8s)
- **LCP**: 15.3s → **~2.0-3.0s** ✅ (target: < 2.5s)
- **TTI**: 16.2s → **~5-8s** ✅ (target: < 3.8s)

**Miglioramento complessivo stimato: ~70-80%**

---

## 📝 Note Aggiuntive

- Verificare che l'immagine `hero-image.jpg` sia ottimizzata (formato WebP/AVIF, dimensioni appropriate)
- Considerare l'uso di CDN per immagini statiche
- Monitorare bundle size con `@next/bundle-analyzer`
- Testare su connessioni lente (3G throttling)


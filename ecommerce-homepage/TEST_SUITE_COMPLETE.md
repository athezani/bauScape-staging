# Suite di Test Completa - Pre-Migrazione Next.js

## 🎯 Obiettivo
Test completi per garantire ZERO regressioni durante la migrazione. Ogni funzionalità deve essere testata prima e dopo ogni step di migrazione.

## 📋 Indice Test

1. [Test Funzionalità Frontend](#test-funzionalità-frontend)
2. [Test API e Backend](#test-api-e-backend)
3. [Test Performance](#test-performance)
4. [Test SEO e Metadata](#test-seo-e-metadata)
5. [Test Integrazione](#test-integrazione)
6. [Test E2E](#test-e2e)
7. [Test Regressione](#test-regressione)

---

## 1. Test Funzionalità Frontend

### 1.1 Routing e Navigazione

#### Test: Navigazione tra pagine
```typescript
// tests/e2e/navigation.test.ts
describe('Navigation', () => {
  it('should navigate from home to experiences', async () => {
    // Test completo
  });
  
  it('should navigate from experiences to product detail', async () => {
    // Test completo
  });
  
  it('should navigate back from product to list', async () => {
    // Test completo
  });
  
  it('should maintain scroll position on navigation', async () => {
    // Test completo
  });
  
  it('should handle browser back/forward buttons', async () => {
    // Test completo
  });
});
```

**Checklist**:
- [ ] Home → Esperienze
- [ ] Home → Viaggi
- [ ] Home → Classi
- [ ] Lista → Dettaglio Prodotto
- [ ] Dettaglio → Lista (back)
- [ ] Dettaglio → Checkout
- [ ] Checkout → Thank You
- [ ] URL diretti funzionanti
- [ ] 404 per URL non validi
- [ ] Scroll to top su navigazione

### 1.2 Pagine Statiche

#### Test: Cookie Policy
- [ ] Pagina carica correttamente
- [ ] Contenuto completo visibile
- [ ] Link interni funzionanti
- [ ] SEO meta tag presenti

#### Test: Regolamento
- [ ] Pagina carica correttamente
- [ ] Contenuto completo visibile
- [ ] Formattazione corretta

#### Test: Contatti
- [ ] Pagina carica correttamente
- [ ] Form funzionante (se presente)
- [ ] Link email/telefono funzionanti

### 1.3 Pagine Dinamiche

#### Test: HomePage
- [ ] Prodotti caricati correttamente
- [ ] Hero section visibile
- [ ] Sezioni prodotti visibili
- [ ] Filtri funzionanti (se presenti)
- [ ] Loading state corretto
- [ ] Error state corretto
- [ ] Empty state corretto

#### Test: ExperiencesPage
- [ ] Solo prodotti tipo 'experience'
- [ ] Ordinamento prezzo funzionante
- [ ] Filtri funzionanti
- [ ] Paginazione (se presente)
- [ ] Click prodotto → navigazione corretta

#### Test: TripsPage
- [ ] Solo prodotti tipo 'trip'
- [ ] Date range visibili
- [ ] Durata viaggio visibile
- [ ] Programma caricato (se presente)

#### Test: ClassesPage
- [ ] Solo prodotti tipo 'class'
- [ ] Orari visibili
- [ ] Date disponibili visibili

### 1.4 ProductDetailPage

#### Test: Caricamento Prodotto
- [ ] Prodotto caricato correttamente
- [ ] Immagini caricate
- [ ] Informazioni complete visibili
- [ ] Prezzo calcolato correttamente
- [ ] Disponibilità caricata

#### Test: AvailabilitySelector
- [ ] Date disponibili mostrate
- [ ] Slot temporali mostrati
- [ ] Selezione data funzionante
- [ ] Selezione slot funzionante
- [ ] Limiti guests/dogs corretti
- [ ] Prezzo aggiornato in base a selezione

#### Test: Booking Form
- [ ] Input guests funzionante
- [ ] Input dogs funzionante
- [ ] Validazione input
- [ ] Calcolo prezzo totale
- [ ] Disabilitato quando sold out
- [ ] Messaggio errore quando necessario

#### Test: Program (per trips)
- [ ] Giorni programma caricati
- [ ] Attività per giorno visibili
- [ ] Expand/collapse funzionante

#### Test: FAQs
- [ ] FAQs caricate
- [ ] Expand/collapse funzionante
- [ ] Contenuto corretto

### 1.5 InternalCheckoutPage

#### Test: Form Cliente
- [ ] Input nome valido
- [ ] Input cognome valido
- [ ] Input email valido
- [ ] Input telefono valido
- [ ] Validazione email
- [ ] Validazione telefono

#### Test: Form B2B
- [ ] Toggle B2B funzionante
- [ ] Campi B2B visibili quando attivo
- [ ] Ragione sociale obbligatoria
- [ ] P.IVA validazione formato
- [ ] SDI Code validazione
- [ ] PEC Email validazione formato
- [ ] Nazione selezionabile

#### Test: Riepilogo Ordine
- [ ] Prodotto corretto mostrato
- [ ] Data/slot corretti
- [ ] Guests/dogs corretti
- [ ] Prezzo base corretto
- [ ] Prezzo totale corretto
- [ ] Sconto applicato (se presente)

#### Test: Submit Checkout
- [ ] Loading state durante submit
- [ ] Redirect a Stripe corretto
- [ ] Error handling corretto
- [ ] Dati inviati correttamente

### 1.6 ThankYouPage

#### Test: Post-Pagamento
- [ ] Pagina carica con session_id
- [ ] Dettagli ordine mostrati
- [ ] Email conferma menzionata
- [ ] Link prodotti correlati funzionanti

### 1.7 Componenti UI

#### Test: Header
- [ ] Logo cliccabile → home
- [ ] Menu navigazione funzionante
- [ ] Mobile menu funzionante
- [ ] Link attivi evidenziati

#### Test: Footer
- [ ] Link funzionanti
- [ ] Social links funzionanti
- [ ] Copyright corretto

#### Test: ProductCard
- [ ] Immagine caricata
- [ ] Titolo visibile
- [ ] Prezzo visibile
- [ ] Location visibile
- [ ] Click funzionante
- [ ] Hover effects funzionanti

#### Test: AvailabilitySelector
- [ ] Date disponibili mostrate
- [ ] Date passate disabilitate
- [ ] Slot temporali mostrati
- [ ] Selezione funzionante
- [ ] Disponibilità aggiornata

---

## 2. Test API e Backend

### 2.1 Supabase Integration

#### Test: Fetch Prodotti
```typescript
// tests/integration/supabase-products.test.ts
describe('Supabase Products', () => {
  it('should fetch all experiences', async () => {
    // Test reale con Supabase
  });
  
  it('should fetch single product', async () => {
    // Test reale
  });
  
  it('should handle errors gracefully', async () => {
    // Test error handling
  });
});
```

**Checklist**:
- [ ] Fetch experiences
- [ ] Fetch trips
- [ ] Fetch classes
- [ ] Fetch single product (experience)
- [ ] Fetch single product (trip)
- [ ] Fetch single product (class)
- [ ] Fetch availability slots
- [ ] Fetch program (trips)
- [ ] Fetch FAQs
- [ ] Error handling network errors
- [ ] Error handling 404
- [ ] Error handling timeout

### 2.2 Stripe Integration

#### Test: Checkout Session Creation
- [ ] Session creata correttamente
- [ ] Redirect URL corretto
- [ ] Dati cliente corretti
- [ ] Dati prodotto corretti
- [ ] Prezzo totale corretto
- [ ] Metadata corretti

#### Test: Webhook Stripe
```typescript
// tests/integration/stripe-webhook.test.ts
describe('Stripe Webhook', () => {
  it('should handle checkout.session.completed', async () => {
    // Test webhook
  });
  
  it('should create booking in Supabase', async () => {
    // Test integrazione
  });
  
  it('should create order in Odoo', async () => {
    // Test integrazione Odoo
  });
});
```

**Checklist**:
- [ ] Webhook ricevuto correttamente
- [ ] Signature verification
- [ ] Booking creato in Supabase
- [ ] Order creato in Odoo
- [ ] Email inviata (se presente)
- [ ] Error handling

### 2.3 Odoo Integration

#### Test: Order Creation
- [ ] Order creato in Odoo
- [ ] Campi custom popolati
- [ ] B2B fields popolati (se B2B)
- [ ] Error handling

---

## 3. Test Performance

### 3.1 Lighthouse Metrics

#### Test: HomePage Performance
```typescript
// tests/performance/lighthouse.test.ts
describe('Performance', () => {
  it('should have FCP < 1.8s', async () => {
    // Test FCP
  });
  
  it('should have LCP < 2.5s', async () => {
    // Test LCP
  });
  
  it('should have TTI < 3.8s', async () => {
    // Test TTI
  });
  
  it('should have CLS < 0.1', async () => {
    // Test CLS
  });
});
```

**Checklist per ogni pagina**:
- [ ] FCP < 1.8s
- [ ] LCP < 2.5s
- [ ] TTI < 3.8s
- [ ] CLS < 0.1
- [ ] FID < 100ms
- [ ] TBT < 200ms
- [ ] Lighthouse Score > 90

### 3.2 Bundle Size

#### Test: JavaScript Bundle
- [ ] Bundle size < 500KB (gzipped)
- [ ] Code splitting funzionante
- [ ] Lazy loading immagini
- [ ] Tree shaking funzionante

### 3.3 Network Requests

#### Test: API Calls
- [ ] Numero richieste minimo
- [ ] Richieste in parallelo quando possibile
- [ ] Caching headers corretti
- [ ] Timeout gestiti

---

## 4. Test SEO e Metadata

### 4.1 Meta Tags

#### Test: HomePage SEO
```typescript
// tests/seo/metadata.test.ts
describe('SEO Metadata', () => {
  it('should have correct title', async () => {
    // Test title
  });
  
  it('should have correct description', async () => {
    // Test description
  });
  
  it('should have Open Graph tags', async () => {
    // Test OG tags
  });
  
  it('should have Twitter Card tags', async () => {
    // Test Twitter tags
  });
});
```

**Checklist per ogni pagina**:
- [ ] `<title>` presente e corretto
- [ ] `<meta name="description">` presente
- [ ] `<meta property="og:title">` presente
- [ ] `<meta property="og:description">` presente
- [ ] `<meta property="og:image">` presente
- [ ] `<meta property="og:url">` presente
- [ ] `<meta name="twitter:card">` presente
- [ ] `<link rel="canonical">` presente

### 4.2 Structured Data

#### Test: JSON-LD
- [ ] Structured data presente
- [ ] Schema.org Product valido
- [ ] Schema.org Organization valido
- [ ] Schema.org BreadcrumbList valido
- [ ] Validazione Google Rich Results

### 4.3 Sitemap

#### Test: Sitemap
- [ ] Sitemap generata
- [ ] Tutte le pagine incluse
- [ ] URL corretti
- [ ] lastModified corretto
- [ ] priority corretto

### 4.4 Social Sharing

#### Test: Open Graph
- [ ] Facebook Debugger: preview corretto
- [ ] Twitter Card Validator: preview corretto
- [ ] LinkedIn: preview corretto

---

## 5. Test Integrazione

### 5.1 Flow Completo

#### Test: Booking Flow End-to-End
```typescript
// tests/integration/booking-flow.test.ts
describe('Booking Flow', () => {
  it('should complete full booking flow', async () => {
    // 1. Navigate to product
    // 2. Select date/slot
    // 3. Select guests/dogs
    // 4. Click book
    // 5. Fill checkout form
    // 6. Submit
    // 7. Verify redirect to Stripe
    // 8. Verify booking in Supabase (mock)
    // 9. Verify order in Odoo (mock)
  });
});
```

**Checklist**:
- [ ] Home → Product → Checkout → Stripe
- [ ] Dati corretti in ogni step
- [ ] Prezzo calcolato correttamente
- [ ] Error handling in ogni step

### 5.2 B2B Flow

#### Test: B2B Booking
- [ ] Toggle B2B attivo
- [ ] Campi B2B compilati
- [ ] Validazione P.IVA
- [ ] Validazione PEC
- [ ] Order in Odoo con campi B2B

---

## 6. Test E2E

### 6.1 Playwright Tests

#### Setup Playwright
```typescript
// tests/e2e/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
});
```

#### Test: User Journey
```typescript
// tests/e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test';

test('complete user journey', async ({ page }) => {
  // 1. Visit home
  await page.goto('/');
  await expect(page).toHaveTitle(/FlixDog/);
  
  // 2. Navigate to experiences
  await page.click('text=Esperienze');
  await expect(page).toHaveURL(/.*esperienze/);
  
  // 3. Click on product
  await page.click('[data-testid="product-card"]:first-child');
  await expect(page).toHaveURL(/.*prodotto/);
  
  // 4. Select date
  await page.click('[data-testid="availability-date"]:first-child');
  
  // 5. Select slot
  await page.click('[data-testid="time-slot"]:first-child');
  
  // 6. Set guests
  await page.fill('[data-testid="guests-input"]', '2');
  
  // 7. Click book
  await page.click('text=Prenota');
  await expect(page).toHaveURL(/.*checkout/);
  
  // 8. Fill form
  await page.fill('[name="name"]', 'Test');
  await page.fill('[name="surname"]', 'User');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="phone"]', '1234567890');
  
  // 9. Submit
  await page.click('button[type="submit"]');
  
  // 10. Verify redirect to Stripe
  await expect(page).toHaveURL(/.*stripe\.com/);
});
```

**Checklist E2E**:
- [ ] Home page load
- [ ] Navigation tra pagine
- [ ] Product detail load
- [ ] Availability selection
- [ ] Checkout form
- [ ] Stripe redirect
- [ ] Thank you page
- [ ] Mobile responsive
- [ ] Error states
- [ ] Loading states

---

## 7. Test Regressione

### 7.1 Visual Regression

#### Test: Screenshot Comparison
```typescript
// tests/regression/visual.test.ts
describe('Visual Regression', () => {
  it('should match homepage screenshot', async () => {
    // Screenshot comparison
  });
  
  it('should match product page screenshot', async () => {
    // Screenshot comparison
  });
});
```

**Checklist**:
- [ ] HomePage screenshot
- [ ] ExperiencesPage screenshot
- [ ] ProductDetailPage screenshot
- [ ] CheckoutPage screenshot
- [ ] Mobile viewports
- [ ] Tablet viewports
- [ ] Desktop viewports

### 7.2 Functional Regression

#### Test: Tutte le Funzionalità
- [ ] Ogni test esistente passa
- [ ] Nessuna funzionalità rotta
- [ ] Performance non degradata
- [ ] SEO non degradato

---

## 📊 Report Test

### Template Report
```markdown
# Test Report - [Data]

## Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Skipped: W

## Coverage
- Lines: X%
- Functions: X%
- Branches: X%

## Performance
- FCP: Xs
- LCP: Xs
- TTI: Xs

## Issues
- [Lista issues]
```

---

## 🚀 Esecuzione Test

### Pre-Migrazione
```bash
# Eseguire TUTTI i test
npm run test:complete

# Generare baseline
npm run test:baseline
```

### Post-Migrazione (ogni step)
```bash
# Eseguire test specifici
npm run test:step-[N]

# Confrontare con baseline
npm run test:compare
```

### CI/CD
```bash
# Test automatici su ogni commit
npm run test:ci
```

---

## ✅ Checklist Finale Pre-Migrazione

- [ ] Tutti i test scritti
- [ ] Tutti i test passano
- [ ] Coverage > 80%
- [ ] Performance baseline registrata
- [ ] Screenshot baseline salvati
- [ ] E2E tests funzionanti
- [ ] Documentazione completa
- [ ] Team review completato

---

**IMPORTANTE**: Nessuna migrazione può procedere se anche un solo test fallisce!


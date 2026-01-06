# Piano di Migrazione Step-by-Step con Test

## 🎯 Principio Fondamentale
**ZERO TOLERANZA PER ERRORI**: Ogni step deve essere testato completamente prima di procedere al successivo.

## 📋 Processo per Ogni Step

1. **Preparazione**: Scrivere test per la funzionalità
2. **Eseguire test**: Verificare che tutti passino (baseline)
3. **Migrazione**: Implementare lo step
4. **Test immediato**: Eseguire test dopo migrazione
5. **Verifica manuale**: Test manuale completo
6. **Performance check**: Verificare performance non degradata
7. **Approval**: Solo se TUTTO passa, procedere

---

## 📦 Step 0: Preparazione Ambiente Test

### Obiettivo
Creare suite di test completa PRIMA di iniziare qualsiasi migrazione.

### Task
- [ ] Installare Playwright
- [ ] Configurare test E2E
- [ ] Scrivere test per tutte le pagine
- [ ] Scrivere test per tutte le funzionalità
- [ ] Creare baseline performance
- [ ] Creare baseline screenshot
- [ ] Documentare tutti i test

### Test da Eseguire
```bash
npm run test:baseline
```

### Criteri di Successo
- [ ] 100% test passano
- [ ] Coverage > 80%
- [ ] Baseline salvata
- [ ] Documentazione completa

### ⚠️ BLOCCO: Non procedere se anche un test fallisce!

---

## 📦 Step 1: Setup Next.js Base

### Obiettivo
Installare Next.js senza toccare codice esistente.

### Task
- [ ] Installare Next.js in branch separato
- [ ] Configurare `next.config.js`
- [ ] Creare struttura `app/` base
- [ ] Configurare TypeScript
- [ ] Configurare variabili d'ambiente
- [ ] **NON modificare codice esistente**

### Test da Eseguire
```bash
# Test che Vite ancora funziona
npm run dev  # Vite dev server

# Test che build Vite ancora funziona
npm run build  # Vite build

# Test che Next.js può avviare
npm run dev:next  # Next.js dev server (se configurato)
```

### Criteri di Successo
- [ ] Vite funziona normalmente
- [ ] Build Vite funziona
- [ ] Next.js installato correttamente
- [ ] Nessun errore TypeScript
- [ ] Variabili d'ambiente configurate

### ⚠️ BLOCCO: Se Vite non funziona più, rollback immediato!

---

## 📦 Step 2: Migrare Layout Base

### Obiettivo
Creare `app/layout.tsx` con Google Analytics e meta base.

### Task
- [ ] Creare `app/layout.tsx`
- [ ] Includere Google Analytics
- [ ] Includere meta tag base
- [ ] Includere Head/Footer (se globali)
- [ ] **Mantenere `index.html` esistente**

### Test da Eseguire
```bash
# Test che layout Next.js funziona
npm run test:layout

# Test che Google Analytics presente
npm run test:analytics

# Test che meta tag presenti
npm run test:metadata-base
```

### Test Manuali
- [ ] Avviare Next.js dev server
- [ ] Visitare pagina
- [ ] Verificare Google Analytics in Network tab
- [ ] Verificare meta tag in HTML source
- [ ] Verificare nessun errore console

### Criteri di Successo
- [ ] Layout renderizza correttamente
- [ ] Google Analytics presente
- [ ] Meta tag base presenti
- [ ] Nessun errore console
- [ ] Nessun warning

### ⚠️ BLOCCO: Se layout non funziona, fix prima di procedere!

---

## 📦 Step 3: Migrare Pagina Cookie Policy (Test)

### Obiettivo
Migrare prima pagina statica semplice come test.

### Task
- [ ] Creare `app/cookie-policy/page.tsx`
- [ ] Copiare contenuto da `src/pages/CookiePolicyPage.tsx`
- [ ] Convertire a Server Component
- [ ] Aggiungere `generateMetadata`
- [ ] **Mantenere pagina Vite esistente**

### Test da Eseguire
```bash
# Test funzionalità
npm run test:page-cookie-policy

# Test SEO
npm run test:seo-cookie-policy

# Test E2E
npm run test:e2e-cookie-policy

# Test performance
npm run test:perf-cookie-policy
```

### Test Manuali
- [ ] Visitare `/cookie-policy` in Next.js
- [ ] Verificare contenuto identico
- [ ] Verificare styling identico
- [ ] Verificare link funzionanti
- [ ] Verificare meta tag nel HTML
- [ ] Verificare structured data (se presente)
- [ ] Testare su mobile
- [ ] Testare su tablet
- [ ] Testare su desktop

### Confronto
- [ ] Screenshot comparison con Vite
- [ ] HTML comparison
- [ ] Performance comparison

### Criteri di Successo
- [ ] Contenuto identico
- [ ] Styling identico
- [ ] Funzionalità identica
- [ ] SEO migliore o uguale
- [ ] Performance migliore o uguale
- [ ] Nessun errore

### ⚠️ BLOCCO: Se anche una piccola differenza, fix prima di procedere!

---

## 📦 Step 4: Migrare Supabase Server Client

### Obiettivo
Creare client Supabase server-side senza toccare client esistente.

### Task
- [ ] Creare `src/lib/supabase-server.ts`
- [ ] Implementare `getSupabaseServerClient()`
- [ ] Testare fetch server-side
- [ ] **Mantenere `supabaseClient.ts` esistente**

### Test da Eseguire
```bash
# Test server client
npm run test:supabase-server

# Test che client esistente ancora funziona
npm run test:supabase-client
```

### Test Manuali
- [ ] Testare fetch server-side
- [ ] Verificare autenticazione
- [ ] Verificare error handling
- [ ] Verificare che client esistente non rotto

### Criteri di Successo
- [ ] Server client funziona
- [ ] Client esistente ancora funziona
- [ ] Nessun breaking change
- [ ] Error handling corretto

### ⚠️ BLOCCO: Se client esistente rotto, rollback!

---

## 📦 Step 5: Migrare HomePage

### Obiettivo
Migrare homepage con fetch server-side.

### Task
- [ ] Creare `app/page.tsx` (Server Component)
- [ ] Creare `src/components/HomePageClient.tsx` (Client Component)
- [ ] Implementare fetch server-side prodotti
- [ ] Convertire logica interattiva in Client Component
- [ ] Aggiungere `generateMetadata`
- [ ] Configurare ISR (revalidate: 60)
- [ ] **Mantenere `src/pages/HomePage.tsx` esistente**

### Test da Eseguire
```bash
# Test funzionalità
npm run test:page-home

# Test fetch dati
npm run test:home-data

# Test SEO
npm run test:seo-home

# Test E2E
npm run test:e2e-home

# Test performance
npm run test:perf-home
```

### Test Manuali
- [ ] Visitare `/` in Next.js
- [ ] Verificare prodotti caricati
- [ ] Verificare Hero section
- [ ] Verificare sezioni prodotti
- [ ] Testare click su prodotto
- [ ] Testare navigazione
- [ ] Verificare meta tag nel HTML source
- [ ] Verificare structured data
- [ ] Testare loading state (se presente)
- [ ] Testare error state
- [ ] Testare su mobile/tablet/desktop

### Confronto
- [ ] Screenshot comparison
- [ ] HTML comparison
- [ ] Performance comparison (FCP, LCP, TTI)
- [ ] SEO comparison (meta tag)

### Criteri di Successo
- [ ] Funzionalità identica
- [ ] Performance migliore o uguale
- [ ] SEO migliore (meta tag server-side)
- [ ] Dati caricati correttamente
- [ ] Nessun errore
- [ ] ISR funziona (testare revalidazione)

### ⚠️ BLOCCO: Se anche una funzionalità non funziona, fix!

---

## 📦 Step 6: Migrare ExperiencesPage

### Obiettivo
Migrare pagina esperienze con fetch server-side.

### Task
- [ ] Creare `app/esperienze/page.tsx`
- [ ] Creare `src/components/ExperiencesPageClient.tsx`
- [ ] Implementare fetch server-side
- [ ] Convertire logica interattiva
- [ ] Aggiungere `generateMetadata`
- [ ] Configurare ISR
- [ ] **Mantenere pagina Vite esistente**

### Test da Eseguire
```bash
npm run test:page-experiences
npm run test:seo-experiences
npm run test:e2e-experiences
npm run test:perf-experiences
```

### Test Manuali
- [ ] Visitare `/esperienze`
- [ ] Verificare solo prodotti 'experience'
- [ ] Testare ordinamento
- [ ] Testare filtri (se presenti)
- [ ] Testare click prodotto
- [ ] Verificare meta tag
- [ ] Testare responsive

### Criteri di Successo
- [ ] Funzionalità identica
- [ ] Performance migliore o uguale
- [ ] SEO migliore
- [ ] Nessun errore

### ⚠️ BLOCCO: Se non identico, fix!

---

## 📦 Step 7: Migrare TripsPage

### Obiettivo
Stesso processo di ExperiencesPage.

### Task
- [ ] Creare `app/viaggi/page.tsx`
- [ ] Creare `src/components/TripsPageClient.tsx`
- [ ] Implementare fetch server-side
- [ ] Aggiungere `generateMetadata`
- [ ] Configurare ISR

### Test
- [ ] Stessi test di ExperiencesPage
- [ ] Test specifici per trips (date, durata, programma)

### Criteri di Successo
- [ ] Stessi criteri di ExperiencesPage
- [ ] Date/durata visibili correttamente

---

## 📦 Step 8: Migrare ClassesPage

### Obiettivo
Stesso processo.

### Task
- [ ] Creare `app/classi/page.tsx`
- [ ] Creare `src/components/ClassesPageClient.tsx`
- [ ] Implementare fetch server-side
- [ ] Aggiungere `generateMetadata`
- [ ] Configurare ISR

### Test
- [ ] Stessi test
- [ ] Test specifici per classes (orari, date)

---

## 📦 Step 9: Migrare ProductDetailPage (CRITICO)

### Obiettivo
Migrare pagina prodotto più complessa.

### Task
- [ ] Creare `app/prodotto/[type]/[id]/page.tsx`
- [ ] Creare `src/components/ProductDetailPageClient.tsx`
- [ ] Implementare fetch server-side prodotto
- [ ] Implementare fetch server-side availability
- [ ] Implementare fetch server-side program (trips)
- [ ] Implementare fetch server-side FAQs
- [ ] Convertire logica interattiva
- [ ] Aggiungere `generateMetadata` dinamico
- [ ] Configurare ISR con `generateStaticParams`
- [ ] **Mantenere pagina Vite esistente**

### Test da Eseguire
```bash
npm run test:page-product-detail
npm run test:product-data
npm run test:product-availability
npm run test:product-program
npm run test:product-faqs
npm run test:seo-product
npm run test:e2e-product
npm run test:perf-product
```

### Test Manuali
- [ ] Visitare `/prodotto/experience/[id]`
- [ ] Visitare `/prodotto/trip/[id]`
- [ ] Visitare `/prodotto/class/[id]`
- [ ] Verificare tutte le informazioni
- [ ] Testare AvailabilitySelector
- [ ] Testare selezione date/slot
- [ ] Testare input guests/dogs
- [ ] Testare calcolo prezzo
- [ ] Testare programma (trips)
- [ ] Testare FAQs
- [ ] Testare click "Prenota"
- [ ] Verificare meta tag dinamici
- [ ] Verificare structured data
- [ ] Testare 404 per prodotto non esistente
- [ ] Testare prodotto disattivato

### Confronto
- [ ] Screenshot comparison
- [ ] HTML comparison
- [ ] Performance comparison
- [ ] SEO comparison (meta tag dinamici)

### Criteri di Successo
- [ ] Funzionalità 100% identica
- [ ] Performance migliore o uguale
- [ ] SEO migliore (meta tag server-side)
- [ ] Dati caricati correttamente
- [ ] Availability funziona
- [ ] Program funziona (trips)
- [ ] FAQs funzionano
- [ ] Nessun errore

### ⚠️ BLOCCO CRITICO: Questa è la pagina più importante. Zero tolleranza!

---

## 📦 Step 10: Migrare InternalCheckoutPage

### Obiettivo
Migrare checkout (molta interattività).

### Task
- [ ] Creare `app/checkout/page.tsx` (Client Component)
- [ ] Convertire form
- [ ] Convertire validazione
- [ ] Convertire submit
- [ ] Mantenere logica B2B
- [ ] **Mantenere pagina Vite esistente**

### Test da Eseguire
```bash
npm run test:page-checkout
npm run test:checkout-form
npm run test:checkout-validation
npm run test:checkout-b2b
npm run test:checkout-submit
npm run test:e2e-checkout
```

### Test Manuali
- [ ] Visitare `/checkout` con query params
- [ ] Verificare riepilogo ordine
- [ ] Testare form cliente
- [ ] Testare validazione
- [ ] Testare toggle B2B
- [ ] Testare form B2B
- [ ] Testare validazione P.IVA
- [ ] Testare validazione PEC
- [ ] Testare submit
- [ ] Verificare redirect Stripe
- [ ] Testare error handling

### Criteri di Successo
- [ ] Form funziona identicamente
- [ ] Validazione identica
- [ ] B2B funziona identicamente
- [ ] Submit funziona
- [ ] Redirect Stripe corretto
- [ ] Nessun errore

### ⚠️ BLOCCO CRITICO: Checkout è critico per business!

---

## 📦 Step 11: Migrare ThankYouPage

### Obiettivo
Migrare pagina post-pagamento.

### Task
- [ ] Creare `app/thank-you/page.tsx`
- [ ] Implementare fetch session_id
- [ ] Convertire logica
- [ ] Aggiungere `generateMetadata`

### Test
- [ ] Test con session_id valido
- [ ] Test con session_id invalido
- [ ] Test error handling

---

## 📦 Step 12: Migrare Altre Pagine Statiche

### Obiettivo
Migrare pagine rimanenti.

### Task
- [ ] Migrare `ContattiPage`
- [ ] Migrare `RegolamentoPage`
- [ ] Migrare altre pagine statiche

### Test
- [ ] Test per ogni pagina

---

## 📦 Step 13: Migrare API Routes

### Obiettivo
Migrare webhook e API.

### Task
- [ ] Migrare `api/stripe-webhook-odoo.ts` → `app/api/webhooks/stripe/route.ts`
- [ ] Migrare `api/create-odoo-custom-fields.ts` → `app/api/admin/odoo/route.ts`
- [ ] Testare webhook Stripe
- [ ] Testare integrazione Odoo

### Test da Eseguire
```bash
npm run test:api-stripe-webhook
npm run test:api-odoo
npm run test:integration-stripe
npm run test:integration-odoo
```

### Test Manuali
- [ ] Inviare webhook Stripe di test
- [ ] Verificare booking in Supabase
- [ ] Verificare order in Odoo
- [ ] Testare error handling

### Criteri di Successo
- [ ] Webhook funziona identicamente
- [ ] Integrazione Supabase funziona
- [ ] Integrazione Odoo funziona
- [ ] Error handling corretto

### ⚠️ BLOCCO CRITICO: API sono critiche per business!

---

## 📦 Step 14: Ottimizzazioni Performance

### Obiettivo
Ottimizzare immagini, bundle, etc.

### Task
- [ ] Convertire `<img>` in `<Image>` Next.js
- [ ] Ottimizzare bundle size
- [ ] Implementare lazy loading
- [ ] Configurare caching

### Test
- [ ] Test performance
- [ ] Test bundle size
- [ ] Test Lighthouse

---

## 📦 Step 15: Sitemap e SEO Finale

### Obiettivo
Implementare sitemap dinamica e ottimizzazioni SEO.

### Task
- [ ] Creare `app/sitemap.ts`
- [ ] Verificare tutti i meta tag
- [ ] Verificare structured data
- [ ] Testare social sharing

### Test
- [ ] Test sitemap
- [ ] Test SEO completo
- [ ] Test social sharing

---

## 📦 Step 16: Testing Finale Completo

### Obiettivo
Test completo di tutto.

### Task
- [ ] Eseguire tutti i test
- [ ] Test E2E completo
- [ ] Test performance completo
- [ ] Test SEO completo
- [ ] Test manuale completo
- [ ] Screenshot comparison finale
- [ ] Performance comparison finale

### Test da Eseguire
```bash
npm run test:complete
npm run test:e2e:complete
npm run test:perf:complete
npm run test:seo:complete
```

### Criteri di Successo
- [ ] 100% test passano
- [ ] Performance migliore o uguale
- [ ] SEO migliore
- [ ] Funzionalità 100% identica
- [ ] Nessun errore
- [ ] Nessun warning

### ⚠️ BLOCCO FINALE: Se anche un test fallisce, fix!

---

## 📦 Step 17: Deploy Graduale

### Obiettivo
Deploy su produzione con feature flag.

### Task
- [ ] Deploy su branch `nextjs-migration`
- [ ] Test su preview URL
- [ ] Deploy con feature flag
- [ ] Monitoraggio 24-48h
- [ ] Switch completo

### Test
- [ ] Test su preview
- [ ] Test su produzione (feature flag)
- [ ] Monitoraggio errori
- [ ] Monitoraggio performance

---

## 📊 Report Template per Ogni Step

```markdown
# Step [N]: [Nome Step] - Report

## Data: [Data]
## Sviluppatore: [Nome]

## Task Completati
- [ ] Task 1
- [ ] Task 2
- [ ] ...

## Test Eseguiti
- [ ] Test 1: ✅/❌
- [ ] Test 2: ✅/❌
- [ ] ...

## Risultati
- Funzionalità: ✅/❌
- Performance: ✅/❌
- SEO: ✅/❌
- Errori: [Lista]

## Confronto con Baseline
- Performance: [Differenza]
- Screenshot: [Differenze]

## Issues
- [Issue 1]
- [Issue 2]

## Decisione
- [ ] ✅ APPROVATO - Procedere al prossimo step
- [ ] ❌ BLOCCATO - Fix necessario

## Note
[Note aggiuntive]
```

---

## ⚠️ REGOLE FERREE

1. **Nessuno step può essere saltato**
2. **Nessun test può essere ignorato**
3. **Se anche un test fallisce, BLOCCO**
4. **Ogni step deve essere approvato prima di procedere**
5. **Rollback immediato se qualcosa si rompe**
6. **Documentazione completa per ogni step**

---

**ZERO TOLERANZA PER ERRORI = SUCCESSO GARANTITO**


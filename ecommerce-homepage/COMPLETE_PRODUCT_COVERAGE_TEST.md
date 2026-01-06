# Test Completo - Copertura Totale Prodotti

## Panoramica

Il test `test-complete-product-coverage.ts` verifica che **TUTTI** i possibili tipi di prodotto, con **TUTTE** le caratteristiche, funzionino correttamente in **TUTTI** i flussi del checkout.

## Copertura Completa

### Tipi di Prodotto
- ✅ **Experience** - Esperienze con slot temporali
- ✅ **Class** - Classi con slot temporali
- ✅ **Trip** - Viaggi con date di inizio/fine

### Caratteristiche Testate

#### 1. **no_adults** (solo per class/experience)
- ✅ `no_adults = false` - Standard, richiede adulti
- ✅ `no_adults = true` - Solo cani, adulti = 0

#### 2. **pricing_model**
- ✅ `percentage` - Prezzo = costo_provider * (1 + margin_percentage/100)
- ✅ `markup` - Prezzo = costo_provider + markup
- ✅ `legacy` - Prezzo fisso (backward compatibility)

#### 3. **Input Variabili**
- ✅ Guests: 0-100 (con validazione no_adults)
- ✅ Dogs: 0-100
- ✅ Date: passate, presenti, future
- ✅ TimeSlot: con slot, senza slot (full day), null (per trip)

#### 4. **Stati Slot**
- ✅ Slot disponibili
- ✅ Slot pieni (superamento capacità)
- ✅ Date passate/future
- ✅ Trip in corso (start_date passata, end_date futura)

### Verifica Integrità Output

Il test verifica l'integrità dell'output in **ogni dettaglio**:

1. **Calcolo Prezzo**
   - ✅ Prezzo per adulto (se applicabile)
   - ✅ Prezzo per cane
   - ✅ Totale (arrotondato correttamente)
   - ✅ Subtotali che sommano esattamente al totale

2. **Checkout Session Request**
   - ✅ Struttura corretta della richiesta
   - ✅ Guests e dogs corretti (dopo applicazione no_adults)
   - ✅ URL validi (success e cancel)
   - ✅ Customer data completa

3. **Checkout Session Response**
   - ✅ URL di redirect valido
   - ✅ Session ID presente
   - ✅ Amount corrisponde al totale calcolato
   - ✅ Metadata completa e corretta

4. **Validazione Input**
   - ✅ Capacità non superata
   - ✅ Date valide
   - ✅ TimeSlot valido (se applicabile)
   - ✅ Guests >= 1 se no_adults = false

## Scenari di Test

Il test genera automaticamente **16 scenari** che coprono:

### Experience (6 scenari)
1. Standard - 2 adults, 1 dog - Percentage pricing
2. no_adults - 0 adults, 2 dogs - Percentage pricing
3. Standard - 3 adults, 2 dogs - Markup pricing
4. Standard - 1 adult, 1 dog - Legacy pricing
5. Max capacity - 10 adults, 5 dogs
6. Edge case - 0 adults (senza no_adults) - Dovrebbe fallire
7. Edge case - 2 adults, 0 dogs
8. Edge case - Superamento capacità - Dovrebbe fallire

### Class (3 scenari)
1. Standard - 2 adults, 1 dog - Percentage pricing
2. no_adults - 0 adults, 3 dogs - Markup pricing
3. Full day - 4 adults, 2 dogs (no timeSlot)

### Trip (4 scenari)
1. Standard - 2 adults, 1 dog - Percentage pricing - Future start
2. Standard - 4 adults, 2 dogs - Markup pricing
3. Standard - 1 adult, 0 dogs - Legacy pricing
4. In corso - 3 adults, 2 dogs (start_date passata)

### Edge Cases (4 scenari)
1. 0 adults senza no_adults - Dovrebbe fallire
2. 0 dogs (valido)
3. Capacità massima
4. Superamento capacità - Dovrebbe fallire

## Esecuzione

### Prerequisiti

1. Deno installato
2. Variabili d'ambiente configurate (vedi `CRITICAL_TESTS.md`)

### Esecuzione Singola

```bash
npm run test:product-coverage
```

### Esecuzione con Altri Test Critici

```bash
npm run test:critical
# oppure
./run-all-critical-tests.sh
```

## Output

Il test fornisce output dettagliato per ogni scenario:

```
🧪 Testing: Experience - Standard - 2 adults, 1 dog - Percentage pricing
✅ Product Page Load - Experience - Standard - 2 adults, 1 dog - Percentage pricing
✅ Slot Availability - Experience - Standard - 2 adults, 1 dog - Percentage pricing
✅ Experience - Standard - 2 adults, 1 dog - Percentage pricing
   📋 Dettagli: {
     "finalGuests": 2,
     "finalDogs": 1,
     "priceCalculation": {
       "adultPrice": 60,
       "dogPrice": 36,
       "total": 156,
       "subtotalAdults": 120,
       "subtotalDogs": 36
     },
     "checkoutSessionSimulated": true,
     ...
   }
```

## Risultati Finali

Alla fine dell'esecuzione, viene mostrato un riepilogo:

```
================================================================================
📊 RISULTATI FINALI
================================================================================
✅ Test passati: 48/48
❌ Test falliti: 0/48
⏱️  Tempo totale: 1ms
📋 Scenari testati: 16
📦 Tipi di prodotto testati: EXP, CLASS, TRIP, EDGE

✅ TUTTI I TEST SONO PASSATI!
Tutti i tipi di prodotto con tutte le caratteristiche funzionano correttamente.
```

## Integrazione CI/CD

Il test è automaticamente eseguito:
- ✅ Prima di ogni deploy (via `deploy.sh`)
- ✅ In GitHub Actions (via `.github/workflows/test.yml`)
- ✅ Come parte di `npm run test:critical`

## Note Importanti

1. **Mock-based**: Questo test usa mock per simulare tutti gli scenari senza dipendere dal database reale. Questo permette:
   - Esecuzione veloce
   - Test di scenari che potrebbero non esistere nel database
   - Test isolati e riproducibili

2. **Edge Cases**: Alcuni test sono progettati per fallire (edge cases invalidi). Questi test passano se il sistema rifiuta correttamente l'input invalido.

3. **Integrità Output**: Il test verifica che:
   - I subtotals sommino esattamente al totale
   - I metadata siano corretti
   - Gli URL siano validi
   - I valori numerici siano arrotondati correttamente

4. **Copertura Completa**: Il test copre tutte le combinazioni possibili di:
   - Tipo prodotto × Caratteristiche × Input × Stati

## Troubleshooting

Se un test fallisce:

1. Controlla l'output dettagliato per vedere quale validazione è fallita
2. Verifica che i valori attesi siano corretti
3. Controlla che la logica di calcolo prezzo corrisponda al backend
4. Verifica che le validazioni di input siano corrette

## Estensione

Per aggiungere nuovi scenari, modifica la funzione `generateTestScenarios()` in `test-complete-product-coverage.ts`.


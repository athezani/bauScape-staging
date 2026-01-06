# Test Critico: Trip Checkout - Deve Sempre Funzionare

## 🎯 Obiettivo

Questo test verifica che il checkout con trip funzioni **SEMPRE**, per **NESSUN prodotto**. Deve essere eseguito **PRIMA di ogni deploy** per assicurarsi che questo step non fallisca MAI.

## 🚨 Importanza

Questo test è **CRITICO** perché:
- Il checkout con trip è una funzionalità core del sistema
- Gli utenti devono poter prenotare trip senza errori
- Il messaggio "Il viaggio non è al momento disponibile" non deve apparire per trip validi
- Deve funzionare anche per trip in corso (start_date passata ma end_date futura)

## 📋 Scenari Testati

1. **Trip con start_date futura** - Slot deve essere trovato
2. **Trip in corso** (start_date passata, end_date futura) - Slot deve essere trovato (questo era il bug principale)
3. **Trip terminato** - Deve fallire correttamente con messaggio chiaro
4. **Trip non attivo** - Deve fallire correttamente con messaggio chiaro
5. **Trip senza slot** - Deve fallire correttamente con messaggio "Il viaggio non è al momento disponibile"
6. **Trip con slot ma senza capacità** - Deve fallire correttamente con messaggio "Il viaggio non ha più posti disponibili"
7. **Tutti i trip attivi devono avere slot disponibili** - Verifica che non ci siano trip attivi senza slot

## 🚀 Come Eseguire il Test

### Prerequisiti

1. Avere le variabili d'ambiente configurate:
   ```bash
   export SUPABASE_URL="https://zyonwzilijgnnnmhxvbo.supabase.co"
   export SUPABASE_ANON_KEY="your-anon-key"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-key"
   ```

2. Avere Deno installato:
   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   ```

### Esecuzione Locale

```bash
cd ecommerce-homepage
deno run --allow-net --allow-env test-trip-checkout-always-works.ts
```

### Esecuzione Prima del Deploy

**IMPORTANTE**: Questo test deve essere eseguito **PRIMA di ogni deploy**:

```bash
# 1. Esegui il test
cd ecommerce-homepage
deno run --allow-net --allow-env test-trip-checkout-always-works.ts

# 2. Se il test passa, procedi con il deploy
# 3. Se il test fallisce, NON procedere con il deploy e correggi i problemi
```

### Integrazione CI/CD

Il test è integrato nel workflow GitHub Actions (`.github/workflows/test.yml`) e viene eseguito automaticamente:
- Su ogni push su `main` o `develop`
- Su ogni pull request

## ✅ Risultati Attesi

Tutti i test devono passare. Se anche un solo test fallisce:
- ❌ **NON procedere con il deploy**
- 🔍 Analizza i log per capire il problema
- 🛠️ Correggi il problema
- ✅ Riesegui il test fino a quando tutti passano

### Esempio di Output Positivo

```
🚀 Esecuzione test critici per checkout trip
============================================================
Questi test devono SEMPRE passare prima di ogni deploy
============================================================

📋 Test 1: Trip con start_date futura
✅ Test 1: Trip con start_date futura

📋 Test 2: Trip in corso (start_date passata, end_date futura)
✅ Test 2: Trip in corso

📋 Test 3: Trip terminato - deve fallire correttamente
✅ Test 3: Trip terminato

📋 Test 4: Trip non attivo - deve fallire correttamente
✅ Test 4: Trip non attivo

📋 Test 5: Trip senza slot - deve fallire correttamente
✅ Test 5: Trip senza slot

📋 Test 6: Trip con slot ma senza capacità - deve fallire correttamente
✅ Test 6: Trip con slot ma senza capacità

📋 Test 7: Tutti i trip attivi devono avere slot disponibili
✅ Test 7: Tutti i trip attivi hanno slot

============================================================
📊 RISULTATI FINALI
============================================================
✅ Test passati: 7/7
❌ Test falliti: 0/7

✅ Tutti i test sono passati!
Il checkout con trip funziona correttamente per tutti i prodotti.
```

### Esempio di Output Negativo

```
============================================================
📊 RISULTATI FINALI
============================================================
✅ Test passati: 5/7
❌ Test falliti: 2/7

⚠️  ATTENZIONE: Alcuni test sono falliti!
Non procedere con il deploy fino a quando questi test non passano.

❌ Test 2: Trip in corso
   Errore: Nessuno slot trovato per trip in corso (questo è il bug che stiamo correggendo!)

❌ Test 7: Tutti i trip attivi hanno slot
   Errore: 3 trip attivi senza slot disponibili
```

## 🔧 Correzioni Applicate

### Problema Principale

Il codice originale filtrava gli slot per trip usando `.gte('date', today)`, che escludeva slot con date nel passato. Questo causava problemi per trip in corso (start_date passata ma end_date futura).

### Soluzione

1. **Logica migliorata per ricerca slot**:
   - Per trip con start_date futura: filtra per date >= oggi
   - Per trip in corso: non filtra per data, ma verifica che il trip non sia terminato
   - Verifica sempre che il trip sia attivo prima di cercare slot

2. **Validazione trip migliorata**:
   - Verifica che il trip sia attivo
   - Verifica che il trip non sia terminato (controlla end_date o start_date + duration_days)
   - Verifica che lo slot abbia capacità disponibile

3. **Logging dettagliato**:
   - Log di tutte le query per slot
   - Log dei dati del trip
   - Log dei risultati delle query
   - Log degli errori con contesto completo

4. **Messaggi di errore migliorati**:
   - "Il viaggio non è al momento disponibile" - solo per trip senza slot o terminati
   - "Il viaggio non ha più posti disponibili" - per slot senza capacità
   - "Errore nel caricamento della disponibilità" - per errori di rete/DB

## 📝 File Modificati

1. `ecommerce-homepage/src/components/ProductDetailPageClient.tsx`
   - Logica migliorata per ricerca slot trip
   - Validazione trip migliorata in `handleBooking`
   - Logging dettagliato aggiunto

2. `ecommerce-homepage/src/pages-vite/ProductDetailPage.tsx`
   - Stesse correzioni applicate

3. `ecommerce-homepage/test-trip-checkout-always-works.ts`
   - Nuovo test critico per verificare che il checkout funzioni sempre

## 🐛 Troubleshooting

### Test fallisce: "Nessuno slot trovato per trip in corso"

**Causa**: Il trip ha start_date nel passato ma end_date futura, e la query filtra per date >= oggi.

**Soluzione**: Verifica che le correzioni siano state applicate. Il codice ora non filtra per data se il trip è in corso.

### Test fallisce: "Trip attivi senza slot disponibili"

**Causa**: Ci sono trip attivi nel database senza slot corrispondenti.

**Soluzione**: 
1. Verifica nel database che tutti i trip attivi abbiano slot
2. Se mancano slot, creali usando la funzione `createTripAvailability`

### Test fallisce: "Errore di connessione"

**Causa**: Variabili d'ambiente non configurate o Supabase non raggiungibile.

**Soluzione**: 
1. Verifica che `SUPABASE_URL` e `SUPABASE_ANON_KEY` siano configurate
2. Verifica la connessione a Supabase

## 📚 Riferimenti

- [Correzioni applicate](./TRIP_CHECKOUT_FIX.md)
- [Documentazione test](./README_TESTING.md)
- [Workflow CI/CD](../.github/workflows/test.yml)


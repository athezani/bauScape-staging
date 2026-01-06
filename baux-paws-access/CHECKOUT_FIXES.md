# Checkout Stripe - Correzioni e Test

## Problema Risolto
Errore 401 (Unauthorized) durante la creazione della sessione di checkout Stripe.

## Modifiche Implementate

### 1. Configurazione Edge Function (`config.toml`)
- ✅ Aggiunto `verify_jwt = false` per `create-checkout-session`
- ✅ Aggiunto `verify_jwt = false` per `stripe-webhook`
- **Motivo**: Le funzioni devono essere accessibili pubblicamente senza autenticazione JWT

### 2. Funzione `create-checkout-session` - Validazioni Robuste

#### Validazioni Aggiunte:
- ✅ **UUID Validation**: Verifica formato UUID per `productId` e `availabilitySlotId`
- ✅ **Date Validation**: Verifica formato data (YYYY-MM-DD)
- ✅ **URL Validation**: Verifica formato URL per `successUrl` e `cancelUrl`
- ✅ **Time Slot Validation**: Verifica formato orario (HH:MM) o null
- ✅ **Number Validation**: 
  - `guests`: intero tra 1 e 100
  - `dogs`: intero tra 0 e 100
- ✅ **Product Type Validation**: Deve essere 'experience', 'class' o 'trip'
- ✅ **Product Active Check**: Verifica che il prodotto sia attivo
- ✅ **Slot Validation**: 
  - Verifica esistenza dello slot
  - Verifica corrispondenza prodotto-slot
  - Verifica corrispondenza data
  - Verifica disponibilità (adulti e cani)
- ✅ **Price Validation**: 
  - Verifica che il totale sia > 0
  - Verifica minimo Stripe (0.50 EUR)
- ✅ **Stripe Key Validation**: Verifica formato chiave Stripe (sk_test_ o sk_live_)

#### Logging Dettagliato:
- ✅ Log di ogni richiesta con `requestId` univoco
- ✅ Log di tutte le validazioni
- ✅ Log degli errori con contesto completo
- ✅ Log delle chiamate Stripe API
- ✅ Log delle risposte

#### Gestione Errori Migliorata:
- ✅ Messaggi di errore chiari e specifici
- ✅ Codici HTTP corretti (400, 404, 500)
- ✅ Gestione errori Stripe API con parsing JSON
- ✅ Request ID incluso nelle risposte di errore per debugging

### 3. Frontend - Gestione Errori Migliorata

#### Validazioni Client-Side:
- ✅ Validazione numero ospiti (1-100)
- ✅ Validazione numero cani (0-100)
- ✅ Validazione configurazione Supabase
- ✅ Validazione URL

#### Gestione Errori:
- ✅ Parsing corretto delle risposte di errore
- ✅ Messaggi di errore user-friendly
- ✅ Logging dettagliato per debugging
- ✅ Gestione specifica per errori 401, 400, 404, 500

### 4. Test Suite

Creato file `test.ts` con test per:
- ✅ Validazione UUID
- ✅ Validazione date
- ✅ Validazione URL
- ✅ Validazione time slot
- ✅ Validazione numeri
- ✅ Validazione richiesta completa
- ✅ Edge cases (zero dogs, max values, no time slot)
- ✅ Scenari di errore (product not found, insufficient capacity, etc.)

## Casi di Test Critici

### Test Manuali Consigliati:

1. **Test Base**
   - ✅ Prodotto valido, slot disponibile, dati corretti
   - ✅ Verifica redirect a Stripe Checkout
   - ✅ Verifica campi custom (Nome, Cognome, Telefono)

2. **Test Validazione**
   - ✅ UUID non valido → Errore 400
   - ✅ Data non valida → Errore 400
   - ✅ URL non valido → Errore 400
   - ✅ Numero ospiti < 1 → Errore 400
   - ✅ Numero ospiti > 100 → Errore 400
   - ✅ Numero cani < 0 → Errore 400
   - ✅ Numero cani > 100 → Errore 400

3. **Test Database**
   - ✅ Prodotto non esistente → Errore 404
   - ✅ Slot non esistente → Errore 404
   - ✅ Prodotto inattivo → Errore 400
   - ✅ Slot non corrisponde prodotto → Errore 400
   - ✅ Data non corrisponde → Errore 400
   - ✅ Capacità insufficiente → Errore 400

4. **Test Prezzi**
   - ✅ Prezzo totale = 0 → Errore 400
   - ✅ Prezzo totale < 0.50 EUR → Errore 400
   - ✅ Prezzo valido → Successo

5. **Test Stripe**
   - ✅ Chiave Stripe non configurata → Errore 500
   - ✅ Chiave Stripe non valida → Errore 500
   - ✅ Errore Stripe API → Errore con messaggio specifico
   - ✅ Risposta Stripe non valida → Errore 500

6. **Test Edge Cases**
   - ✅ Zero cani → Successo
   - ✅ Un solo ospite → Successo
   - ✅ Time slot null → Successo
   - ✅ Time slot undefined → Successo
   - ✅ Massimo ospiti/cani → Successo

## Monitoraggio

### Log da Controllare:
1. **Supabase Edge Function Logs**
   - Dashboard → Functions → create-checkout-session → Logs
   - Cercare `requestId` per tracciare richieste specifiche

2. **Stripe Dashboard**
   - Developers → Logs
   - Verificare chiamate API e errori

3. **Browser Console**
   - Verificare log del frontend
   - Verificare errori di rete

### Metriche da Monitorare:
- Tasso di successo creazione sessioni
- Tempo di risposta
- Errori per tipo (400, 404, 500)
- Errori Stripe API

## Troubleshooting

### Errore 401
- ✅ Verificare `config.toml` ha `verify_jwt = false`
- ✅ Verificare che la funzione sia deployata correttamente
- ✅ Verificare che `apikey` header sia presente nella richiesta

### Errore 400
- ✅ Controllare log della funzione per dettagli validazione
- ✅ Verificare formato dati nella richiesta
- ✅ Verificare che tutti i campi richiesti siano presenti

### Errore 404
- ✅ Verificare che prodotto e slot esistano nel database
- ✅ Verificare che prodotto sia attivo
- ✅ Verificare corrispondenza slot-prodotto-data

### Errore 500
- ✅ Verificare variabili d'ambiente (STRIPE_SECRET_KEY, SUPABASE_URL, etc.)
- ✅ Verificare log Stripe API per errori specifici
- ✅ Verificare formato chiave Stripe

## Checklist Pre-Deploy

- [x] Config.toml aggiornato con `verify_jwt = false`
- [x] Validazioni robuste implementate
- [x] Logging dettagliato aggiunto
- [x] Gestione errori migliorata
- [x] Frontend aggiornato con validazioni
- [x] Test suite creato
- [x] Funzione deployata
- [ ] Test manuali completati
- [ ] Monitoraggio attivo

## Note Importanti

1. **Sicurezza**: La funzione è pubblica ma valida tutti gli input
2. **Performance**: Logging dettagliato può aumentare latenza - monitorare
3. **Stripe**: Usare sempre carte di test in sviluppo
4. **Database**: Verificare che RLS policies permettano lettura prodotti/slot

## Prossimi Passi

1. Eseguire test manuali completi
2. Monitorare log per 24-48 ore
3. Raccogliere feedback utenti
4. Ottimizzare se necessario





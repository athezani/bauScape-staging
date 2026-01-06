# Prevenzione Duplicati Purchase Order

## 🎯 Strategia di Prevenzione Duplicati

Il sistema utilizza il **numero ordine Sales di Odoo** (es. "S00052") come identificatore univoco per prevenire la creazione di righe duplicate nei Purchase Orders.

## 🔍 Come Funziona

### Identificatore Unico: Numero Ordine Sales

Ogni riga PO include il numero ordine Sales nella descrizione nel formato:
```
SO: S00052 - Cliente: Nome Cliente - Prodotto: Nome Prodotto - ...
```

### Controllo Duplicati

Quando si aggiunge una riga a un PO esistente:

1. **Ricerca Sales Order**: Il sistema cerca il Sales Order corrispondente usando `client_order_ref = payment_intent_id`
2. **Recupero Numero Ordine**: Se trovato, recupera il numero ordine Sales (es. "S00052")
3. **Verifica Duplicati**: Controlla se esiste già una riga nel PO con lo stesso numero ordine Sales nella descrizione
4. **Decisione**:
   - ✅ Se **duplicato trovato**: Salta la creazione e restituisce successo
   - ✅ Se **non duplicato**: Crea la nuova riga con il numero ordine Sales nella descrizione

### Vantaggi

1. **Tracciabilità Completa**: Ogni riga PO è direttamente riconducibile a un Sales Order tramite il numero ordine
2. **Prevenzione Duplicati Robusta**: Usa un identificatore univoco e standard di Odoo
3. **Connessione Moduli**: Garantisce la connessione perfetta tra modulo Sales e Purchase
4. **Idempotenza**: La funzione può essere chiamata più volte senza creare duplicati

## 📋 Formato Descrizione Riga PO

Ogni riga PO ha questa struttura nella descrizione:

```
SO: S00052 - Cliente: Nome Cognome - Prodotto: Nome Prodotto - (2 persone, 1 cane) - Data: 2024-01-15 - [Booking: c18ca472...]
```

Componenti:
- **SO: S00052**: Numero ordine Sales (identificatore primario per duplicati)
- **Cliente**: Nome del cliente
- **Prodotto**: Nome del prodotto
- **Dettagli**: Numero persone/cani
- **Data**: Data prenotazione
- **Booking ID**: ID booking Supabase (riferimento secondario)

## 🔄 Flusso Completo

1. **Booking completato** → `create-booking` Edge Function
2. **Ricerca Sales Order** → Cerca in Odoo usando `payment_intent_id`
3. **Recupero Numero Ordine** → Ottiene "S00052" dal Sales Order
4. **Controllo Duplicati** → Verifica se riga con "SO: S00052" esiste già nel PO
5. **Creazione/Aggiornamento**:
   - Se duplicato: Skip
   - Se nuovo: Crea riga con "SO: S00052" nella descrizione

## ✅ Test di Verifica

Il sistema è stato testato con:
- ✅ Creazione nuove righe PO con numero ordine Sales
- ✅ Prevenzione duplicati usando numero ordine Sales
- ✅ Tracciabilità completa riga PO → Sales Order
- ✅ Idempotenza: chiamate multiple non creano duplicati

## 📝 Note

- Se un booking non ha un Sales Order associato, il sistema procede comunque ma non può verificare duplicati per numero ordine Sales
- In questo caso, usa il booking ID come fallback per l'identificazione
- Il numero ordine Sales è sempre incluso nella descrizione quando disponibile


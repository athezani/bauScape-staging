# Correzioni e Miglioramenti PO Integration

## ✅ Correzioni Implementate

### 1. Gestione Custom Fields nelle Order Lines
**Problema**: I custom fields nelle order lines potevano causare errori se non esistevano in Odoo.

**Soluzione**: 
- Implementato fallback: se l'aggiunta di una riga fallisce per custom fields, riprova senza di essi
- Logging dettagliato per identificare quando i custom fields non sono disponibili

### 2. Ricerca PO Esistente
**Problema**: La ricerca per order lines poteva essere lenta con molti PO.

**Soluzione**:
- Prima cerca per custom field `x_product_id` (più efficiente)
- Fallback a ricerca per order lines solo se necessario
- Limite a 10 PO per evitare letture eccessive
- Warning se ci sono più di 10 PO da controllare

### 3. Gestione Errori Robusta
**Miglioramenti**:
- Ogni operazione ha try-catch specifico
- Errori custom field vengono identificati e gestiti separatamente
- Logging dettagliato per ogni step
- Errori non bloccanti per operazioni opzionali (es. ricerca sale.order)

## 🧪 Script di Test

Creato script di test completo (`test-odoo-po/index.ts`) che:

1. **Legge booking esistenti** dal database
2. **Raggruppa per prodotto + provider** (verifica logica 1 PO = 1 Prodotto + 1 Supplier)
3. **Crea/aggiorna PO** in Odoo
4. **Verifica raggruppamento**: controlla che booking con stesso prodotto+provider abbiano stesso PO ID
5. **Supporta dry-run**: testa senza creare PO reali

### Funzionalità Test Script

- ✅ Filtra solo booking con `provider_cost_total > 0`
- ✅ Raggruppa automaticamente per prodotto + provider
- ✅ Processa primo booking di ogni gruppo (crea PO)
- ✅ Processa booking rimanenti (aggiunge righe)
- ✅ Verifica che tutti i booking dello stesso gruppo abbiano stesso PO ID
- ✅ Report dettagliato con statistiche

## 🔍 Verifiche Automatiche

Lo script verifica automaticamente:

1. **Raggruppamento Corretto**: 
   - Bookings con stesso `product_id` + `provider_id` → stesso PO ID
   - Numero di PO creati = numero di gruppi (prodotto + provider)

2. **Tracciabilità**:
   - Ogni riga PO ha custom fields per tracciare booking originale
   - Link a sale.order tramite payment intent ID

3. **Stato PO**:
   - Tutti i PO rimangono in stato `draft`

## 📊 Esempio Output Test

```json
{
  "success": true,
  "summary": {
    "totalBookings": 15,
    "totalGroups": 3,
    "expectedPOs": 3,
    "actualPOs": 3,
    "successfulBookings": 15,
    "failedBookings": 0,
    "groupingErrors": 0
  },
  "grouping": [
    {
      "productId": "uuid-1",
      "providerId": "uuid-2",
      "productName": "Tour Dolomiti",
      "providerName": "Provider X",
      "bookingCount": 5,
      "poId": 123
    }
  ]
}
```

## 🚀 Come Testare

### 1. Test Dry-Run (Simulazione)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/test-odoo-po \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 5, "dryRun": true}'
```

### 2. Test Reale (Crea PO)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/test-odoo-po \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 5, "dryRun": false}'
```

### 3. Test per Prodotto Specifico

```bash
curl -X POST https://your-project.supabase.co/functions/v1/test-odoo-po \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"productId": "uuid-prodotto", "dryRun": false}'
```

## ✅ Checklist Pre-Produzione

- [x] Gestione errori custom fields
- [x] Ricerca PO esistente ottimizzata
- [x] Logging dettagliato
- [x] Script di test completo
- [x] Verifica raggruppamento automatica
- [ ] Test con dati reali
- [ ] Verifica custom fields in Odoo
- [ ] Documentazione custom fields da aggiungere in Odoo

## 📝 Custom Fields Raccomandati in Odoo

Per ottimizzare la ricerca e la tracciabilità, aggiungere questi custom fields in Odoo:

### Purchase Order (`purchase.order`)
- `x_product_id` (Char): ID prodotto Supabase (chiave per raggruppamento)
- `x_product_type` (Char): Tipo prodotto (experience/class/trip)
- `x_provider_id` (Char): ID provider Supabase

### Purchase Order Line (`purchase.order.line`)
- `x_booking_id` (Char): ID booking Supabase
- `x_stripe_payment_id` (Char): Payment Intent ID
- `x_sale_order_id` (Many2one): Riferimento a sale.order
- `x_customer_email` (Char): Email cliente
- `x_customer_name` (Char): Nome cliente

## 🔄 Prossimi Passi

1. Eseguire test con booking reali
2. Verificare che i PO vengano creati correttamente
3. Verificare che il raggruppamento funzioni (stesso prodotto = stesso PO)
4. Verificare che ogni riga sia tracciabile al booking originale
5. Aggiungere custom fields in Odoo (opzionale ma raccomandato)


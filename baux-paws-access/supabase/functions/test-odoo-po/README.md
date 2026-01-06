# Test Script per Odoo Purchase Order Integration

Questo script testa la logica di creazione/aggiornamento Purchase Orders con booking esistenti.

## Funzionalità

- Legge booking esistenti dal database
- Li raggruppa per prodotto + provider
- Crea/aggiorna PO in Odoo secondo la logica: **1 PO = 1 Prodotto + 1 Supplier + N Bookings**
- Verifica che il raggruppamento funzioni correttamente
- Supporta dry-run (simulazione senza creare PO reali)

## Utilizzo

### Via HTTP Request

```bash
curl -X POST https://your-project.supabase.co/functions/v1/test-odoo-po \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 10,
    "dryRun": false
  }'
```

### Parametri

- `limit` (opzionale, default: 10): Numero massimo di booking da processare
- `productId` (opzionale): Filtra per un prodotto specifico
- `providerId` (opzionale): Filtra per un provider specifico
- `dryRun` (opzionale, default: true): Se `true`, simula senza creare PO reali

### Esempio: Test con 5 booking

```json
{
  "limit": 5,
  "dryRun": false
}
```

### Esempio: Test per un prodotto specifico

```json
{
  "productId": "uuid-del-prodotto",
  "dryRun": false
}
```

## Output

Lo script restituisce:

```json
{
  "success": true,
  "dryRun": false,
  "summary": {
    "totalBookings": 10,
    "totalGroups": 3,
    "expectedPOs": 3,
    "actualPOs": 3,
    "successfulBookings": 10,
    "failedBookings": 0
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
  ],
  "results": [
    {
      "success": true,
      "bookingId": "uuid-booking",
      "productId": "uuid-product",
      "providerId": "uuid-provider",
      "poId": 123,
      "action": "created"
    }
  ]
}
```

## Verifica Logica di Raggruppamento

Lo script verifica automaticamente che:
- Bookings con stesso prodotto + provider abbiano lo stesso PO ID
- Il numero di PO creati corrisponda al numero di gruppi (prodotto + provider)
- Tutti i booking vengano processati correttamente

## Note

- Solo booking con `provider_cost_total > 0` vengono processati
- Il PO rimane in stato `draft` per revisione manuale
- I custom fields vengono aggiunti se esistono in Odoo, altrimenti vengono ignorati


# Logica di Raggruppamento Purchase Orders

## 📋 Principio Fondamentale

**1 PO = 1 Prodotto + 1 Supplier + N Bookings**

- Ogni Purchase Order contiene **tutti gli ordini** per un determinato prodotto del supplier
- Un viaggio con 10 prenotazioni → tutte e 10 nello stesso PO
- La relazione è: **1 PO ↔ 1 Prodotto ↔ 1 Supplier ↔ N Bookings**

## 🔄 Comportamento

### Quando arriva un nuovo booking:

1. **Cerca PO esistente** per:
   - `partner_id` = supplier partner ID
   - `state` = 'draft'
   - `x_product_id` = product ID (custom field) **OPPURE**
   - `order_line` contiene questo `product_id`

2. **Se PO esiste**:
   - Aggiunge una nuova riga (`order_line`) al PO esistente
   - La riga rappresenta questo booking
   - Il PO rimane in draft

3. **Se PO non esiste**:
   - Crea un nuovo PO
   - Aggiunge la prima riga (questo booking)
   - Il PO rimane in draft

### Esempio Pratico

**Scenario**: Viaggio "Tour delle Dolomiti" con 10 prenotazioni

1. **Booking 1** (Cliente A):
   - Cerca PO per "Tour delle Dolomiti" + Supplier X
   - Non trovato → Crea nuovo PO
   - PO ID: 1001, Riga 1: Cliente A

2. **Booking 2** (Cliente B):
   - Cerca PO per "Tour delle Dolomiti" + Supplier X
   - Trovato PO 1001 → Aggiunge riga
   - PO ID: 1001, Righe: Cliente A, Cliente B

3. **Booking 3-10**:
   - Tutti aggiunti allo stesso PO 1001
   - PO ID: 1001, Righe: Cliente A, B, C, D, E, F, G, H, I, J

4. **Viaggio terminato**:
   - Tu rivedi il PO 1001
   - Lo confermi manualmente (draft → confirmed)

## 🔗 Tracciabilità Completa

### Custom Fields nel PO (livello PO):
- `x_product_id`: ID prodotto Supabase (chiave per raggruppamento)
- `x_product_type`: Tipo prodotto (experience/class/trip)
- `x_provider_id`: ID provider Supabase

### Custom Fields nelle Order Lines (livello riga):
- `x_booking_id`: ID booking Supabase (traccia ogni prenotazione)
- `x_stripe_payment_id`: Payment Intent ID
- `x_sale_order_id`: ID sale.order collegato
- `x_customer_email`: Email cliente
- `x_customer_name`: Nome cliente

### Link a Sale Orders:
- Ogni riga del PO può essere tracciata al sale.order tramite:
  - `x_stripe_payment_id` (stesso usato in sale.order come `client_order_ref`)
  - `x_sale_order_id` (ID diretto sale.order)

## 📊 Struttura Dati

```
Purchase Order (PO)
├── partner_id: Supplier Partner ID
├── state: 'draft' (rimane in draft)
├── x_product_id: Product UUID (chiave raggruppamento)
├── x_product_type: 'trip' | 'experience' | 'class'
├── x_provider_id: Provider UUID
└── order_line: [
      {
        product_id: Product Odoo ID,
        name: "Tour Dolomiti - 2 persone, 1 cane - Data: 2024-01-15",
        product_qty: 1,
        price_unit: 150.00,
        x_booking_id: "booking-uuid-1",
        x_stripe_payment_id: "pi_xxx",
        x_sale_order_id: 123,
        x_customer_email: "cliente1@example.com",
        x_customer_name: "Mario Rossi"
      },
      {
        product_id: Product Odoo ID,
        name: "Tour Dolomiti - 1 persona, 0 cani - Data: 2024-01-15",
        product_qty: 1,
        price_unit: 100.00,
        x_booking_id: "booking-uuid-2",
        x_stripe_payment_id: "pi_yyy",
        x_sale_order_id: 124,
        x_customer_email: "cliente2@example.com",
        x_customer_name: "Luigi Bianchi"
      },
      // ... altre 8 righe
    ]
```

## ✅ Vantaggi

1. **Gestione Centralizzata**: Tutti gli ordini di un prodotto in un unico PO
2. **Revisione Facile**: Puoi rivedere tutti gli ordini insieme prima di confermare
3. **Tracciabilità Completa**: Ogni riga è tracciabile al booking originale
4. **Link Perfetto**: Ogni riga può essere collegata al sale.order corrispondente
5. **Nessuna Duplicazione**: Un solo PO per prodotto, indipendentemente dal numero di prenotazioni

## 🔍 Ricerca PO Esistente

La ricerca avviene in due fasi:

1. **Prima**: Cerca per custom field `x_product_id` (se esiste)
   - Più efficiente
   - Più affidabile

2. **Fallback**: Cerca per `product_id` nelle order lines
   - Se custom field non esiste
   - Legge tutte le righe e verifica il product_id

## ⚠️ Note Importanti

- **PO rimane in draft**: Non viene confermato automaticamente
- **Custom fields opzionali**: Se non esistono in Odoo, il sistema funziona comunque
- **Idempotenza**: Se lo stesso booking viene processato due volte, verrà aggiunta una riga duplicata (da gestire a livello applicativo se necessario)

## 🧪 Testing

Per testare:
1. Crea 3 booking per lo stesso prodotto
2. Verifica che tutti e 3 siano nello stesso PO
3. Verifica che ogni riga abbia i custom fields corretti
4. Verifica il link ai sale.order corrispondenti


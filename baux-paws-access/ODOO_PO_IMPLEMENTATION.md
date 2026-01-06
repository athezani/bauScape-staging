# Implementazione Integrazione Purchase Order Odoo

## ✅ Stato Implementazione

L'infrastruttura per l'integrazione Purchase Order con Odoo è stata implementata e pronta per l'uso.

## 📋 Componenti Implementati

### 1. Client Odoo JSON-RPC (`_shared/odoo/client.ts`)
- ✅ Client robusto per comunicazione con Odoo
- ✅ Gestione autenticazione con cache
- ✅ Metodi helper: search, read, create, write, unlink
- ✅ Gestione errori JSON-RPC

### 2. Configurazione (`_shared/odoo/config.ts`)
- ✅ Usa le stesse variabili d'ambiente del modulo Sales:
  - `OD_URL`
  - `OD_DB_NAME`
  - `OD_LOGIN` (raccomandato)
  - `OD_API_KEY`
- ✅ Supporto multi-account per migrazione facile
- ✅ Validazione configurazione

### 3. Purchase Order Integration (`_shared/odoo/purchaseOrder.ts`)
- ✅ Funzione `createOdooPurchaseOrder()` completa
- ✅ Find/Create supplier partner con tutti i campi:
  - `company_name` → `name` (partner)
  - `email` → `email`
  - `phone` → `phone`
  - `is_company: true`
  - `supplier_rank: 1`
- ✅ Find/Create product (service type)
- ✅ Link al sale.order esistente (tramite `client_order_ref` = payment intent ID)
- ✅ Campi custom per tracciabilità (se disponibili in Odoo):
  - `x_product_id`: ID prodotto Supabase
  - `x_sale_order_id`: ID sale.order collegato
  - `x_stripe_payment_id`: Payment Intent ID
  - `x_booking_id`: ID booking Supabase
- ✅ Gestione errori robusta con logging dettagliato
- ✅ Fallback se custom fields non esistono

### 4. Booking Mapper (`_shared/odoo/bookingMapper.ts`)
- ✅ Mappatura completa dati booking → formato Odoo
- ✅ Include tutti i campi finanziari:
  - `provider_cost_total`
  - `stripe_fee`
  - `internal_margin`
  - `net_revenue`
- ✅ Validazione dati prima dell'invio

### 5. Types e Interfaces (`_shared/odoo/types.ts`)
- ✅ Types completi per tutti i dati
- ✅ Provider con tutti i campi: `name`, `email`, `contactName`, `phone`

## 🔗 Link tra PO e Sale Order

Il Purchase Order viene collegato al Sale Order esistente tramite:

1. **Numero Ordine Sales nella descrizione riga PO** (PRIMARY): 
   - Ogni riga PO include il numero ordine Sales (es. "SO: S00052") nella descrizione
   - Questo permette la tracciabilità diretta e il controllo duplicati
   - Formato: `"SO: S00052 - Cliente: ... - Prodotto: ..."`

2. **Origin field**: Contiene riferimento al sale.order name
   ```
   "SO: S00052 | Product: Prodotto Name"
   ```

3. **Custom field `x_sale_order_id`**: ID numerico del sale.order (se campo esiste)

4. **Custom field `x_stripe_payment_id`**: Payment Intent ID (stesso usato in sale.order come `client_order_ref`)

5. **Ricerca automatica**: Il sistema cerca il sale.order usando `client_order_ref = payment_intent_id`

### Prevenzione Duplicati

Il sistema previene la creazione di righe duplicate usando il **numero ordine Sales** come identificatore univoco:
- Se una riga PO con lo stesso numero ordine Sales (es. "S00052") esiste già, la nuova riga viene saltata
- Questo garantisce che ogni Sales Order corrisponda a una sola riga PO
- Il controllo avviene cercando il numero ordine Sales nella descrizione della riga PO

## 📊 Campi Provider Disponibili vs Necessari

### Campi Disponibili nel Database (`profile` table)
- ✅ `company_name` → Mappato a `name` (partner)
- ✅ `contact_name` → Disponibile ma non mappato direttamente (può essere aggiunto come child contact in Odoo)
- ✅ `email` → Mappato a `email`
- ✅ `phone` → Mappato a `phone`
- ✅ `active` → Non necessario per Odoo

### Campi Necessari per Odoo Partner (Supplier)
- ✅ `name` (company_name) - **OBBLIGATORIO**
- ✅ `is_company: true` - **OBBLIGATORIO** per supplier
- ✅ `supplier_rank: 1` - **OBBLIGATORIO** per purchase orders
- ✅ `email` - Opzionale ma raccomandato
- ✅ `phone` - Opzionale

**Nota**: `contact_name` non è mappato direttamente perché in Odoo per una company il contact person è tipicamente un child contact separato. Se necessario, può essere aggiunto in futuro.

## 📝 Campi Obbligatori Purchase Order

### Campi Obbligatori in Odoo `purchase.order`
- ✅ `partner_id` - Fornitore (supplier partner)
- ✅ `date_order` - Data ordine
- ✅ `order_line` - Righe ordine (almeno una)

### Campi Opzionali ma Importanti
- ✅ `origin` - Riferimento all'origine (sale.order, booking, etc.)
- ✅ `notes` - Note con dettagli booking
- ✅ Custom fields per tracciabilità

### Struttura Order Line
- ✅ `product_id` - Prodotto (obbligatorio)
- ✅ `name` - Descrizione prodotto
- ✅ `product_qty` - Quantità (sempre 1 per servizi)
- ✅ `price_unit` - Prezzo unitario (`provider_cost_total`)

## 🔍 Verifica Campi Mancanti

### Da Verificare in Odoo
1. **Custom Fields**: Verificare se i seguenti custom fields esistono in Odoo:
   - `x_product_id` (Char) - ID prodotto Supabase
   - `x_sale_order_id` (Many2one) - Riferimento a sale.order
   - `x_stripe_payment_id` (Char) - Payment Intent ID
   - `x_booking_id` (Char) - ID booking Supabase

   **Nota**: Se non esistono, il sistema funziona comunque (fallback senza custom fields).

2. **Product**: Verificare se esiste un prodotto di default o se il sistema deve crearli automaticamente.

3. **Account Contabili**: Per future integrazioni Accounting, verificare:
   - Account COGS (Costo del Venduto)
   - Account Expense per Stripe fees

## 🚨 Gestione Errori

### Logging Dettagliato
Ogni operazione logga:
- ✅ Contesto completo (booking ID, provider, product)
- ✅ Step-by-step progress
- ✅ Errori con stack trace completo
- ✅ Dettagli errori Odoo (messaggio + data)

### Errori Non Bloccanti
- ✅ Ricerca sale.order: se fallisce, continua senza link
- ✅ Update supplier partner: se fallisce, continua con partner esistente
- ✅ Custom fields: se non esistono, crea PO senza di essi

### Errori Bloccanti
- ❌ Configurazione Odoo mancante
- ❌ `provider_cost_total` mancante o <= 0
- ❌ Creazione supplier partner fallita
- ❌ Creazione product fallita
- ❌ Creazione purchase.order fallita

### Tracciabilità Errori
Ogni errore include:
- ✅ Timestamp
- ✅ Booking ID
- ✅ Provider name
- ✅ Product name
- ✅ Error message completo
- ✅ Stack trace (se disponibile)
- ✅ Dettagli contesto

## 🧪 Testing

### Test Manuale
1. Creare un booking con `provider_cost_total` > 0
2. Chiamare `createOdooPurchaseOrder()` con i dati del booking
3. Verificare in Odoo:
   - PO creato correttamente
   - Supplier partner corretto
   - Product corretto
   - Link a sale.order (se esiste)
   - Custom fields (se esistono)

### Test Automatico (da implementare)
- Unit test per `findOrCreateSupplierPartner`
- Unit test per `findOrCreateProduct`
- Integration test per `createOdooPurchaseOrder`
- Test error handling

## 📋 Checklist Pre-Produzione

- [ ] Verificare custom fields in Odoo (o crearli se necessario)
- [ ] Verificare/creare prodotto di default o configurare `OD_PRODUCT_ID`
- [ ] Testare creazione PO con booking reale
- [ ] Verificare link tra PO e sale.order
- [ ] Verificare logging in produzione
- [ ] Documentare eventuali campi custom aggiuntivi necessari

## 🔄 Logica di Raggruppamento

**IMPORTANTE**: Il sistema implementa una logica di raggruppamento dove:
- **1 PO = 1 Prodotto + 1 Supplier + N Bookings**
- Tutti gli ordini per lo stesso prodotto del supplier vengono raggruppati nello stesso PO
- Ogni booking diventa una riga (`order_line`) nel PO
- Il PO rimane in draft per revisione manuale

Vedi `ODOO_PO_GROUPING_LOGIC.md` per dettagli completi.

## 🔄 Prossimi Passi

1. **Testing**: Testare l'integrazione con dati reali
2. **Custom Fields**: Aggiungere custom fields in Odoo per tracciabilità completa
3. **Product Management**: Creazione automatica prodotti (già implementata)
4. **Error Monitoring**: Implementare alerting per errori critici
5. **Accounting Integration**: Preparare per futura integrazione Accounting (quando richiesta)

## 📚 Documentazione Riferimenti

- Client Odoo: `_shared/odoo/client.ts`
- Purchase Order: `_shared/odoo/purchaseOrder.ts`
- Config: `_shared/odoo/config.ts`
- Types: `_shared/odoo/types.ts`
- Mapper: `_shared/odoo/bookingMapper.ts`
- Example: `_shared/odoo/example-usage.ts`
- README: `_shared/odoo/README.md`

## ❓ Domande Aperte

1. **Custom Fields**: Vogliamo aggiungere i custom fields in Odoo per migliore tracciabilità?
2. **Product Strategy**: Preferiamo un prodotto di default o prodotti per tipo (experience/class/trip)?
3. **Contact Name**: Vogliamo mappare `contact_name` come child contact in Odoo?
4. **PO Confirmation**: Dobbiamo confermare automaticamente i PO o lasciarli in draft?


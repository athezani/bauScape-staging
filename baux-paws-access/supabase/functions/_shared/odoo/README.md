# Odoo Integration Module

Modulo per l'integrazione con Odoo ERP per la creazione automatica di Purchase Orders e Sales Invoices.

## Struttura

```
_shared/odoo/
├── index.ts              # Entry point principale
├── types.ts              # Types e interfaces TypeScript
├── config.ts             # Gestione configurazione multi-account
├── client.ts             # Client JSON-RPC per Odoo
├── purchaseOrder.ts      # Funzioni per Purchase Orders
├── salesInvoice.ts       # Funzioni per Sales Invoices
└── README.md             # Questa documentazione
```

## Configurazione

> 📖 **Guida Completa**: Vedi [ODOO_CONFIGURATION.md](../../../ODOO_CONFIGURATION.md) per istruzioni dettagliate su come configurare le variabili Odoo in Supabase.

### Variabili d'Ambiente

Le variabili Odoo devono essere configurate come **Secrets** nelle **Supabase Edge Functions**.

**Dove configurarle:**
- **Dashboard**: Supabase Dashboard → Settings → Edge Functions → Secrets
- **CLI**: `npx supabase secrets set OD_URL=...`

Il modulo supporta configurazioni multiple per facilitare la migrazione tra account Odoo.

#### Account Default
```bash
OD_URL=https://odoo.example.com
OD_DB_NAME=my_database
OD_LOGIN=my_username
OD_API_KEY=my_api_key
```

#### Account Alternativo
```bash
OD_ALT_URL=https://odoo-new.example.com
OD_ALT_DB_NAME=my_new_database
OD_ALT_LOGIN=my_new_username
OD_ALT_API_KEY=my_new_api_key
```

#### Account Personalizzato
Per un account con prefisso personalizzato (es. `PROD`):
```bash
OD_PROD_URL=https://odoo-prod.example.com
OD_PROD_DB_NAME=prod_database
OD_PROD_LOGIN=prod_username
OD_PROD_API_KEY=prod_api_key
```

#### Selezione Account Attivo
```bash
OD_ACTIVE_ACCOUNT=default  # o 'alt' o prefisso personalizzato
```

#### Account Contabili (per Sales Invoice)
```bash
OD_ACCOUNT_REVENUE_ID=123      # ID account per ricavi
OD_ACCOUNT_COGS_ID=456         # ID account per costo del venduto
OD_ACCOUNT_STRIPE_FEE_ID=789   # ID account per commissioni Stripe
```

### Migrazione Account

Per migrare da un account all'altro:

1. **Configura il nuovo account** usando le variabili d'ambiente con prefisso `OD_ALT_`
2. **Testa la configurazione** usando `OD_ACTIVE_ACCOUNT=alt`
3. **Quando pronto**, cambia le variabili default o imposta `OD_ACTIVE_ACCOUNT=alt`

Esempio:
```bash
# Fase 1: Configura nuovo account
OD_ALT_URL=https://odoo-new.example.com
OD_ALT_DB_NAME=new_database
OD_ALT_LOGIN=new_username
OD_ALT_API_KEY=new_api_key

# Fase 2: Testa nuovo account
OD_ACTIVE_ACCOUNT=alt

# Fase 3: Quando pronto, cambia default o mantieni ALT
OD_ACTIVE_ACCOUNT=alt  # o aggiorna OD_URL, OD_DB_NAME, etc.
```

## Utilizzo

### Esempio Base

```typescript
import {
  getActiveOdooConfig,
  validateOdooConfig,
  createOdooPurchaseOrder,
  createOdooSalesInvoice,
  type BookingDataForOdoo,
} from '../_shared/odoo/index.ts';

// 1. Ottieni configurazione
const config = getActiveOdooConfig();
if (!config || !validateOdooConfig(config)) {
  throw new Error('Odoo configuration not available');
}

// 2. Prepara dati booking
const bookingData: BookingDataForOdoo = {
  bookingId: 'booking-123',
  orderNumber: 'ORD-123',
  customer: {
    email: 'customer@example.com',
    firstName: 'Mario',
    lastName: 'Rossi',
    fullName: 'Mario Rossi',
  },
  product: {
    id: 'product-123',
    name: 'Esperienza Cani',
    type: 'experience',
  },
  provider: {
    id: 'provider-123',
    name: 'Provider Italiano',
  },
  bookingDate: '2024-01-15',
  numberOfAdults: 2,
  numberOfDogs: 1,
  totalAmountPaid: 100.00,
  currency: 'EUR',
  providerCostTotal: 70.00,
  stripeFee: 3.20,
  internalMargin: 26.80,
  netRevenue: 26.80,
};

// 3. Crea Purchase Order
const poResult = await createOdooPurchaseOrder(config, bookingData);
if (poResult.success) {
  console.log('PO created:', poResult.purchaseOrderId);
} else {
  console.error('PO error:', poResult.error);
}

// 4. Crea Sales Invoice
const invoiceResult = await createOdooSalesInvoice(config, bookingData);
if (invoiceResult.success) {
  console.log('Invoice created:', invoiceResult.invoiceId);
} else {
  console.error('Invoice error:', invoiceResult.error);
}
```

### Utilizzo Diretto del Client

```typescript
import { createOdooClient, getActiveOdooConfig } from '../_shared/odoo/index.ts';

const config = getActiveOdooConfig();
if (!config) throw new Error('Config not available');

const client = createOdooClient(config);

// Cerca record
const partnerIds = await client.search('res.partner', [['email', '=', 'test@example.com']]);

// Leggi record
const partners = await client.read('res.partner', partnerIds, ['name', 'email']);

// Crea record
const newId = await client.create('res.partner', {
  name: 'Nuovo Partner',
  email: 'nuovo@example.com',
});

// Aggiorna record
await client.write('res.partner', [newId], { phone: '+39 123 456 7890' });
```

## Dati Richiesti

### BookingDataForOdoo

L'interfaccia `BookingDataForOdoo` richiede i seguenti campi dalla tabella `booking`:

- **Identificazione**: `bookingId`, `orderNumber`, `stripePaymentIntentId`
- **Cliente**: `customer.email`, `customer.firstName`, `customer.lastName`, `customer.fullName`
- **Prodotto**: `product.id`, `product.name`, `product.type`
- **Provider**: `provider.id`, `provider.name`
- **Dettagli Booking**: `bookingDate`, `numberOfAdults`, `numberOfDogs`
- **Dati Finanziari** (CRITICI):
  - `totalAmountPaid`: Importo totale pagato
  - `providerCostTotal`: Costo fornitore totale
  - `stripeFee`: Commissione Stripe
  - `internalMargin`: Margine interno
  - `netRevenue`: Ricavo netto

## Implementazione

### Purchase Order

La funzione `createOdooPurchaseOrder` crea un Purchase Order in Odoo con:
- **Fornitore**: Partner provider (italiano)
- **Prodotto**: Prodotto/servizio dal booking
- **Quantità**: Basata su adults/dogs o 1 per servizi
- **Costo**: `provider_cost_total` dal booking

**Stato**: Scheletro implementato, logica di business da completare.

### Sales Invoice

La funzione `createOdooSalesInvoice` crea una Sales Invoice in Odoo con:
- **Cliente**: Partner cliente
- **Riga Ricavi**: `total_amount_paid`
- **Riga COGS**: `provider_cost_total` (se account configurato)
- **Riga Spese**: `stripe_fee` (se account configurato)

**Stato**: Scheletro implementato, logica di business da completare.

## Prossimi Passi

1. **Implementare logica di business** in `purchaseOrder.ts` e `salesInvoice.ts`
2. **Configurare account contabili** in Odoo e impostare variabili d'ambiente
3. **Testare integrazione** con account di sviluppo
4. **Aggiungere retry logic** per gestire errori temporanei
5. **Aggiungere logging** dettagliato per debugging
6. **Implementare idempotency** per evitare duplicati

## Note

- Il client Odoo gestisce automaticamente l'autenticazione e la cache della sessione
- Le funzioni sono progettate per essere idempotenti (usare `orderNumber` o `bookingId` come riferimento)
- La configurazione multi-account facilita la migrazione senza interruzioni


# Sincronizzazione Prodotti con Odoo

Questo documento descrive il sistema di sincronizzazione prodotti tra Supabase e Odoo.

## Panoramica

Il sistema garantisce una corrispondenza 1-to-1 tra i prodotti nell'ecommerce (Supabase) e i prodotti in Odoo. Ogni prodotto attivo sul sito web viene automaticamente sincronizzato con Odoo, permettendo una tracciabilità completa per l'accounting.

## Componenti

### 1. Edge Function: `sync-products-to-odoo`

Funzione Supabase Edge Function che sincronizza i prodotti con Odoo.

**Percorso**: `baux-paws-access/supabase/functions/sync-products-to-odoo/index.ts`

**Utilizzo**:

#### Sincronizzazione singolo prodotto:
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/sync-products-to-odoo" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "uuid-del-prodotto",
    "productType": "experience"
  }'
```

#### Sincronizzazione batch (tutti i prodotti attivi):
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/sync-products-to-odoo" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Oppure tramite query parameters:
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/sync-products-to-odoo?productId=uuid&productType=experience" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 2. Funzione Helper: `productSync.ts`

Funzione condivisa che gestisce la logica di sincronizzazione.

**Percorso**: `baux-paws-access/supabase/functions/_shared/odoo/productSync.ts`

**Funzioni principali**:
- `syncProductToOdoo()`: Sincronizza un singolo prodotto
- `syncProductsBatchToOdoo()`: Sincronizza multipli prodotti

### 3. Sincronizzazione Automatica

I prodotti vengono automaticamente sincronizzati quando:
- Vengono creati tramite il pannello admin
- Vengono modificati tramite il pannello admin

La sincronizzazione è **non-bloccante**: se fallisce, non impedisce la creazione/modifica del prodotto.

## Configurazione Odoo

### Campi Custom Richiesti

Per il corretto funzionamento, è necessario creare i seguenti campi custom in Odoo sul modello `product.product`:

#### 1. `x_product_id` (Char/Text)
- **Tipo**: Char (Text)
- **Label**: Product ID
- **Help**: UUID del prodotto dal sistema ecommerce (identificatore univoco)
- **Tracking**: ✅ (consigliato)

#### 2. `x_product_type` (Char/Text)
- **Tipo**: Char (Text)
- **Label**: Product Type
- **Help**: Tipo di prodotto (class, experience, trip)
- **Tracking**: ✅ (consigliato)

#### 3. Campi Opzionali (per metadata aggiuntivi)

- `x_max_adults` (Integer): Numero massimo di adulti
- `x_max_dogs` (Integer): Numero massimo di cani
- `x_duration_hours` (Integer): Durata in ore (per class/experience)
- `x_duration_days` (Integer): Durata in giorni (per trip)
- `x_meeting_point` (Char/Text): Punto di incontro
- `x_location` (Char/Text): Località (per trip)

### Come Creare i Campi Custom in Odoo

1. **Attiva Developer Mode**:
   - Vai su Settings → Activate Developer Mode

2. **Crea i Campi**:
   - Vai su Settings → Technical → Database Structure → Models
   - Cerca `product.product` e cliccalo
   - Vai alla tab Fields
   - Clicca su Create per ogni campo

3. **Aggiungi i Campi alla Vista**:
   - Vai su Settings → Technical → User Interface → Views
   - Cerca `product.product.form` (o `product.template.form`)
   - Crea una vista ereditaria (Inherit) o modifica quella esistente
   - Aggiungi i campi custom nella posizione desiderata

**Nota**: Se i campi custom non esistono, la sincronizzazione funzionerà comunque usando solo i campi standard di Odoo. I campi custom verranno aggiunti quando disponibili.

## Struttura Prodotto in Odoo

Ogni prodotto sincronizzato avrà:

- **name**: Nome del prodotto
- **type**: `service` (prodotto servizio, non stoccabile)
- **sale_ok**: `true` se il prodotto è attivo, `false` altrimenti
- **purchase_ok**: `false` (prodotti solo per vendita)
- **list_price**: `0` (prezzi sono dinamici basati su adulti/cani)
- **description**: Descrizione del prodotto
- **x_product_id**: UUID del prodotto Supabase (identificatore univoco)
- **x_product_type**: Tipo prodotto (`class`, `experience`, `trip`)

## Identificazione Prodotti

Il sistema usa `x_product_id` (UUID Supabase) per identificare univocamente i prodotti. Questo garantisce:

1. **1-to-1 Mapping**: Un prodotto ecommerce = un prodotto Odoo
2. **Nessun Duplicato**: Se un prodotto esiste già (trovato per `x_product_id`), viene aggiornato invece di creare un duplicato
3. **Migrazione Semplice**: Quando migri il database Odoo, puoi semplicemente risincronizzare tutti i prodotti usando lo stesso UUID

## Sincronizzazione Batch Iniziale

Per sincronizzare tutti i prodotti attivi esistenti:

### Opzione 1: Tramite cURL
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/sync-products-to-odoo" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Opzione 2: Tramite Dashboard Supabase
1. Vai su Supabase Dashboard → Edge Functions
2. Trova `sync-products-to-odoo`
3. Clicca su "Invoke" e lascia il body vuoto

### Opzione 3: Tramite Script TypeScript
```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/sync-products-to-odoo`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  }
);

const result = await response.json();
console.log('Sync result:', result);
```

## Dopo la Migrazione del Database Odoo

Quando migri il database Odoo:

1. **Configura le nuove credenziali**:
   - Aggiorna le variabili d'ambiente Odoo (`OD_URL`, `OD_DB_NAME`, `OD_LOGIN`, `OD_API_KEY`)
   - Oppure usa `OD_ACTIVE_ACCOUNT` per switchare tra account

2. **Risincronizza tutti i prodotti**:
   ```bash
   curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/sync-products-to-odoo" \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

3. **Verifica i risultati**:
   - Controlla i log della funzione per vedere quanti prodotti sono stati sincronizzati
   - Verifica in Odoo che tutti i prodotti siano presenti

## Integrazione con Ordini

I prodotti sincronizzati vengono automaticamente utilizzati quando:

- Vengono creati **Purchase Orders** (PO) per i fornitori
- Vengono creati **Sales Orders** per i clienti
- Vengono create **Sales Invoices** per l'accounting

Le funzioni `purchaseOrder.ts` e `salesInvoice.ts` cercano i prodotti usando `x_product_id` per garantire la corretta associazione.

## Troubleshooting

### I prodotti non vengono sincronizzati

1. **Verifica la configurazione Odoo**:
   - Controlla che le variabili d'ambiente siano configurate correttamente
   - Verifica che le credenziali Odoo siano valide

2. **Controlla i log**:
   - Vai su Supabase Dashboard → Edge Functions → Logs
   - Cerca errori nella funzione `sync-products-to-odoo`

3. **Verifica i campi custom**:
   - Se i campi custom non esistono, la sincronizzazione funzionerà comunque
   - I log mostreranno warning se i campi custom non sono disponibili

### Prodotti duplicati in Odoo

Se vedi prodotti duplicati:

1. **Verifica che `x_product_id` sia configurato**:
   - I prodotti dovrebbero essere identificati da `x_product_id`
   - Se manca, il sistema cerca per nome (può creare duplicati)

2. **Risincronizza i prodotti**:
   - La sincronizzazione aggiorna i prodotti esistenti invece di crearne di nuovi
   - Esegui una sincronizzazione batch per allineare tutto

### La sincronizzazione automatica non funziona

1. **Verifica le variabili d'ambiente**:
   - `VITE_SUPABASE_URL` deve essere configurato
   - `VITE_SUPABASE_PUBLISHABLE_KEY` deve essere configurato

2. **Controlla la console del browser**:
   - Apri la console del browser quando crei/modifichi un prodotto
   - Cerca warning o errori relativi alla sincronizzazione Odoo

3. **La sincronizzazione è non-bloccante**:
   - Anche se fallisce, non impedisce la creazione/modifica del prodotto
   - Puoi sempre sincronizzare manualmente dopo

## Best Practices

1. **Sincronizza regolarmente**:
   - Esegui una sincronizzazione batch dopo aver fatto modifiche multiple ai prodotti
   - La sincronizzazione automatica copre i casi singoli

2. **Verifica dopo la migrazione**:
   - Dopo aver migrato il database Odoo, risincronizza tutti i prodotti
   - Verifica che tutti i prodotti attivi siano presenti

3. **Monitora i log**:
   - Controlla periodicamente i log della funzione per errori
   - I warning sono normali se i campi custom non esistono ancora

4. **Mantieni i prodotti attivi**:
   - Solo i prodotti con `active = true` vengono sincronizzati
   - I prodotti disattivati rimangono in Odoo ma con `sale_ok = false`

## Variabili d'Ambiente

### Edge Function (Supabase)
- `OD_URL`: URL di Odoo
- `OD_DB_NAME`: Nome database Odoo
- `OD_LOGIN`: Username Odoo
- `OD_API_KEY`: API Key Odoo
- `OD_ACTIVE_ACCOUNT`: Account attivo (opzionale, default: 'default')
- `SUPABASE_URL`: URL Supabase (automatico)
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key (automatico)

### Frontend (per sincronizzazione automatica)
- `VITE_SUPABASE_URL`: URL Supabase
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Anon Key Supabase

## Supporto

Per problemi o domande:
1. Controlla i log della funzione Edge Function
2. Verifica la configurazione Odoo
3. Consulta questo documento


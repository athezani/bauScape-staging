# Connessione Sales Orders e Purchase Orders in Odoo

Questo documento descrive come Sales Orders e Purchase Orders sono collegati in Odoo usando la funzionalità Make to Order.

## Panoramica

Il sistema ora collega automaticamente:
- **Purchase Orders** → **Sales Orders** tramite `sale_order_ids` (Many2many)
- **Purchase Order Lines** → **Sales Order Lines** tramite `sale_line_id` (Many2one)

Questo permette di:
- Tracciare da quale ordine di vendita proviene ogni ordine di acquisto
- Vedere tutti i PO collegati a un SO direttamente in Odoo
- Usare le funzionalità native di Odoo per Make to Order

## Implementazione

### 1. Collegamento Automatico nei Nuovi Ordini

Quando viene creato un Purchase Order:
1. Il sistema cerca il Sales Order corrispondente usando `stripe_payment_intent_id`
2. Collega il PO al SO usando `sale_order_ids`
3. Collega ogni PO line alla corrispondente SO line usando `sale_line_id`

**File**: `baux-paws-access/supabase/functions/_shared/odoo/purchaseOrder.ts`

### 2. Collegamento Ordini Storici

Uno script permette di collegare gli ordini storici che non sono ancora collegati.

**Edge Function**: `link-so-po-historical`

**Utilizzo**:

#### Collegare tutti gli ordini storici:
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/link-so-po-historical" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

#### Collegare un PO specifico:
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/link-so-po-historical?poId=123" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Come Funziona il Collegamento

### 1. Ricerca del Sales Order

Il sistema cerca il SO usando (in ordine di priorità):
1. **Custom field `x_sale_order_id`** nella PO line (se presente)
2. **`client_order_ref`** nel SO che corrisponde a `stripe_payment_intent_id`

### 2. Collegamento PO → SO

```typescript
// Collega PO a SO
await client.write('purchase.order', [poId], {
  sale_order_ids: [[6, 0, [saleOrderId]]], // Many2many format
});
```

### 3. Collegamento PO Line → SO Line

```typescript
// Collega PO line a SO line
await client.write('purchase.order.line', [poLineId], {
  sale_line_id: saleOrderLineId, // Many2one format
});
```

## Configurazione Prodotti Make to Order (Opzionale)

Per abilitare la generazione automatica di PO da SO quando si conferma un SO, puoi configurare i prodotti come "Make to Order":

### In Odoo:

1. **Vai su Products** → Seleziona un prodotto
2. **Tab "Inventory"**:
   - **Routes**: Seleziona "Buy" e "Make To Order (MTO)"
   - **Purchase Method**: "Make To Order"
3. **Salva**

**Nota**: Con questa configurazione, quando confermi un SO, Odoo genera automaticamente un PO collegato. Tuttavia, il nostro sistema crea già i PO manualmente, quindi questa configurazione è opzionale.

## Verifica del Collegamento

### In Odoo:

1. **Apri un Purchase Order**
   - Dovresti vedere il campo "Sales Orders" con il SO collegato
   - Nelle order lines, dovresti vedere "Sale Order Line" collegato

2. **Apri un Sales Order**
   - Dovresti vedere il campo "Purchase Orders" con i PO collegati
   - Nelle order lines, dovresti vedere "Purchase Order Lines" collegati

### Tramite API:

```bash
# Leggi un PO e verifica sale_order_ids
curl -X POST "https://your-odoo.com/jsonrpc" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "call",
    "params": {
      "service": "object",
      "method": "execute_kw",
      "args": [
        "database",
        uid,
        "api_key",
        "purchase.order",
        "read",
        [[poId]],
        {"fields": ["name", "sale_order_ids", "order_line"]}
      ]
    }
  }'
```

## Troubleshooting

### I PO non vengono collegati ai SO

1. **Verifica che il SO esista**:
   - Controlla che il `stripe_payment_intent_id` corrisponda al `client_order_ref` del SO
   - Verifica che il SO sia stato creato prima del PO

2. **Verifica i custom fields**:
   - Il PO line deve avere `x_stripe_payment_id` o `x_sale_order_id`
   - Il SO deve avere `client_order_ref` con il payment intent ID

3. **Controlla i log**:
   - Vai su Supabase Dashboard → Edge Functions → Logs
   - Cerca errori nella funzione `create-booking` o `link-so-po-historical`

### Gli ordini storici non vengono collegati

1. **Esegui lo script di collegamento**:
   ```bash
   curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/link-so-po-historical" \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

2. **Verifica manualmente**:
   - Apri un PO in Odoo
   - Controlla se ha `x_stripe_payment_id` o `x_sale_order_id` nelle order lines
   - Cerca manualmente il SO corrispondente

3. **Collega manualmente in Odoo**:
   - Apri il PO
   - Nel campo "Sales Orders", seleziona il SO corrispondente
   - Salva

## Best Practices

1. **Esegui lo script di collegamento storico** dopo aver implementato questa funzionalità
2. **Verifica periodicamente** che i nuovi ordini siano collegati correttamente
3. **Usa i custom fields** (`x_stripe_payment_id`, `x_sale_order_id`) per tracciabilità aggiuntiva
4. **Non rimuovere i custom fields** - sono utili per il collegamento e la tracciabilità

## Note Tecniche

- Il campo `sale_order_ids` è un Many2many, quindi un PO può essere collegato a più SO (anche se nel nostro caso è 1-to-1)
- Il campo `sale_line_id` è un Many2one, quindi ogni PO line è collegata a una specifica SO line
- Il collegamento è bidirezionale: vedi SO da PO e PO da SO

## Supporto

Per problemi o domande:
1. Controlla i log della funzione Edge Function
2. Verifica la configurazione Odoo
3. Consulta questo documento




# Fix: Errore "Invalid signature" nei Webhook Stripe

## Problema
Tutti i webhook Stripe ritornavano errore 400 con messaggio:
```json
{
  "error": "Invalid signature"
}
```

## Causa
Il problema era nella funzione `getRawBody()` che utilizzava `req.arrayBuffer()` in Next.js App Router. Questo metodo non funziona correttamente per la verifica della firma dei webhook Stripe perché:

1. Il body potrebbe essere già stato letto o parsato
2. La conversione da ArrayBuffer a Buffer potrebbe alterare i bytes
3. In Next.js App Router, il modo corretto è usare `req.text()` direttamente

## Soluzione Implementata

### 1. Correzione della funzione `getRawBody()`

**Prima:**
```typescript
async function getRawBody(req: NextRequest): Promise<Buffer> {
  try {
    const arrayBuffer = await req.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    // Fallback con req.text()
    const text = await req.text();
    return Buffer.from(text, 'utf-8');
  }
}
```

**Dopo:**
```typescript
async function getRawBody(req: NextRequest): Promise<Buffer> {
  // Next.js App Router: For Stripe webhooks, we need the raw body as a string
  // then convert to Buffer. This is the correct way for Next.js 13+ App Router.
  try {
    // Read body as text (raw string, not parsed JSON)
    const text = await req.text();
    
    // Convert to Buffer using UTF-8 encoding
    // This preserves the exact bytes that Stripe sent
    const buffer = Buffer.from(text, 'utf-8');
    
    console.log('[stripe-webhook-odoo] Raw body read successfully, length:', buffer.length);
    return buffer;
  } catch (err: any) {
    console.error('[stripe-webhook-odoo] ❌ Could not extract raw body from request:', err?.message || err);
    throw new Error(`Failed to read raw body: ${err?.message || 'Unknown error'}`);
  }
}
```

### 2. Miglioramento della gestione degli errori e logging

Aggiunto logging dettagliato per:
- Verifica presenza e formato della signature
- Verifica presenza e formato del webhook secret
- Logging degli errori di verifica con dettagli specifici
- Messaggi di errore più informativi

### 3. Verifiche aggiuntive

- Verifica che il webhook secret sia configurato
- Verifica che il webhook secret abbia il formato corretto (`whsec_...`)
- Logging del body per debugging (primi 100 caratteri)
- Logging della signature per debugging (primi e ultimi 20 caratteri)

## File Modificato

- `ecommerce-homepage/src/app/api/stripe-webhook-odoo/route.ts`

## Test

Dopo il deploy, testare il webhook:

1. Vai su Stripe Dashboard → **Developers** → **Webhooks**
2. Seleziona il webhook `bauscape-odoo-orders-prod`
3. Clicca su **"Send test webhook"**
4. Seleziona evento: `payment_intent.succeeded`
5. Clicca **"Send test webhook"**
6. Verifica che il webhook venga ricevuto correttamente (status 200)

## Verifica Log

Dopo un test, controlla i log su Vercel:

1. Vai su Vercel Dashboard → Il tuo progetto → **Deployments**
2. Seleziona l'ultimo deployment
3. Vai su **Functions** → `api/stripe-webhook-odoo`
4. Dovresti vedere:
   - `✅ Signature verified successfully!`
   - `Event type: payment_intent.succeeded`
   - `Event ID: evt_...`

## Note Importanti

- Il webhook secret (`ST_WEBHOOK_SECRET`) deve corrispondere esattamente a quello in Stripe Dashboard
- Il body deve essere letto come stringa raw, non come JSON parsato
- La conversione a Buffer deve preservare i bytes esatti inviati da Stripe
- In Next.js App Router, `req.text()` restituisce il body raw senza parsing automatico

## Troubleshooting

Se il problema persiste:

1. **Verifica il webhook secret:**
   - Controlla che `ST_WEBHOOK_SECRET` su Vercel corrisponda a quello in Stripe Dashboard
   - Il secret deve iniziare con `whsec_`

2. **Verifica i log:**
   - Controlla i log su Vercel per vedere se il body viene letto correttamente
   - Verifica che la signature sia presente negli headers

3. **Verifica l'endpoint:**
   - Assicurati che l'URL del webhook in Stripe sia: `https://flixdog.com/api/stripe-webhook-odoo`
   - Verifica che l'endpoint risponda correttamente (test con GET)

4. **Test con Stripe CLI:**
   ```bash
   stripe listen --forward-to https://flixdog.com/api/stripe-webhook-odoo
   ```




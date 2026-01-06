# Fix 405 Error - Stripe Webhook

## Problema
Il webhook Stripe restituiva un errore 405 (Method Not Allowed).

## Soluzione Implementata

1. **Rimosso vecchio file Vercel Serverless Function**
   - Eliminato `/api/stripe-webhook-odoo.ts` (vecchio formato Vercel)
   - Questo file causava conflitti con il nuovo Next.js API Route

2. **Aggiunto handler GET per test**
   - Aggiunto `export async function GET()` nel file `/src/app/api/stripe-webhook-odoo/route.ts`
   - Permette di testare l'endpoint con una richiesta GET
   - Restituisce informazioni sullo stato dell'endpoint

3. **Verificato export POST**
   - Il handler POST è già presente e configurato correttamente
   - Usa `NextRequest` e `NextResponse` da `next/server`

## Prossimi Step

1. **Aggiornare URL Webhook in Stripe Dashboard**
   - Vai su Stripe Dashboard → Developers → Webhooks
   - Trova il webhook per `payment_intent.succeeded`
   - Aggiorna l'URL a: `https://[your-domain]/api/stripe-webhook-odoo`
   - Verifica che il metodo sia POST

2. **Testare l'endpoint**
   - Fai una richiesta GET a `/api/stripe-webhook-odoo` per verificare che risponda
   - Dovresti ricevere: `{ status: 'ok', message: 'Stripe webhook endpoint is ready', ... }`

3. **Testare il webhook**
   - Dopo aver aggiornato l'URL in Stripe, fai un resend di un evento di test
   - Verifica i log di Vercel per confermare che il webhook viene ricevuto correttamente

## Note

- Il vecchio endpoint Vercel Serverless Function (`/api/stripe-webhook-odoo.ts`) è stato completamente rimosso
- Il nuovo endpoint Next.js API Route è in `/src/app/api/stripe-webhook-odoo/route.ts`
- L'endpoint supporta sia GET (per test) che POST (per webhook Stripe)


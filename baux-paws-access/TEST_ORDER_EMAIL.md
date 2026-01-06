# Test Invio Email per Ordine Specifico

## Comando da Eseguire

Per testare l'invio email per l'ordine **9GLVYRLD**, esegui:

```bash
cd baux-paws-access
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY deno run --allow-net --allow-env test-email-order.ts 9GLVYRLD
```

## Come Ottenere la Service Role Key

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il progetto: **zyonwzilijgnnnmhxvbo**
3. Vai su **Settings** → **API**
4. Nella sezione **Project API keys**, trova **service_role** key
5. Clicca sull'icona di copia per copiare la chiave

## Cosa Fa lo Script

1. ✅ Cerca il booking con `order_number = 9GLVYRLD`
2. ✅ Recupera i dettagli del prodotto (incluso `no_adults`)
3. ✅ Prepara il payload email con tutti i dati necessari
4. ✅ Chiama la funzione `send-transactional-email`
5. ✅ Mostra il risultato (successo o errore)

## Output Atteso

Se tutto funziona correttamente, vedrai:

```
✅ EMAIL SENT SUCCESSFULLY!
   Response: { "success": true, ... }
   
📧 Please check your inbox at: customer@email.com
   (Also check spam folder if not found)
```

## Verifica Template ID

Lo script selezionerà automaticamente:
- **Template ID 3** (o `BREVO_TEMPLATE_ID_NO_ADULTS`) se il prodotto ha `no_adults = true` e `number_of_adults = 0`
- **Template ID 2** (o `BREVO_TEMPLATE_ID`) per prodotti normali

## Troubleshooting

Se vedi errori:
1. Verifica che `BREVO_API_KEY` sia configurato in Supabase Secrets
2. Verifica che il template ID 3 esista in Brevo e sia pubblicato
3. Controlla i log della funzione `send-transactional-email` in Supabase Dashboard





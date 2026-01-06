# Test FAQ System

## Stato Attuale

Le tabelle FAQ **non sono ancora state create** nel database. Devi eseguire le migration prima di poter testare.

## Eseguire le Migration

### Opzione 1: Supabase Dashboard (Consigliato)

1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new
2. Apri il file: `supabase/migrations/20250117000000_add_product_faq.sql`
3. Copia tutto il contenuto SQL
4. Incolla nel SQL Editor
5. Clicca "Run" o premi Cmd/Ctrl + Enter
6. Ripeti per: `supabase/migrations/20250117000001_add_example_faqs.sql`

### Opzione 2: Script di Test Automatico

Esegui lo script che verifica e fornisce istruzioni:

```bash
cd baux-paws-access
node test-and-fix-faq.js
```

Lo script:
- ✅ Verifica se le tabelle esistono
- ✅ Fornisce istruzioni chiare se mancano
- ✅ Mostra il SQL da eseguire
- ✅ Esegue test completi dopo le migration

## Dopo le Migration

Una volta eseguite le migration, esegui di nuovo:

```bash
node test-and-fix-faq.js
```

Lo script eseguirà:
1. ✅ Creazione di una FAQ di test
2. ✅ Associazione FAQ a prodotti esistenti
3. ✅ Caricamento FAQ per prodotto
4. ✅ Verifica ordinamento

## Note Importanti

- Le RLS policies richiedono ruolo admin per creare/modificare FAQ
- La secret key API bypassa RLS ma le policies potrebbero comunque applicarsi
- Se i test falliscono per permessi, verifica che il ruolo admin sia configurato correttamente nella tabella `profile`

## File di Test

- `test-and-fix-faq.js` - Script principale di test e verifica
- `test-faq-direct.js` - Test diretto (dopo migration)
- `test-faq-system.js` - Test completo del sistema




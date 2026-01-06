# Eseguire le Migration FAQ

Le tabelle FAQ devono essere create prima di poter testare il sistema. Ecco come procedere:

## Opzione 1: Supabase Dashboard (Consigliato)

1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new
2. Apri il file: `supabase/migrations/20250117000000_add_product_faq.sql`
3. Copia tutto il contenuto SQL
4. Incolla nel SQL Editor di Supabase
5. Clicca "Run" o premi Cmd/Ctrl + Enter
6. Ripeti per: `supabase/migrations/20250117000001_add_example_faqs.sql`

## Opzione 2: Supabase CLI

```bash
# Installa Supabase CLI (se non già installato)
npm install -g supabase

# Login
supabase login

# Link al progetto
supabase link --project-ref zyonwzilijgnnnmhxvbo

# Push delle migration
cd baux-paws-access
supabase db push
```

## Dopo le Migration

Esegui i test:

```bash
cd baux-paws-access
node test-faq-direct.js
```

## Verifica Manuale

Puoi verificare che le tabelle siano state create:

1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/editor
2. Cerca le tabelle `faq` e `product_faq` nella lista delle tabelle
3. Verifica che esistano e abbiano le colonne corrette




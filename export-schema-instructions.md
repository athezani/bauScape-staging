# Esportazione Schema Produzione

## Opzione 1: Via Supabase Dashboard (Raccomandato)

1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/settings/database
2. Scorri fino a "Connection string"
3. Copia la connection string (URI format)
4. Usa pg_dump locale

## Opzione 2: Via SQL Editor (Manuale)

1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new
2. Esegui query per vedere struttura tabelle
3. Esporta manualmente

## Opzione 3: Via Supabase CLI (se hai Docker)

```bash
cd baux-paws-access
supabase db dump --schema public -f production-schema.sql
```

Ma richiede Docker Desktop installato.

# Esportazione Schema Produzione

## Opzione 1: Via Connection String (Raccomandato)

1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/settings/database
2. Copia la "Connection string" (URI format)
3. Esegui:

```bash
pg_dump "postgresql://postgres:[PASSWORD]@db.zyonwzilijgnnnmhxvbo.supabase.co:5432/postgres" \
  --schema-only \
  --no-owner \
  --no-acl \
  > production-schema.sql
```

## Opzione 2: Via Supabase Dashboard SQL Editor

1. Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new
2. Esegui questo SQL per esportare lo schema completo:

```sql
-- Esporta tutto lo schema
SELECT 
  '-- Tables' as section,
  string_agg(
    'CREATE TABLE ' || quote_ident(table_name) || ' (...);',
    E'\n'
  ) as ddl
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';
```

## Opzione 3: Usa Supabase CLI (richiede Docker)

```bash
cd baux-paws-access
supabase link --project-ref zyonwzilijgnnnmhxvbo
supabase db dump --schema public -f production-schema.sql
```

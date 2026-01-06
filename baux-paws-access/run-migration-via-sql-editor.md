# Esecuzione Migrazione Calcolo Automatico Durata

La migrazione SQL è stata preparata ma deve essere eseguita manualmente dal Supabase Dashboard.

## Istruzioni

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il progetto: `zyonwzilijgnnnmhxvbo`
3. Vai su **SQL Editor** (menu laterale)
4. Clicca su **New Query**
5. Apri il file: `baux-paws-access/supabase/migrations/20251228000000_auto_calculate_duration_from_slots.sql`
6. Copia tutto il contenuto
7. Incolla nel SQL Editor
8. Clicca su **Run** (o premi Cmd/Ctrl + Enter)

## Verifica

Dopo l'esecuzione, verifica che:
- Le funzioni `calculate_product_duration` e `update_product_duration` esistano
- I trigger siano stati creati
- `duration_hours` sia nullable nelle tabelle `experience` e `class`

```sql
-- Verifica funzioni
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('calculate_product_duration', 'update_product_duration');

-- Verifica trigger
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE '%duration%';
```


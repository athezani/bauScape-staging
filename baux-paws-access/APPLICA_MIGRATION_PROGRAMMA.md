# 🚀 Applica Migration Sistema Programma

## ⚠️ IMPORTANTE: Prima di eseguire i test

**Devi applicare la migration prima di eseguire i test!**

## 📋 Istruzioni per Applicare la Migration

### Metodo 1: Via Supabase Dashboard (Consigliato)

1. Vai su: **https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new**

2. Apri il file: `baux-paws-access/supabase/migrations/20250116000002_add_product_program.sql`

3. **Copia TUTTO il contenuto** del file

4. **Incolla** nel SQL Editor di Supabase

5. Clicca **"Run"** o premi `Ctrl+Enter` (o `Cmd+Enter` su Mac)

6. Attendi che la migration sia completata (dovresti vedere "Success")

### Metodo 2: Verifica che la Migration sia Applicata

Dopo aver applicato la migration, verifica che le tabelle esistano:

```sql
-- Verifica che le tabelle esistano
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('trip_program_day', 'trip_program_item');
```

Dovresti vedere 2 righe:
- `trip_program_day`
- `trip_program_item`

### Metodo 3: Verifica Indici e Trigger

```sql
-- Verifica indici
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('trip_program_day', 'trip_program_item');

-- Verifica trigger
SELECT tgname 
FROM pg_trigger 
WHERE tgrelid IN (
  'trip_program_day'::regclass,
  'trip_program_item'::regclass
);
```

## ✅ Dopo aver Applicato la Migration

Una volta applicata la migration, puoi:

1. **Eseguire i test**: Apri `test-program-system.sql` nel SQL Editor e eseguilo
2. **Verificare nel provider portal**: I prodotti dovrebbero poter avere un programma
3. **Verificare nel frontend**: I programmi dovrebbero essere visualizzati nelle pagine prodotto

## 🐛 Problemi Comuni

### Errore: "relation already exists"
Se vedi questo errore, significa che la migration è già stata applicata parzialmente. 
Puoi ignorare questo errore o eliminare manualmente le tabelle e riapplicare.

### Errore: "permission denied"
Assicurati di essere loggato come amministratore nel Supabase Dashboard.

### Errore: "syntax error"
Verifica di aver copiato TUTTO il contenuto del file, incluso l'ultima riga.

## 📝 Note

- La migration è **idempotente** (può essere eseguita più volte senza problemi)
- Le tabelle vengono create solo se non esistono già
- Gli indici e i trigger vengono creati solo se non esistono già


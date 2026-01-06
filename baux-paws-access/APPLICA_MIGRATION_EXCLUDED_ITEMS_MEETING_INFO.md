# 🚀 Applica Migration: excluded_items, meeting_info, show_meeting_info

## 📋 Istruzioni per Applicare la Migration

### Metodo: Via Supabase Dashboard (Consigliato)

1. Vai su: **https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new**

2. Apri il file: `baux-paws-access/supabase/migrations/20251227100822_add_excluded_items_and_meeting_info.sql`

3. **Copia TUTTO il contenuto** del file

4. **Incolla** nel SQL Editor di Supabase

5. Clicca **"Run"** o premi `Ctrl+Enter` (o `Cmd+Enter` su Mac)

6. Attendi che la migration sia completata (dovresti vedere "Success")

## ✅ Verifica Post-Migrazione

Dopo aver applicato la migration, verifica che le colonne siano state aggiunte:

```sql
-- Verifica colonne su experience
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'experience' 
AND column_name IN ('excluded_items', 'meeting_info', 'show_meeting_info');

-- Verifica colonne su class
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'class' 
AND column_name IN ('excluded_items', 'meeting_info', 'show_meeting_info');

-- Verifica colonne su trip
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trip' 
AND column_name IN ('excluded_items', 'meeting_info', 'show_meeting_info');
```

Dovresti vedere 3 righe per ogni tabella con:
- `excluded_items` (TEXT[])
- `meeting_info` (JSONB)
- `show_meeting_info` (BOOLEAN)

## 📝 Cosa Aggiunge Questa Migration

1. **excluded_items**: Array di stringhe (max 10) per "Cosa non è incluso"
2. **meeting_info**: Oggetto JSONB con `text` e `google_maps_link` per orario e punto di incontro
3. **show_meeting_info**: Boolean per controllare se mostrare le info di incontro nella pagina prodotto

## 🐛 Problemi Comuni

### Errore: "column already exists"
Se vedi questo errore, significa che la colonna esiste già. La migration è idempotente e ignora le colonne esistenti, quindi puoi ignorare questo messaggio.

### Errore: "permission denied"
Assicurati di essere loggato come amministratore nel Supabase Dashboard.


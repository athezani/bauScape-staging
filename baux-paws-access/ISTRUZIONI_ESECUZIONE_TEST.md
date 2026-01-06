# 🚀 Istruzioni per Eseguire i Test del Sistema Programma

## ⚠️ IMPORTANTE

Lo script SQL deve essere eseguito **direttamente nel Supabase Dashboard** perché contiene operazioni DDL complesse (CREATE TABLE, CREATE POLICY, ecc.) che non possono essere eseguite via API REST.

## 📋 Passi per Eseguire i Test

### 1. Apri Supabase Dashboard

Vai su: **https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new**

### 2. Apri lo Script di Test

Apri il file: `baux-paws-access/test-completo-programma.sql`

### 3. Copia e Incolla

1. **Copia TUTTO il contenuto** del file `test-completo-programma.sql`
2. **Incolla** nel SQL Editor di Supabase
3. Clicca **"Run"** o premi `Ctrl+Enter` (o `Cmd+Enter` su Mac)

### 4. Verifica i Risultati

Dopo l'esecuzione, dovresti vedere:

- ✅ Messaggi di successo per ogni operazione
- 📊 Una tabella con il riepilogo dei programmi creati
- 📋 Una tabella con esempi di programmi

## ✅ Cosa Fa lo Script

Lo script `test-completo-programma.sql`:

1. **Verifica se le tabelle esistono**
   - Se non esistono, le crea automaticamente (applica la migration)
   - Crea indici, trigger e RLS policies

2. **Crea programmi di esempio**
   - Per un'esperienza attiva
   - Per una classe attiva
   - Per un viaggio attivo (fino a 3 giorni)

3. **Mostra un riepilogo**
   - Numero di prodotti con programma per tipo
   - Numero totale di giorni
   - Numero totale di attività

## 🐛 Risoluzione Problemi

### Errore: "relation already exists"
- **Significa**: Le tabelle esistono già
- **Soluzione**: Lo script gestisce automaticamente questo caso, puoi ignorare l'errore

### Errore: "policy already exists"
- **Significa**: Le RLS policies esistono già
- **Soluzione**: Lo script usa `DROP POLICY IF EXISTS` prima di crearle, quindi questo non dovrebbe accadere

### Nessun prodotto attivo trovato
- **Significa**: Non ci sono prodotti attivi nel database
- **Soluzione**: Crea almeno un prodotto di ogni tipo (esperienza, classe, viaggio) e assicurati che siano attivi

## 📝 Dopo l'Esecuzione

Dopo aver eseguito lo script con successo:

1. ✅ Le tabelle `trip_program_day` e `trip_program_item` esistono
2. ✅ I programmi di esempio sono stati creati
3. ✅ Puoi verificare nel provider portal che i programmi siano visibili
4. ✅ Puoi verificare nel frontend ecommerce che i programmi siano visualizzati correttamente

## 🔄 Ri-esecuzione

Lo script è **idempotente**: può essere eseguito più volte senza problemi. Ogni volta:
- Elimina i programmi esistenti per i prodotti di test
- Ricrea i programmi di esempio
- Mostra un nuovo riepilogo




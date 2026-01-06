# 🧪 Test Sistema Programma Prodotto

## 📋 Checklist Pre-Test

Prima di eseguire i test, assicurati che:

- [ ] La migration `20250116000002_add_product_program.sql` sia stata applicata al database
- [ ] Ci siano almeno:
  - 1 esperienza attiva
  - 1 classe attiva  
  - 1 viaggio attivo con `duration_days` impostato
- [ ] Le variabili d'ambiente siano configurate:
  - `VITE_SUPABASE_URL` o `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` o `VITE_SUPABASE_SERVICE_ROLE_KEY`

## 🚀 Eseguire i Test

### Metodo 1: Script TypeScript

```bash
cd baux-paws-access
npx tsx test-program-system.ts
```

### Metodo 2: Compilare e Eseguire

```bash
cd baux-paws-access
npx tsc test-program-system.ts --esModuleInterop --moduleResolution node
node test-program-system.js
```

## 📊 Test Inclusi

Lo script esegue i seguenti test:

1. **Verifica Migration**
   - Controlla che le tabelle `trip_program_day` e `trip_program_item` esistano
   - Verifica che gli indici siano stati creati

2. **Creazione Programma per Esperienza**
   - Crea un giorno con introduzione
   - Aggiunge 5 attività di esempio
   - Verifica che tutto sia salvato correttamente

3. **Creazione Programma per Classe**
   - Crea un giorno con introduzione
   - Aggiunge 5 attività di esempio
   - Verifica che tutto sia salvato correttamente

4. **Creazione Programma per Viaggio**
   - Crea 3 giorni (o fino a `duration_days`)
   - Ogni giorno ha introduzione e attività
   - Verifica che tutto sia salvato correttamente

5. **Caricamento Programma**
   - Carica i programmi creati per tutti i tipi di prodotto
   - Verifica che i dati siano corretti (giorni, introduzioni, attività)

6. **Validazione Regole**
   - Testa che `day_number` debba essere > 0
   - Testa che `activity_text` non possa essere vuoto
   - Verifica constraint univoco per (product_id, product_type, day_number)

7. **RLS Policies**
   - Verifica che la lettura pubblica funzioni per prodotti attivi
   - Verifica che le policies siano configurate correttamente

## ✅ Risultati Attesi

Se tutti i test passano, vedrai:

```
✅ Test passati: X/X
❌ Test falliti: 0/X
```

## 🔍 Test Manuali Aggiuntivi

Dopo aver eseguito lo script automatico, esegui questi test manuali:

### 1. Test Provider Portal

1. Accedi al provider portal
2. Vai su un prodotto esistente (esperienza/classe/viaggio)
3. Clicca sul tab "Programma"
4. Verifica:
   - [ ] Per esperienze/classi: vista semplificata con un solo giorno
   - [ ] Per viaggi: tabs per ogni giorno
   - [ ] Puoi aggiungere introduzione
   - [ ] Puoi aggiungere attività (max 10 per giorno)
   - [ ] Puoi rimuovere attività
   - [ ] Puoi rimuovere giorni (per viaggi)
   - [ ] Per viaggi: non puoi aggiungere più giorni di `duration_days`

5. Salva il prodotto
6. Ricarica la pagina e verifica che il programma sia salvato

### 2. Test Frontend E-commerce

1. Vai alla pagina prodotto di un'esperienza con programma
2. Verifica:
   - [ ] La sezione "Programma" appare sotto "Cosa è Incluso"
   - [ ] Il titolo è "Programma"
   - [ ] Per esperienze/classi: mostra "Giorno 1"
   - [ ] L'introduzione è visibile (se presente)
   - [ ] Le attività sono mostrate come elenco puntato

3. Vai alla pagina prodotto di un viaggio con programma
4. Verifica:
   - [ ] Ogni giorno è una sezione separata
   - [ ] Il titolo mostra "Giorno X - [data]" se `startDate` è disponibile
   - [ ] Altrimenti mostra solo "Giorno X"
   - [ ] L'introduzione di ogni giorno è visibile (se presente)
   - [ ] Le attività sono mostrate come elenco puntato

### 3. Test Edge Cases

1. **Prodotto senza programma**
   - [ ] La sezione "Programma" non appare nel frontend
   - [ ] Non ci sono errori nella console

2. **Giorno senza introduzione**
   - [ ] Il giorno viene visualizzato correttamente
   - [ ] Solo le attività sono mostrate

3. **Giorno senza attività**
   - [ ] Il giorno viene visualizzato correttamente
   - [ ] Solo l'introduzione è mostrata (se presente)

4. **Viaggio con giorni non consecutivi**
   - [ ] Solo i giorni con attività sono mostrati
   - [ ] I giorni sono ordinati correttamente

5. **Modifica programma esistente**
   - [ ] Il programma viene aggiornato correttamente
   - [ ] Le modifiche sono visibili nel frontend

## 🐛 Risoluzione Problemi

### Errore: "Tabelle non trovate"
**Soluzione**: Applica la migration manualmente:
1. Vai su Supabase Dashboard → SQL Editor
2. Copia il contenuto di `supabase/migrations/20250116000002_add_product_program.sql`
3. Esegui la query

### Errore: "Nessun prodotto attivo trovato"
**Soluzione**: Crea almeno un prodotto di ogni tipo nel provider portal e assicurati che siano attivi.

### Errore: "RLS Policy denied"
**Soluzione**: Verifica che le RLS policies siano state create correttamente nella migration.

### Il programma non appare nel frontend
**Soluzione**: 
1. Verifica che il prodotto sia attivo
2. Controlla la console del browser per errori
3. Verifica che `useProduct` carichi correttamente il programma
4. Controlla che il programma sia salvato nel database

## 📝 Note

- I test creano programmi di esempio che possono essere lasciati nel database
- Per pulire i dati di test, elimina manualmente i record dalle tabelle `trip_program_item` e `trip_program_day`
- I test usano il service role key per bypassare RLS (necessario per i test)




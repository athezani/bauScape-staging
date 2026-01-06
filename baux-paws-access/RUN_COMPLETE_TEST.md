# 🧪 Test Completo del Sistema - Financial Tracking

## Istruzioni per Eseguire i Test

### Metodo 1: Via Supabase Dashboard (Consigliato)

1. **Apri SQL Editor**
   - Vai su: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new

2. **Carica lo Script**
   - Apri il file: `baux-paws-access/COMPLETE_SYSTEM_TEST.sql`
   - Copia TUTTO il contenuto (Ctrl+A, Ctrl+C)

3. **Esegui lo Script**
   - Incolla nel SQL Editor (Ctrl+V)
   - Clicca su **"Run"** o premi `Ctrl+Enter`

4. **Verifica i Risultati**
   - Controlla l'output nella sezione "Results"
   - Cerca eventuali errori o warning
   - Tutti i test dovrebbero mostrare `✓` se passati

### Metodo 2: Via CLI (se disponibile)

```bash
cd baux-paws-access
psql $DATABASE_URL -f COMPLETE_SYSTEM_TEST.sql
```

## Cosa Testa lo Script

Lo script esegue **16 test completi** che verificano:

### ✅ Test Strutturali
1. **Struttura Database** - Verifica che tutti i campi e enum esistano
2. **Funzione create_booking_transactional** - Verifica parametri finanziari
3. **Prodotti con Pricing Models** - Verifica distribuzione percentage/markup
4. **Retrocompatibilità** - Verifica che i campi legacy esistano ancora

### ✅ Test Logica
5. **Calcolo Prezzo - Percentage** - Testa formula: `costo * (1 + margin/100)`
6. **Calcolo Prezzo - Markup** - Testa formula: `costo + markup * quantità`
7. **Calcolo Valori Finanziari** - Testa: `margin = total - cost - fee`

### ✅ Test Integrità
8. **Integrità Dati Prodotti** - Verifica coerenza dati
9. **Booking Esistenti** - Analizza booking con/senza dati finanziari
10. **Funzione create_booking_transactional** - Verifica firma funzione

### ✅ Test Sistema
11. **Constraints e Validazioni** - Verifica vincoli database
12. **Indici** - Verifica indici per performance
13. **RLS Policies** - Verifica sicurezza
14. **Availability Slots** - Verifica sistema disponibilità
15. **Compatibilità Edge Functions** - Verifica campi necessari

### ✅ Report Finale
16. **Report Completo** - Statistiche e verifica calcoli

## Interpretazione Risultati

### ✅ Test Passati
Se vedi `✓` significa che il test è passato correttamente.

### ⚠️ Warning
I warning indicano problemi minori che non bloccano il sistema:
- Prodotti senza pricing model (normale per retrocompatibilità)
- Booking vecchi senza dati finanziari (normale, creati prima del deploy)

### ❌ Errori
Gli errori indicano problemi critici che devono essere risolti:
- Campi mancanti
- Calcoli errati
- Constraints violati

## Esempio Output Atteso

```
TEST 1: Verifica Struttura Database
----------------------------------------
NOTICE: ✓ Struttura database corretta

TEST 2: Verifica Funzione create_booking_transactional
----------------------------------------
NOTICE: ✓ Funzione include tutti i parametri finanziari

TEST 3: Verifica Prodotti con Pricing Models
----------------------------------------
NOTICE: Prodotti attivi:
NOTICE:   Experiences: 6 totali, 6 con pricing (3 percentage, 3 markup)
NOTICE:   Classes: 7 totali, 7 con pricing (3 percentage, 4 markup)
NOTICE:   Trips: 7 totali, 7 con pricing (3 percentage, 4 markup)
NOTICE: ✓ Verifica prodotti completata

...

========================================
TEST COMPLETATI!
========================================
```

## Troubleshooting

### Se un Test Fallisce

1. **Leggi il messaggio di errore** - Indica cosa manca o è errato
2. **Verifica le migrazioni** - Assicurati che tutte siano state applicate
3. **Controlla i log** - Cerca errori nelle Edge Functions
4. **Rivedi la documentazione** - Consulta `DEPLOYMENT_COMPLETE.md`

### Problemi Comuni

**"Campo mancante"**
- Soluzione: Applica la migration corrispondente

**"Calcolo errato"**
- Soluzione: Verifica la logica nella Edge Function

**"Funzione non trovata"**
- Soluzione: Applica `20250115000003_update_booking_transactional_function.sql`

## Dopo i Test

Se tutti i test passano:

1. ✅ **Sistema Operativo** - Tutto funziona correttamente
2. ⏭️ **Test in Produzione** - Testa con transazioni reali
3. ⏭️ **Monitora** - Controlla i log delle Edge Functions
4. ⏭️ **Aggiorna Costi** - Sostituisci valori placeholder con costi reali

## Supporto

In caso di problemi:
1. Esegui lo script completo e salva l'output
2. Verifica che tutte le migrazioni siano applicate
3. Controlla i log delle Edge Functions
4. Consulta `DEPLOYMENT_COMPLETE.md` per dettagli


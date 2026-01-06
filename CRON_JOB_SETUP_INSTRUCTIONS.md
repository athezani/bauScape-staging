# Setup Cron Job - Istruzioni Dettagliate

## Dati per il Form Supabase

Basandomi sullo screenshot che mi hai mostrato, ecco i dati esatti da inserire:

### 1. Name (Campo obbligatorio)
```
pending-cancellations-reminder
```

### 2. Schedule (Cron expression)
```
0 9 * * *
```

**Spiegazione:**
- `0` = minuto 0
- `9` = ora 9 (UTC)
- `*` = ogni giorno del mese
- `*` = ogni mese
- `*` = ogni giorno della settimana

**Risultato:** Si esegue ogni giorno alle 09:00 UTC (= 10:00 CET / 11:00 CEST)

### 3. Toggle "Use natural language"
**Disattivato** (usa la cron expression sopra)

Se vuoi usare natural language invece, scrivi:
```
Every day at 9 AM
```

### 4. Type
Seleziona: **Supabase Edge Function**

### 5. Seleziona la Function
Dal dropdown che appare, seleziona:
```
check-pending-cancellations
```

---

## Riepilogo Completo

**Name:** `pending-cancellations-reminder`  
**Schedule:** `0 9 * * *`  
**Type:** Supabase Edge Function  
**Function:** `check-pending-cancellations`  

**Descrizione:** Invia reminder giornaliero all'admin se ci sono richieste di cancellazione pending. Le richieste con >3 giorni sono marcate come urgenti.

---

## Verifica Funzionamento

Dopo aver creato il cron job:

1. **Test manuale immediato:**
   ```bash
   curl -X POST "https://zyonwzilijgnnnmhxvbo.supabase.co/functions/v1/check-pending-cancellations" \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Nzk5MDIsImV4cCI6MjA4MDE1NTkwMn0.W-vPOW8XUv4B7gfQpMCHmFi3q3aTBD3THSiwX_Qr_jE" \
     -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b253emlsaWpnbm5ubWh4dmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Nzk5MDIsImV4cCI6MjA4MDE1NTkwMn0.W-vPOW8XUv4B7gfQpMCHmFi3q3aTBD3THSiwX_Qr_jE"
   ```

2. **Verifica logs:**
   - Vai su Supabase Dashboard > Edge Functions > check-pending-cancellations > Logs
   - Dovresti vedere l'esecuzione del cron

3. **Controlla email:**
   - Se ci sono richieste pending, riceverai email su `a.thezani@gmail.com`

---

## Alternative Schedule (se vuoi cambiare)

### Ogni 2 ore (durante orario lavorativo)
```
0 8-18/2 * * *
```
Esegue alle: 08:00, 10:00, 12:00, 14:00, 16:00, 18:00 UTC

### Ogni ora (dalle 8 alle 20)
```
0 8-20 * * *
```

### Due volte al giorno (mattina e pomeriggio)
```
0 9,15 * * *
```
Esegue alle 09:00 e 15:00 UTC

### Solo giorni feriali (Lun-Ven)
```
0 9 * * 1-5
```

---

## Troubleshooting

### "pg_net needs to be installed"
Se vedi questo errore, clicca su "Install pg_net extension" nel form.

### Cron non si attiva
1. Verifica che la function sia deployata: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/functions
2. Controlla che `check-pending-cancellations` sia nella lista
3. Se manca, redeploya:
   ```bash
   cd /Users/adezzani/bauScape/baux-paws-access
   supabase functions deploy check-pending-cancellations --no-verify-jwt
   ```

### Non ricevi email
1. Controlla che ci siano effettivamente richieste pending nel database
2. Verifica template Brevo ID 8 sia creato
3. Controlla logs della function per errori

---

## Screenshot Compilato

**Dovrebbe apparire così:**

```
┌─────────────────────────────────────────────┐
│ Create a new cron job                    X  │
├─────────────────────────────────────────────┤
│                                             │
│ Name                                        │
│ ┌─────────────────────────────────────────┐│
│ │ pending-cancellations-reminder          ││
│ └─────────────────────────────────────────┘│
│                                             │
│ Schedule        Enter a cron expression     │
│ ┌─────────────────────────────────────────┐│
│ │ 0 9 * * *                               ││
│ └─────────────────────────────────────────┘│
│                                             │
│ ○ Use natural language                     │
│                                             │
│ Schedule (GMT)                              │
│ 0 9 * * *                                   │
│ The cron will run every day at 09:00 UTC.  │
│                                             │
│ Type                                        │
│ ⚙ Supabase Edge Function                   │
│   Choose a supabase edge function to run.  │
│                                             │
│ Function                                    │
│ ┌─────────────────────────────────────────┐│
│ │ check-pending-cancellations         ▼   ││
│ └─────────────────────────────────────────┘│
│                                             │
│               [Cancel]  [Create cron job]   │
└─────────────────────────────────────────────┘
```

---

✅ **Tutto pronto per creare il cron job!**


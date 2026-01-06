# Fix: Email di Conferma Non Inviate

## Problema Identificato

Le email di conferma non venivano inviate per alcuni booking, specialmente quando:
- Il booking esisteva già ma l'email non era stata inviata
- La funzione `ensure-booking` non controllava se l'email era stata inviata

## Soluzione Implementata

### 1. Aggiornamento di `ensure-booking`

La funzione `ensure-booking` è stata aggiornata per:
- ✅ Controllare se l'email è stata inviata quando trova un booking esistente
- ✅ Inviare automaticamente l'email se non è stata inviata
- ✅ Usare la stessa logica di `stripe-webhook` per garantire coerenza

**File modificato:** `supabase/functions/ensure-booking/index.ts`

### 2. Migration Database

È necessario aggiungere la colonna `confirmation_email_sent` alla tabella `booking` per tracciare lo stato dell'invio email.

**Migration creata:** `supabase/migrations/20250118000000_add_confirmation_email_sent.sql`

## Passi per Completare il Fix

### Step 1: Eseguire la Migration SQL

Vai su **Supabase Dashboard** → **SQL Editor**:
https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new

Esegui questo SQL:

```sql
-- Aggiungi colonna se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking' 
    AND column_name = 'confirmation_email_sent'
  ) THEN
    ALTER TABLE public.booking 
    ADD COLUMN confirmation_email_sent BOOLEAN NOT NULL DEFAULT FALSE;
    
    CREATE INDEX IF NOT EXISTS idx_booking_confirmation_email_sent 
    ON public.booking(confirmation_email_sent) 
    WHERE confirmation_email_sent = FALSE;
    
    RAISE NOTICE '✅ Colonna confirmation_email_sent aggiunta';
  ELSE
    RAISE NOTICE '⚠️  Colonna confirmation_email_sent già esiste';
  END IF;
END $$;

-- Aggiorna booking esistenti (assumiamo che siano già stati inviati se sono vecchi)
UPDATE public.booking 
SET confirmation_email_sent = TRUE 
WHERE confirmation_email_sent = FALSE 
AND status = 'confirmed'
AND created_at < NOW() - INTERVAL '1 hour';

COMMENT ON COLUMN public.booking.confirmation_email_sent IS 
  'Indica se l''email di conferma è stata inviata con successo. Usato per garantire invio email anche in caso di fallimenti.';
```

### Step 2: Verificare il Deploy

La funzione `ensure-booking` è già stata deployata. Verifica:
```bash
cd baux-paws-access
npx supabase functions list --project-ref zyonwzilijgnnnmhxvbo
```

### Step 3: Test

Dopo aver eseguito la migration, testa con uno script:

```bash
cd baux-paws-access
deno run --allow-net --allow-env fix-missing-emails.ts
```

Questo script:
1. Trova tutti i booking con `confirmation_email_sent = false`
2. Chiama `ensure-booking` per ciascuno
3. `ensure-booking` invierà automaticamente le email mancanti

## Come Funziona Ora

### Flusso Completo

1. **`create-booking`** → Crea booking e invia email
2. **`stripe-webhook`** → Fallback se `create-booking` non ha inviato email
3. **`ensure-booking`** → **NUOVO:** Controlla e invia email se booking esiste ma email non inviata

### Protezione Tripla

Il sistema ora ha **tripla protezione** per garantire che le email vengano sempre inviate:

1. **`create-booking`** (primario) - Invia email dopo creazione booking
2. **`stripe-webhook`** (fallback 1) - Invia email se `create-booking` non l'ha inviata
3. **`ensure-booking`** (fallback 2) - Invia email se booking esiste ma email non inviata

## File Modificati

- ✅ `supabase/functions/ensure-booking/index.ts` - Aggiunto controllo e invio email
- ✅ `supabase/migrations/20250118000000_add_confirmation_email_sent.sql` - Migration per colonna

## Note

- La colonna `confirmation_email_sent` viene impostata a `true` quando l'email viene inviata con successo
- Se l'invio fallisce, viene impostata a `false` per permettere retry
- I booking vecchi (>1 ora) vengono automaticamente marcati come email inviata (assumendo che siano stati inviati prima)


# Come Ottenere la Service Role Key

## Metodo 1: Da Supabase Dashboard (Raccomandato)

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il progetto: **zyonwzilijgnnnmhxvbo**
3. Vai su **Settings** → **API**
4. Nella sezione **Project API keys**, trova **service_role** key
5. Clicca sull'icona di copia per copiare la chiave
6. **⚠️ IMPORTANTE**: Questa chiave ha accesso completo al database, non condividerla mai pubblicamente!

## Metodo 2: Usare lo Script Alternativo

Ho creato `test-email-via-cli.sh` che prova a ottenere la chiave automaticamente, ma se non funziona, usa il Metodo 1.

## Come Usare la Chiave

### Opzione A: Variabile d'ambiente (Raccomandato)

```bash
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
node test-email-simple.js
```

### Opzione B: Inline nel comando

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here node test-email-simple.js
```

### Opzione C: Per Deno (test-email-send.ts)

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here deno run --allow-net --allow-env test-email-send.ts
```

## Verifica

Dopo aver impostato la chiave, lo script dovrebbe funzionare senza errori 401.

## Sicurezza

- ⚠️ **NON** committare mai la service role key nel codice
- ⚠️ **NON** condividerla pubblicamente
- ⚠️ Usala solo per test locali o in ambienti sicuri
- ✅ Aggiungi `.env` al `.gitignore` se salvi la chiave lì





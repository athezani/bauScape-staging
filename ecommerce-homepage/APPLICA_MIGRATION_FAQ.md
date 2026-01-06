# 🔧 Applica Migration FAQ - Fix Errore 404 product_faq

## ⚠️ Problema

Quando provi ad andare in checkout per un prodotto (es. "Primo viaggio"), ricevi un errore 404:

```
GET https://zyonwzilijgnnnmhxvbo.supabase.co/rest/v1/product_faq?select=... 404 (Not Found)
```

Questo errore si verifica perché la tabella `product_faq` non esiste ancora nel database.

## ✅ Soluzione

Devi eseguire la migration che crea le tabelle `faq` e `product_faq`.

### Metodo 1: Via Supabase Dashboard (Consigliato)

1. Vai su: **https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new**

2. Apri il file: `baux-paws-access/supabase/migrations/20250117000000_add_product_faq.sql`

3. **Copia TUTTO il contenuto** del file SQL

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
AND table_name IN ('faq', 'product_faq');
```

Dovresti vedere 2 righe:
- `faq`
- `product_faq`

### Metodo 3: Verifica RLS Policies

```sql
-- Verifica che le policies RLS siano state create
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('faq', 'product_faq');
```

Dovresti vedere almeno 2 policies per `faq` e 2 policies per `product_faq`.

## ✅ Dopo aver Applicato la Migration

1. **Ricarica la pagina** del prodotto nel browser
2. L'errore 404 dovrebbe scomparire
3. Se ci sono FAQ associate al prodotto, verranno visualizzate

## 📝 Note

- Il codice è stato aggiornato per gestire meglio gli errori 404, quindi anche se la tabella non esiste, il checkout non verrà bloccato
- Tuttavia, per un'esperienza completa, è consigliabile eseguire la migration
- La migration crea anche le tabelle necessarie per il sistema FAQ completo

## 🐛 Problemi Comuni

### Errore: "relation already exists"
Se vedi questo errore, significa che la migration è già stata applicata parzialmente. Puoi ignorare questo errore o verificare che le tabelle esistano.

### Errore: "permission denied"
Assicurati di essere loggato come amministratore nel Supabase Dashboard.

### Errore persiste dopo la migration
1. Verifica che le tabelle esistano (vedi Metodo 2)
2. Verifica che le RLS policies siano state create (vedi Metodo 3)
3. Pulisci la cache del browser e ricarica la pagina


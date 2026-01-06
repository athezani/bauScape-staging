# Creare Storage Policies Manualmente

Le storage policies devono essere create manualmente dal Dashboard Supabase perché `storage.objects` è una tabella di sistema.

## 📋 Istruzioni Passo-Passo

### 1. Vai a Storage Policies

1. Apri: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/storage/policies
2. Seleziona il bucket: `product-images`
3. Vai alla tab "Policies"

### 2. Crea Policy per Upload (INSERT)

1. Clicca "New Policy"
2. Nome: `Providers can upload product images`
3. Allowed operation: `INSERT`
4. Policy definition: Copia e incolla questo:

```sql
(
  bucket_id = 'product-images' AND
  (
    (name LIKE 'experience/%' AND
     EXISTS (
       SELECT 1 FROM public.experience e
       WHERE e.id::text = (string_to_array(name, '/'))[2]
       AND e.provider_id = auth.uid()
     ))
  ) OR
  (
    (name LIKE 'class/%' AND
     EXISTS (
       SELECT 1 FROM public.class c
       WHERE c.id::text = (string_to_array(name, '/'))[2]
       AND c.provider_id = auth.uid()
     ))
  ) OR
  (
    (name LIKE 'trip/%' AND
     EXISTS (
       SELECT 1 FROM public.trip t
       WHERE t.id::text = (string_to_array(name, '/'))[2]
       AND t.provider_id = auth.uid()
     ))
  )
)
```

5. Clicca "Save"

### 3. Crea Policy per Delete

1. Clicca "New Policy"
2. Nome: `Providers can delete product images`
3. Allowed operation: `DELETE`
4. Policy definition: Copia e incolla questo:

```sql
(
  bucket_id = 'product-images' AND
  (
    (name LIKE 'experience/%' AND
     EXISTS (
       SELECT 1 FROM public.experience e
       WHERE e.id::text = (string_to_array(name, '/'))[2]
       AND e.provider_id = auth.uid()
     ))
  ) OR
  (
    (name LIKE 'class/%' AND
     EXISTS (
       SELECT 1 FROM public.class c
       WHERE c.id::text = (string_to_array(name, '/'))[2]
       AND c.provider_id = auth.uid()
     ))
  ) OR
  (
    (name LIKE 'trip/%' AND
     EXISTS (
       SELECT 1 FROM public.trip t
       WHERE t.id::text = (string_to_array(name, '/'))[2]
       AND t.provider_id = auth.uid()
     ))
  )
)
```

5. Clicca "Save"

### 4. Crea Policy per View (SELECT) - Pubblico

1. Clicca "New Policy"
2. Nome: `Public can view product images`
3. Allowed operation: `SELECT`
4. Policy definition: 

```sql
(bucket_id = 'product-images')
```

5. Clicca "Save"

## ✅ Verifica

Dopo aver creato tutte e 3 le policies, prova a caricare un'immagine nel Provider Portal. Dovrebbe funzionare!


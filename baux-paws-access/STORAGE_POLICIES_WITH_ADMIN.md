# Storage Policies con Supporto Admin

Dopo aver eseguito `FIX_ALL_POLICIES_WITH_ADMIN.sql`, crea queste storage policies dal Dashboard.

## 📋 Istruzioni

1. Vai a: https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/storage/policies
2. Seleziona bucket: `product-images`
3. Elimina le policies esistenti (se ci sono)
4. Crea queste 3 policies:

---

## Policy 1: INSERT - "Providers and Admins can upload product images"

**Nome:** `Providers and Admins can upload product images`  
**Operation:** `INSERT`  
**Definition:**

```sql
(
  bucket_id = 'product-images' AND
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'experience/%' AND
     EXISTS (
       SELECT 1 FROM public.experience e
       WHERE e.id::text = (string_to_array(name, '/'))[2]
       AND e.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'class/%' AND
     EXISTS (
       SELECT 1 FROM public.class c
       WHERE c.id::text = (string_to_array(name, '/'))[2]
       AND c.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'trip/%' AND
     EXISTS (
       SELECT 1 FROM public.trip t
       WHERE t.id::text = (string_to_array(name, '/'))[2]
       AND t.provider_id = auth.uid()
     ))
  )
)
```

---

## Policy 2: DELETE - "Providers and Admins can delete product images"

**Nome:** `Providers and Admins can delete product images`  
**Operation:** `DELETE`  
**Definition:** (stessa della Policy 1)

```sql
(
  bucket_id = 'product-images' AND
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'experience/%' AND
     EXISTS (
       SELECT 1 FROM public.experience e
       WHERE e.id::text = (string_to_array(name, '/'))[2]
       AND e.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'class/%' AND
     EXISTS (
       SELECT 1 FROM public.class c
       WHERE c.id::text = (string_to_array(name, '/'))[2]
       AND c.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'trip/%' AND
     EXISTS (
       SELECT 1 FROM public.trip t
       WHERE t.id::text = (string_to_array(name, '/'))[2]
       AND t.provider_id = auth.uid()
     ))
  )
)
```

---

## Policy 3: SELECT - "Public can view product images"

**Nome:** `Public can view product images`  
**Operation:** `SELECT`  
**Definition:**

```sql
(bucket_id = 'product-images')
```

---

## ✅ Verifica

Dopo aver creato tutte le policies, sia admin che provider potranno caricare immagini!


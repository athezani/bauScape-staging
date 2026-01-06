-- ============================================
-- Imposta utente a.thezani@gmail.com come ADMIN
-- ============================================

-- Trova l'ID dell'utente dalla email
DO $$
DECLARE
  user_id_to_promote UUID;
BEGIN
  -- Trova l'utente con email a.thezani@gmail.com
  SELECT id INTO user_id_to_promote
  FROM auth.users
  WHERE email = 'a.thezani@gmail.com'
  LIMIT 1;
  
  IF user_id_to_promote IS NULL THEN
    RAISE NOTICE 'ERRORE: Utente con email a.thezani@gmail.com non trovato';
    RAISE NOTICE 'Assicurati che l''utente sia registrato nel sistema';
  ELSE
    RAISE NOTICE 'Trovato utente con ID: %', user_id_to_promote;
    
    -- Inserisci o aggiorna il ruolo admin
    INSERT INTO public.user_role (user_id, role)
    VALUES (user_id_to_promote, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE '✓ Ruolo admin assegnato con successo a a.thezani@gmail.com';
    
    -- Verifica che il ruolo sia stato assegnato
    IF EXISTS (
      SELECT 1 FROM public.user_role
      WHERE user_id = user_id_to_promote AND role = 'admin'::app_role
    ) THEN
      RAISE NOTICE '✓ Verifica: Ruolo admin confermato';
    ELSE
      RAISE NOTICE '✗ ERRORE: Ruolo admin non trovato dopo l''inserimento';
    END IF;
  END IF;
END $$;

-- Mostra tutti gli admin attuali
SELECT 
  u.email,
  ur.role,
  ur.created_at as role_assigned_at
FROM public.user_role ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin'::app_role
ORDER BY ur.created_at DESC;





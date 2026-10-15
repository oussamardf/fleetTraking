-- =============================================================================
-- Premier administrateur + trigger d'inscription
-- À exécuter dans l'éditeur SQL Supabase si /admin redirige toujours.
-- =============================================================================

-- Le premier compte inscrit devient ADMIN ; les suivants restent USER.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.utilisateurs (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM public.utilisateurs WHERE role = 'ADMIN'
      ) THEN 'ADMIN'::public.user_role
      ELSE 'USER'::public.user_role
    END
  );
  RETURN NEW;
END;
$$;

-- Promouvoir un compte existant (adapter l'email si besoin) :
-- UPDATE public.utilisateurs SET role = 'ADMIN' WHERE email = 'votre@email.com';

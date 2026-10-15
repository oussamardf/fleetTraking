-- =============================================================================
-- FleetTrack — Table des rôles utilisateurs + Trigger d'inscription
-- Compatible : Supabase (PostgreSQL 15+)
-- =============================================================================

-- ─── Enum des rôles ──────────────────────────────────────────────────────────
CREATE TYPE public.user_role AS ENUM ('ADMIN', 'USER');

-- ─── Table utilisateurs (profils applicatifs liés à auth.users) ──────────────
CREATE TABLE public.utilisateurs (
  id    UUID      PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT      NOT NULL,
  role  user_role NOT NULL DEFAULT 'USER'
);

-- Index pour les requêtes fréquentes sur le rôle (ex: proxy RBAC)
CREATE INDEX idx_utilisateurs_role ON public.utilisateurs (role);

-- ─── RLS (Row Level Security) ────────────────────────────────────────────────
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur connecté peut lire son propre profil
CREATE POLICY "Lecture de son propre profil"
  ON public.utilisateurs
  FOR SELECT
  USING (auth.uid() = id);

-- Le service_role (Server Actions) peut tout lire (nécessaire pour le proxy RBAC)
-- Les requêtes depuis le service_role key bypass RLS par défaut, donc pas de policy nécessaire.

-- ─── Trigger : auto-insert à l'inscription ──────────────────────────────────
-- Se déclenche à chaque INSERT dans auth.users (inscription via Supabase Auth).
-- Crée automatiquement une ligne dans public.utilisateurs.
-- Le premier compte devient ADMIN (pour pouvoir ouvrir /admin) ; les suivants sont USER.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER          -- s'exécute avec les droits du propriétaire (bypass RLS)
SET search_path = ''      -- sécurité : empêche la résolution de schéma malveillante
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─── Pour promouvoir un utilisateur en ADMIN (exécuter manuellement) ─────────
-- UPDATE public.utilisateurs SET role = 'ADMIN' WHERE email = 'admin@example.com';

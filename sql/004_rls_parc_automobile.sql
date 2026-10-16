-- =============================================================================
-- FleetTrack — Policies RLS pour le Parc Automobile
-- Compatible : Supabase (PostgreSQL 15+)
--
-- Contexte : la vue « Parc Automobile » lit directement `vehicules` +
-- `documents_vehicule`, et l'action `renouvelerDocument` met à jour un document.
-- RLS est activé sur ces tables (vérifié : la clé anon ne renvoie aucune ligne),
-- il faut donc des policies explicites.
--
-- À exécuter dans l'éditeur SQL Supabase SI ces policies n'existent pas déjà.
-- Les policies permissives multiples sont combinées en OR : ce script peut donc
-- être appliqué sans risque de restreindre un accès existant.
-- =============================================================================

-- ─── Helper : l'utilisateur courant est-il ADMIN ? ───────────────────────────
-- SECURITY DEFINER : contourne la RLS de `utilisateurs` (qui ne laisse voir que
-- sa propre ligne) et évite toute récursion de policy.
CREATE OR REPLACE FUNCTION public.est_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.utilisateurs
    WHERE id = auth.uid()
      AND role = 'ADMIN'
  );
$$;

-- ─── Lecture : tout utilisateur connecté voit le parc ────────────────────────
DROP POLICY IF EXISTS "vehicules_select_authenticated" ON public.vehicules;
CREATE POLICY "vehicules_select_authenticated"
  ON public.vehicules
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "documents_select_authenticated" ON public.documents_vehicule;
CREATE POLICY "documents_select_authenticated"
  ON public.documents_vehicule
  FOR SELECT
  TO authenticated
  USING (true);

-- ─── Écriture : réservée aux ADMIN ───────────────────────────────────────────
-- Nécessaire pour `ajouterVehicule` (INSERT) et `renouvelerDocument` (UPDATE).

DROP POLICY IF EXISTS "vehicules_insert_admin" ON public.vehicules;
CREATE POLICY "vehicules_insert_admin"
  ON public.vehicules
  FOR INSERT
  TO authenticated
  WITH CHECK (public.est_admin());

DROP POLICY IF EXISTS "vehicules_update_admin" ON public.vehicules;
CREATE POLICY "vehicules_update_admin"
  ON public.vehicules
  FOR UPDATE
  TO authenticated
  USING (public.est_admin())
  WITH CHECK (public.est_admin());

DROP POLICY IF EXISTS "vehicules_delete_admin" ON public.vehicules;
CREATE POLICY "vehicules_delete_admin"
  ON public.vehicules
  FOR DELETE
  TO authenticated
  USING (public.est_admin());

DROP POLICY IF EXISTS "documents_insert_admin" ON public.documents_vehicule;
CREATE POLICY "documents_insert_admin"
  ON public.documents_vehicule
  FOR INSERT
  TO authenticated
  WITH CHECK (public.est_admin());

DROP POLICY IF EXISTS "documents_update_admin" ON public.documents_vehicule;
CREATE POLICY "documents_update_admin"
  ON public.documents_vehicule
  FOR UPDATE
  TO authenticated
  USING (public.est_admin())
  WITH CHECK (public.est_admin());

DROP POLICY IF EXISTS "documents_delete_admin" ON public.documents_vehicule;
CREATE POLICY "documents_delete_admin"
  ON public.documents_vehicule
  FOR DELETE
  TO authenticated
  USING (public.est_admin());

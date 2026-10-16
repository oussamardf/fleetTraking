-- =============================================================================
-- FleetTrack — Étape 4 : colonnes Google Calendar sur documents_vehicule
-- Compatible : Supabase (PostgreSQL 15+)
-- Ces commandes sont idempotentes : ré-exécutables sans risque.
-- =============================================================================

-- Date de l'alerte Google Calendar = date_expiration − 4 jours (J-4).
ALTER TABLE public.documents_vehicule
  ADD COLUMN IF NOT EXISTS date_notification DATE;

-- ID de l'événement Google Calendar associé (NULL tant qu'aucune alerte n'a
-- été créée / si l'intégration est désactivée).
ALTER TABLE public.documents_vehicule
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

-- Index pour retrouver rapidement un document à partir de son événement Google.
CREATE INDEX IF NOT EXISTS idx_documents_vehicule_calendar_event_id
  ON public.documents_vehicule (calendar_event_id);

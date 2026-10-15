// ─── Types de documents gérés ─────────────────────────────────────────────────
export const DOCUMENT_TYPES = ['ASSURANCE', 'VISITE_TECHNIQUE', 'VIGNETTE'] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

/** Labels affichables. */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  ASSURANCE:        'Assurance',
  VISITE_TECHNIQUE: 'Visite Technique',
  VIGNETTE:         'Vignette',
}

// ─── Statuts calculés (jamais stockés en base) ────────────────────────────────
export const DOCUMENT_STATUTS = ['VALIDE', 'ALERTE', 'EXPIRE', 'RENOUVELE'] as const
export type DocumentStatut = (typeof DOCUMENT_STATUTS)[number]

/** Classes CSS utilisées par les composants Badge. */
export const STATUT_CSS_CLASS: Record<DocumentStatut, string> = {
  VALIDE:    'badge--valid',
  ALERTE:    'badge--alert',
  EXPIRE:    'badge--expired',
  RENOUVELE: 'badge--renewed',
}

/** Labels affichables des badges. */
export const STATUT_LABELS: Record<DocumentStatut, string> = {
  VALIDE:    'Valide',
  ALERTE:    'Attention',
  EXPIRE:    'Alerte critique',
  RENOUVELE: 'Renouvelé',
}

// ─── Cycle de vie — miroir exact de public.documents_vehicule ─────────────────
export interface DocumentVehicule {
  id: string
  vehiculeId: string
  /** Colonne `type_document` (enum Supabase). */
  typeDocument: DocumentType
  dateSaisie: Date
  /** dateSaisie + 12 mois. */
  dateExpiration: Date
  /** dateExpiration - 4 jours — utilisée pour l'alerte Google Calendar. */
  dateNotification: Date
  /**
   * `false` = document actif (cycle en cours).
   * `true`  = document renouvelé (cycle clôturé).
   * Colonne `est_renouvele`.
   */
  estRenouvele: boolean
  /** ID de l'événement Google Calendar créé à J-4 (null avant intégration). */
  calendarEventId: string | null
  creeLe: Date
}

export interface DocumentVehiculeAvecStatut extends DocumentVehicule {
  /** Statut calculé en runtime — jamais persisté. */
  statut: DocumentStatut
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface CreateDocumentPayload {
  vehiculeId: string
  typeDocument: DocumentType
  dateSaisie: string   // ISO 8601 'YYYY-MM-DD'
}

export interface RenewDocumentPayload {
  documentId: string
  nouvelleDateSaisie: string
}

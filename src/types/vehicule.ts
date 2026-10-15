import type { DocumentVehiculeAvecStatut, DocumentType } from './document'

// ─── Véhicule — miroir exact de public.vehicules ──────────────────────────────
export interface Vehicule {
  id: string
  nom: string
  /** URL publique Supabase Storage — colonne `image_url`. */
  imageUrl: string | null
  creeLe: Date
}

export interface VehiculeAvecDocuments extends Vehicule {
  /** Dernier document par type (null si jamais saisi). */
  documents: Partial<Record<DocumentType, DocumentVehiculeAvecStatut | null>>
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface CreateVehiculePayload {
  nom: string
  imageUrl?: string
}

export interface UpdateVehiculePayload {
  id: string
  nom?: string
  imageUrl?: string
}

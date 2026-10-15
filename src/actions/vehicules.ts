'use server'

import { connection } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calculerDatesDepuisSaisie, calculerStatut, toISODate } from '@/lib/document-logic'
import {
  DOCUMENT_TYPES,
  type DocumentType,
  type DocumentVehicule,
  type DocumentVehiculeAvecStatut,
  type VehiculeAvecDocuments,
} from '@/types'

// ─── Types de retour ──────────────────────────────────────────────────────────

export type ActionState =
  | { status: 'idle' }
  | { status: 'success'; vehiculeId: string; message: string }
  | { status: 'error'; message: string }

// ─── Noms des champs du formulaire ────────────────────────────────────────────
// Centralise les clés pour éviter les fautes de frappe entre form et action.

const FORM_FIELDS = {
  nom: 'nom',
  image: 'image',
  dateAssurance: 'date_assurance',
  dateVisiteTechnique: 'date_visite_technique',
  dateVignette: 'date_vignette',
} as const

// ─── Lecture tableau de bord ──────────────────────────────────────────────────

type DocumentRow = {
  id: string
  vehicule_id: string
  type_document: DocumentType
  date_saisie: string
  date_expiration: string
  date_notification: string
  est_renouvele: boolean
  calendar_event_id: string | null
  cree_le: string
}

type VehiculeRow = {
  id: string
  nom: string
  image_url: string | null
  cree_le: string
  documents_vehicule: DocumentRow[] | null
}

/** Parse une date SQL `YYYY-MM-DD` (ou un timestamp) en Date locale. */
function parseDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return new Date(value)
}

function mapDocument(row: DocumentRow): DocumentVehicule {
  return {
    id: row.id,
    vehiculeId: row.vehicule_id,
    typeDocument: row.type_document,
    dateSaisie: parseDate(row.date_saisie),
    dateExpiration: parseDate(row.date_expiration),
    dateNotification: parseDate(row.date_notification),
    estRenouvele: row.est_renouvele,
    calendarEventId: row.calendar_event_id,
    creeLe: parseDate(row.cree_le),
  }
}

function documentsActifsParType(
  rows: DocumentRow[] | null,
  today: Date,
): Partial<Record<DocumentType, DocumentVehiculeAvecStatut | null>> {
  const actifs = (rows ?? []).filter((row) => !row.est_renouvele)

  const documents: Partial<Record<DocumentType, DocumentVehiculeAvecStatut | null>> = {}

  for (const type of DOCUMENT_TYPES) {
    const candidats = actifs.filter((row) => row.type_document === type)
    if (candidats.length === 0) {
      documents[type] = null
      continue
    }

    candidats.sort(
      (a, b) => parseDate(b.date_saisie).getTime() - parseDate(a.date_saisie).getTime(),
    )

    const mapped = mapDocument(candidats[0])
    documents[type] = { ...mapped, statut: calculerStatut(mapped, today) }
  }

  return documents
}

/**
 * Récupère tous les véhicules avec le document actif de chaque type
 * (Assurance, Visite Technique, Vignette).
 */
export async function listerVehiculesAvecDocuments(): Promise<VehiculeAvecDocuments[]> {
  await connection()
  const today = new Date()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vehicules')
    .select(
      `
      id,
      nom,
      image_url,
      cree_le,
      documents_vehicule (
        id,
        vehicule_id,
        type_document,
        date_saisie,
        date_expiration,
        date_notification,
        est_renouvele,
        calendar_event_id,
        cree_le
      )
    `,
    )
    .order('nom', { ascending: true })

  if (error) {
    console.error('[listerVehiculesAvecDocuments]', error)
    throw new Error(`Impossible de charger les véhicules : ${error.message}`)
  }

  return ((data ?? []) as VehiculeRow[]).map((row) => ({
    id: row.id,
    nom: row.nom,
    imageUrl: row.image_url,
    creeLe: parseDate(row.cree_le),
    documents: documentsActifsParType(row.documents_vehicule, today),
  }))
}

/**
 * Server Action — Ajoute un véhicule et ses 3 documents initiaux.
 *
 * Flux :
 *  1. Valide les données du FormData.
 *  2. Upload l'image dans le bucket Supabase Storage 'images_vehicules'.
 *  3. Récupère l'URL publique de l'image.
 *  4. Insère le véhicule en base.
 *  5. Pour chacun des 3 types de documents, calcule les dates et insère le document.
 *  6. (TODO étape 4) Planifie une alerte Google Calendar à J-4.
 *  7. Invalide le cache Next.js pour la page /admin.
 */
export async function ajouterVehicule(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient()

  // ── 1. Récupération et validation des champs ───────────────────────────────

  const nom = (formData.get(FORM_FIELDS.nom) as string | null)?.trim()
  const imageFile = formData.get(FORM_FIELDS.image) as File | null

  const dateAssuranceRaw       = formData.get(FORM_FIELDS.dateAssurance)       as string | null
  const dateVisiteTechniqueRaw = formData.get(FORM_FIELDS.dateVisiteTechnique) as string | null
  const dateVignetteRaw        = formData.get(FORM_FIELDS.dateVignette)        as string | null

  if (!nom) {
    return { status: 'error', message: 'Le nom / matricule est requis.' }
  }

  if (!imageFile || imageFile.size === 0) {
    return { status: 'error', message: 'Une photo du véhicule est requise.' }
  }

  if (!dateAssuranceRaw || !dateVisiteTechniqueRaw || !dateVignetteRaw) {
    return { status: 'error', message: 'Les 3 dates de documents sont requises.' }
  }

  // Map type → date de saisie
  const datesSaisie: Record<DocumentType, Date> = {
    ASSURANCE:        new Date(dateAssuranceRaw),
    VISITE_TECHNIQUE: new Date(dateVisiteTechniqueRaw),
    VIGNETTE:         new Date(dateVignetteRaw),
  }

  // Vérifie que toutes les dates sont valides
  for (const [type, date] of Object.entries(datesSaisie) as [DocumentType, Date][]) {
    if (isNaN(date.getTime())) {
      return { status: 'error', message: `Date invalide pour : ${type}` }
    }
  }

  // ── 2. Upload de l'image dans Supabase Storage ────────────────────────────

  const fileExt   = imageFile.name.split('.').pop() ?? 'jpg'
  const fileName  = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
  const storagePath = `vehicules/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('images_vehicules')
    .upload(storagePath, imageFile, {
      contentType: imageFile.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('[ajouterVehicule] Storage upload error:', uploadError)
    return {
      status: 'error',
      message: `Erreur lors de l'upload de l'image : ${uploadError.message}`,
    }
  }

  // ── 3. Récupération de l'URL publique ────────────────────────────────────

  const {
    data: { publicUrl: imageUrl },
  } = supabase.storage.from('images_vehicules').getPublicUrl(storagePath)

  // ── 4. Insertion du véhicule ──────────────────────────────────────────────

  const { data: vehiculeData, error: vehiculeError } = await supabase
    .from('vehicules')
    .insert({ nom, image_url: imageUrl })
    .select('id')
    .single()

  if (vehiculeError || !vehiculeData) {
    console.error('[ajouterVehicule] Insert vehicule error:', vehiculeError)
    // Rollback storage upload pour ne pas laisser d'orphelins
    await supabase.storage.from('images_vehicules').remove([storagePath])
    return {
      status: 'error',
      message: `Erreur lors de l'enregistrement du véhicule : ${vehiculeError?.message ?? 'Erreur inconnue'}`,
    }
  }

  const vehiculeId: string = vehiculeData.id

  // ── 5. Insertion des 3 documents ──────────────────────────────────────────

  const documentsAInserer = DOCUMENT_TYPES.map((type) => {
    const dateSaisie                          = datesSaisie[type]
    const { dateExpiration, dateNotification } = calculerDatesDepuisSaisie(dateSaisie)

    return {
      vehicule_id:       vehiculeId,
      type_document:     type,           // colonne `type_document` (enum Supabase)
      date_saisie:       toISODate(dateSaisie),
      date_expiration:   toISODate(dateExpiration),
      date_notification: toISODate(dateNotification),
      est_renouvele:     false,          // false = document actif, true = renouvelé
    }
  })

  const { error: documentsError } = await supabase
    .from('documents_vehicule')
    .insert(documentsAInserer)

  if (documentsError) {
    console.error('[ajouterVehicule] Insert documents error:', documentsError)
    // Rollback : supprime le véhicule (les documents ne sont pas encore insérés)
    await supabase.from('vehicules').delete().eq('id', vehiculeId)
    await supabase.storage.from('images_vehicules').remove([storagePath])
    return {
      status: 'error',
      message: `Erreur lors de l'enregistrement des documents : ${documentsError.message}`,
    }
  }

  // ── 6. TODO: Intégration Google Calendar ─────────────────────────────────
  // Pour chaque document, planifier une alerte à J-4 (date_notification),
  // puis stocker l'ID retourné par l'API dans la colonne `calendar_event_id`.
  // À implémenter à l'étape 4 avec l'API Google Calendar.
  //
  // Exemple de ce qui sera fait :
  // for (const doc of documentsInseres) {
  //   const eventId = await scheduleCalendarAlert({
  //     vehiculeNom: nom,
  //     typeDocument: doc.type_document,
  //     dateNotification: doc.date_notification,
  //   })
  //   await supabase
  //     .from('documents_vehicule')
  //     .update({ calendar_event_id: eventId })
  //     .eq('id', doc.id)
  // }

  // ── 7. Invalide le cache et retourne le succès ────────────────────────────

  revalidatePath('/admin')
  revalidatePath('/')

  return {
    status: 'success',
    vehiculeId,
    message: `Véhicule "${nom}" ajouté avec succès, 3 documents enregistrés.`,
  }
}

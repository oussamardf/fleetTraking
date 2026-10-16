'use server'

import { connection } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calculerDatesDepuisSaisie, calculerStatut, toISODate } from '@/lib/document-logic'
import {
  creerAlerteDocument,
  estGoogleCalendarConfigure,
  supprimerAlerteDocument,
  JOURS_ALERTE,
} from '@/lib/google-calendar'
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
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

/** Résultat de la Server Action de renouvellement d'un document. */
export type RenouvellementState =
  | { status: 'success'; documentId: string; message: string }
  | { status: 'error'; message: string }

/** Résultat de la Server Action de suppression d'un véhicule. */
export type SuppressionState =
  | { status: 'success'; vehiculeId: string; message: string }
  | { status: 'error'; message: string }

/** Ligne brute de `documents_vehicule` lue lors d'un renouvellement. */
type DocumentRenouvellementRow = {
  id: string
  vehicule_id: string
  type_document: DocumentType
  date_expiration: string | null
  calendar_event_id: string | null
}

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
 *  6. Crée une alerte Google Calendar « journée entière » à J-4 (date_notification)
 *     et stocke l'ID retourné dans `documents_vehicule.calendar_event_id`.
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

  // On récupère les ids insérés pour pouvoir y rattacher l'événement Google.
  const { data: documentsInseres, error: documentsError } = await supabase
    .from('documents_vehicule')
    .insert(documentsAInserer)
    .select('id, type_document')

  if (documentsError || !documentsInseres) {
    console.error('[ajouterVehicule] Insert documents error:', documentsError)
    // Rollback : supprime le véhicule (les documents ne sont pas encore insérés)
    await supabase.from('vehicules').delete().eq('id', vehiculeId)
    await supabase.storage.from('images_vehicules').remove([storagePath])
    return {
      status: 'error',
      message: `Erreur lors de l'enregistrement des documents : ${documentsError?.message ?? 'Erreur inconnue'}`,
    }
  }

  // ── 6. Alertes Google Calendar (J-4) ─────────────────────────────────────
  // Pour chaque document inséré, on crée l'événement « journée entière » puis
  // on stocke l'ID retourné dans `calendar_event_id`.
  // Un échec Google n'annule JAMAIS l'ajout du véhicule : on logge et on continue.
  if (!estGoogleCalendarConfigure()) {
    console.warn(
      '[ajouterVehicule] Google Calendar non configuré — aucun rappel créé ' +
        '(voir docs/google-calendar-setup.md).',
    )
  } else {
    const resultats = await Promise.allSettled(
      documentsInseres.map(async (doc) => {
        const type = doc.type_document as DocumentType
        const { dateExpiration, dateNotification } = calculerDatesDepuisSaisie(datesSaisie[type])

        const { eventId, error } = await creerAlerteDocument({
          vehiculeNom: nom,
          typeDocument: type,
          dateExpiration,
          dateNotification,
        })

        if (error || !eventId) {
          console.warn(
            `[ajouterVehicule] Alerte Google non créée pour ${type} (${nom}) : ${error ?? 'ID manquant'}`,
          )
          return null
        }

        const { error: updateError } = await supabase
          .from('documents_vehicule')
          .update({ calendar_event_id: eventId })
          .eq('id', doc.id)

        if (updateError) {
          console.error('[ajouterVehicule] Échec du stockage de calendar_event_id :', updateError)
        }

        return eventId
      }),
    )

    const nbCrees = resultats.filter((r) => r.status === 'fulfilled' && r.value).length
    console.info(
      `[ajouterVehicule] Google Calendar : ${nbCrees}/${documentsInseres.length} alerte(s) ` +
        `créée(s) pour « ${nom} ».`,
    )
  }

  // ── 7. Invalide le cache et retourne le succès ────────────────────────────

  revalidatePath('/admin')
  revalidatePath('/')

  return {
    status: 'success',
    vehiculeId,
    message: `Véhicule "${nom}" ajouté avec succès, 3 documents enregistrés.`,
  }
}

/**
 * Server Action — Renouvelle un document existant.
 *
 * Séquence stricte :
 *  1. Charge le document courant (+ nom du véhicule) depuis Supabase.
 *  2. Supprime l'ancien rappel Google Calendar (`calendar_event_id`) s'il existe.
 *  3. Calcule la nouvelle `date_notification` (J-4) depuis la nouvelle expiration.
 *  4. Crée le nouvel événement Google Calendar.
 *  5. Met à jour `date_expiration`, `date_notification` et `calendar_event_id`.
 *  6. `revalidatePath('/')` pour rafraîchir le tableau de bord.
 *
 * La fonction ne lève jamais d'exception : toutes les erreurs sont capturées
 * et renvoyées sous forme de `{ status: 'error', message }`.
 */
export async function renouvelerDocument(
  documentId: string,
  nouvelleDateExpiration: string,
): Promise<RenouvellementState> {
  // ── Validation des entrées ─────────────────────────────────────────────────
  if (!documentId) {
    return { status: 'error', message: "Identifiant de document manquant." }
  }

  const dateExpiration = new Date(nouvelleDateExpiration)
  if (!nouvelleDateExpiration || isNaN(dateExpiration.getTime())) {
    return { status: 'error', message: "La nouvelle date d'expiration est invalide." }
  }

  try {
    const supabase = await createClient()

    // ── 1. Récupérer le document actuel ──────────────────────────────────────
    const { data: document, error: fetchError } = await supabase
      .from('documents_vehicule')
      .select('id, vehicule_id, type_document, date_expiration, calendar_event_id')
      .eq('id', documentId)
      .single<DocumentRenouvellementRow>()

    if (fetchError || !document) {
      console.error('[renouvelerDocument] Document introuvable :', fetchError)
      return {
        status: 'error',
        message: `Document introuvable : ${fetchError?.message ?? 'inconnu'}`,
      }
    }

    // Nom du véhicule associé (nécessaire pour le titre / la description).
    const { data: vehicule, error: vehiculeError } = await supabase
      .from('vehicules')
      .select('nom')
      .eq('id', document.vehicule_id)
      .single<{ nom: string }>()

    if (vehiculeError || !vehicule) {
      console.error('[renouvelerDocument] Véhicule introuvable :', vehiculeError)
      return {
        status: 'error',
        message: `Véhicule introuvable : ${vehiculeError?.message ?? 'inconnu'}`,
      }
    }

    const typeDocument = document.type_document

    // ── 2. Supprimer l'ancienne alerte Google Calendar ───────────────────────
    // Un échec de suppression (événement déjà absent, agenda inaccessible…)
    // ne doit pas bloquer le renouvellement : on logge et on continue.
    if (document.calendar_event_id) {
      const supprime = await supprimerAlerteDocument(document.calendar_event_id)
      if (!supprime) {
        console.warn(
          `[renouvelerDocument] Ancien événement non supprimé : ${document.calendar_event_id}`,
        )
      }
    }

    // ── 3. Calculer la nouvelle date de notification (J-4) ───────────────────
    const dateNotification = new Date(dateExpiration)
    dateNotification.setDate(dateNotification.getDate() - JOURS_ALERTE)

    // ── 4. Créer la nouvelle alerte Google Calendar ──────────────────────────
    let nouveauCalendarEventId: string | null = null

    if (estGoogleCalendarConfigure()) {
      const { eventId, error: calendarError } = await creerAlerteDocument({
        vehiculeNom: vehicule.nom,
        typeDocument,
        dateExpiration,
        dateNotification,
      })

      if (calendarError) {
        console.warn('[renouvelerDocument] Nouvelle alerte non créée :', calendarError)
      }
      nouveauCalendarEventId = eventId
    } else {
      console.warn(
        '[renouvelerDocument] Google Calendar non configuré — alerte ignorée ' +
          '(voir docs/google-calendar-setup.md).',
      )
    }

    // ── 5. Mettre à jour la ligne en base ────────────────────────────────────
    const { error: updateError } = await supabase
      .from('documents_vehicule')
      .update({
        date_expiration: toISODate(dateExpiration),
        date_notification: toISODate(dateNotification),
        calendar_event_id: nouveauCalendarEventId,
      })
      .eq('id', documentId)

    if (updateError) {
      console.error('[renouvelerDocument] Échec de la mise à jour :', updateError)
      return {
        status: 'error',
        message: `Erreur lors du renouvellement : ${updateError.message}`,
      }
    }

    // ── 6. Rafraîchir le tableau de bord ─────────────────────────────────────
    revalidatePath('/')
    revalidatePath('/admin')

    const label = DOCUMENT_TYPE_LABELS[typeDocument] ?? typeDocument
    return {
      status: 'success',
      documentId,
      message: `Document « ${label} » renouvelé jusqu'au ${dateExpiration.toLocaleDateString(
        'fr-FR',
        { day: 'numeric', month: 'long', year: 'numeric' },
      )}.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[renouvelerDocument] Erreur inattendue :', message)
    return { status: 'error', message: `Erreur inattendue : ${message}` }
  }
}

// ─── Suppression d'un véhicule ────────────────────────────────────────────────

/** Bucket Supabase Storage qui contient les photos des véhicules. */
const BUCKET_IMAGES = 'images_vehicules'

/** Ligne brute de `vehicules` (avec ses documents) lue lors d'une suppression. */
type VehiculeSuppressionRow = {
  id: string
  nom: string
  image_url: string | null
  documents_vehicule: { id: string; calendar_event_id: string | null }[] | null
}

/**
 * Extrait le chemin interne au bucket à partir d'une URL publique Supabase.
 *
 * Ex : `https://xxx.supabase.co/storage/v1/object/public/images_vehicules/vehicules/42.jpg`
 *      → `vehicules/42.jpg`
 *
 * Gère aussi les URLs signées (`/object/sign/`) et ignore la query string.
 * Renvoie `null` si l'URL n'appartient pas au bucket (ex. URL externe).
 */
function extraireCheminImage(imageUrl: string | null): string | null {
  if (!imageUrl) return null

  const marqueur = `/${BUCKET_IMAGES}/`
  const index = imageUrl.indexOf(marqueur)
  if (index === -1) return null

  const chemin = imageUrl.slice(index + marqueur.length).split('?')[0]
  return chemin || null
}

/**
 * Server Action — Supprime un véhicule et TOUTES ses données associées.
 *
 * Séquence :
 *  0. Vérifie que l'appelant est bien ADMIN (sécurité — le masquage DOM ne suffit pas).
 *  A. Charge le véhicule + ses documents (image_url, calendar_event_id).
 *  B. Supprime les alertes Google Calendar associées (best-effort).
 *  C. Supprime la photo du bucket Supabase Storage (best-effort).
 *  D. Supprime les documents puis le véhicule en base.
 *  E. `revalidatePath('/')` pour rafraîchir l'interface.
 *
 * Ne lève jamais d'exception : renvoie `{ status: 'error', message }`.
 */
export async function supprimerVehicule(vehiculeId: string): Promise<SuppressionState> {
  if (!vehiculeId) {
    return { status: 'error', message: 'Identifiant de véhicule manquant.' }
  }

  try {
    const supabase = await createClient()

    // ── 0. Autorisation : réservé aux administrateurs ────────────────────────
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { status: 'error', message: 'Vous devez être connecté pour effectuer cette action.' }
    }

    const { data: profil, error: roleError } = await supabase
      .from('utilisateurs')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()

    if (roleError || profil?.role !== 'ADMIN') {
      return { status: 'error', message: 'Action réservée aux administrateurs.' }
    }

    // ── A. Récupérer le véhicule et ses documents ────────────────────────────
    const { data: vehicule, error: fetchError } = await supabase
      .from('vehicules')
      .select('id, nom, image_url, documents_vehicule ( id, calendar_event_id )')
      .eq('id', vehiculeId)
      .single<VehiculeSuppressionRow>()

    if (fetchError || !vehicule) {
      console.error('[supprimerVehicule] Véhicule introuvable :', fetchError)
      return {
        status: 'error',
        message: `Véhicule introuvable : ${fetchError?.message ?? 'inconnu'}`,
      }
    }

    const documents = vehicule.documents_vehicule ?? []

    // ── B. Nettoyer Google Calendar (best-effort) ────────────────────────────
    const eventIds = documents
      .map((doc) => doc.calendar_event_id)
      .filter((id): id is string => Boolean(id))

    if (eventIds.length > 0) {
      const resultats = await Promise.allSettled(
        eventIds.map((eventId) => supprimerAlerteDocument(eventId)),
      )
      const nbSupprimes = resultats.filter((r) => r.status === 'fulfilled' && r.value).length
      console.info(
        `[supprimerVehicule] Google Calendar : ${nbSupprimes}/${eventIds.length} ` +
          `événement(s) supprimé(s) pour « ${vehicule.nom} ».`,
      )
    }

    // ── C. Supprimer la photo du Storage (best-effort) ───────────────────────
    const cheminImage = extraireCheminImage(vehicule.image_url)
    if (cheminImage) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_IMAGES)
        .remove([cheminImage])

      if (storageError) {
        console.error('[supprimerVehicule] Échec de la suppression de l\'image :', storageError)
      }
    }

    // ── D. Supprimer les documents puis le véhicule ──────────────────────────
    // On supprime explicitement les documents d'abord : garantit l'absence
    // d'orphelins même si la clé étrangère n'est pas en `ON DELETE CASCADE`.
    const { error: documentsDeleteError } = await supabase
      .from('documents_vehicule')
      .delete()
      .eq('vehicule_id', vehiculeId)

    if (documentsDeleteError) {
      console.warn(
        '[supprimerVehicule] Suppression des documents échouée — on s\'appuie sur la ' +
          'cascade de la clé étrangère :',
        documentsDeleteError,
      )
    }

    const { error: deleteError } = await supabase
      .from('vehicules')
      .delete()
      .eq('id', vehiculeId)

    if (deleteError) {
      console.error('[supprimerVehicule] Échec de la suppression du véhicule :', deleteError)
      return {
        status: 'error',
        message: `Erreur lors de la suppression : ${deleteError.message}`,
      }
    }

    // ── E. Rafraîchir l'interface ────────────────────────────────────────────
    revalidatePath('/')
    revalidatePath('/admin')

    return {
      status: 'success',
      vehiculeId,
      message: `Véhicule « ${vehicule.nom} » et ses documents ont été supprimés.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[supprimerVehicule] Erreur inattendue :', message)
    return { status: 'error', message: `Erreur inattendue : ${message}` }
  }
}

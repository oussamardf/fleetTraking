// =============================================================================
// Google Calendar — Étape 4 : rappels automatiques d'échéance
// -----------------------------------------------------------------------------
// Crée un événement « Journée entière » (all-day) dans un agenda Google partagé
// avec un Service Account, à la date `date_notification` (J-4 avant expiration).
//
// ⚠️ Ce module est strictement côté serveur (Server Action / Route Handler).
//    Il ne doit JAMAIS être importé depuis un composant 'use client'.
// =============================================================================

import { google, type calendar_v3 } from 'googleapis'
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '@/types'

/** Scope nécessaire pour lire/écrire des événements dans l'agenda cible. */
const SCOPES = ['https://www.googleapis.com/auth/calendar']

/** Nombre de jours avant expiration auquel l'alerte est déclenchée (J-4). */
export const JOURS_ALERTE = 4

// ─── Utilitaires de date ─────────────────────────────────────────────────────

/**
 * Formate une Date en 'YYYY-MM-DD' **en UTC**.
 * On utilise volontairement l'UTC pour rester aligné avec `toISODate`
 * de `@/lib/document-logic` (colonne `date_expiration` / `date_notification`).
 */
function toDateOnly(date: Date): string {
  return date.toISOString().split('T')[0]
}

/** Retourne une nouvelle date décalée de `days` jours (sans muter l'originale). */
function addDays(date: Date, days: number): Date {
  const copie = new Date(date)
  copie.setDate(copie.getDate() + days)
  return copie
}

/** Formate une date en français long (ex : « samedi 15 juin 2026 »). */
function formaterDateFr(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/**
 * Nettoie la clé privée du Service Account telle qu'elle doit apparaître
 * dans `.env.local` :
 *   - retire les guillemets englobants éventuels ;
 *   - convertit les `\n` littéraux (chaîne `.env`) en vrais retours à la ligne ;
 *   - supprime les éventuels `\r`.
 */
export function normaliserClePrivee(cle: string): string {
  return cle
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\r/g, '')
    .replace(/\\n/g, '\n')
    .trim()
}

// ─── Client Google Calendar ──────────────────────────────────────────────────

let clientCache: calendar_v3.Calendar | null = null
let avertissementEnvLogg = false

/**
 * Indique si les trois variables d'environnement requises sont présentes.
 */
export function estGoogleCalendarConfigure(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_CALENDAR_ID,
  )
}

/**
 * Construit (et met en cache) le client Google Calendar authentifié via
 * Service Account. Renvoie `null` si la configuration est incomplète — dans ce
 * cas l'appelant doit simplement ignorer l'échec sans faire planter la requête.
 */
function obtenirClientCalendar(): calendar_v3.Calendar | null {
  if (clientCache) return clientCache

  if (!estGoogleCalendarConfigure()) {
    if (!avertissementEnvLogg) {
      console.warn(
        '[google-calendar] Variables manquantes (GOOGLE_CLIENT_EMAIL, ' +
          'GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID) — événements ignorés.',
      )
      avertissementEnvLogg = true
    }
    return null
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: normaliserClePrivee(process.env.GOOGLE_PRIVATE_KEY!),
    },
    scopes: SCOPES,
  })

  clientCache = google.calendar({ version: 'v3', auth })
  return clientCache
}

// ─── API publique ────────────────────────────────────────────────────────────

export interface AlerteDocumentInput {
  /** Nom / matricule du véhicule (affiché dans le titre). */
  vehiculeNom: string
  /** Type de document : ASSURANCE, VISITE_TECHNIQUE ou VIGNETTE. */
  typeDocument: DocumentType
  /** Date d'expiration exacte du document. */
  dateExpiration: Date
  /** Date de l'alerte = dateExpiration − 4 jours. */
  dateNotification: Date
}

export interface AlerteDocumentResult {
  /** ID Google de l'événement créé, ou `null` en cas d'échec. */
  eventId: string | null
  /** Message d'erreur lisible si la création a échoué, sinon `null`. */
  error: string | null
}

/**
 * Crée un événement « Journée entière » dans l'agenda cible.
 *
 *   Titre       : ⚠️ Alerte échéance : [Type Document] - [Nom Véhicule]
 *   Date        : dateNotification (J-4)
 *   Description : date d'expiration exacte + rappel de renouvellement
 *
 * Ne lève jamais d'exception : en cas d'échec (config absente, agenda non
 * partagé, quota…), renvoie `{ eventId: null, error }` afin que l'appelant
 * puisse enregistrer le document sans ID Google.
 */
export async function creerAlerteDocument(
  input: AlerteDocumentInput,
): Promise<AlerteDocumentResult> {
  const calendar = obtenirClientCalendar()

  if (!calendar) {
    return { eventId: null, error: 'Google Calendar non configuré' }
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID!
  const typeLabel = DOCUMENT_TYPE_LABELS[input.typeDocument] ?? input.typeDocument

  const titre = `⚠️ Alerte échéance : ${typeLabel} - ${input.vehiculeNom}`

  const description = [
    `📄 Document : ${typeLabel}`,
    `🚗 Véhicule : ${input.vehiculeNom}`,
    '',
    `📅 Date d'expiration : ${formaterDateFr(input.dateExpiration)}`,
    `🔔 Rappel : ${formaterDateFr(input.dateNotification)} (J-${JOURS_ALERTE})`,
    '',
    "🔁 Merci de renouveler ce document avant la date d'expiration indiquée.",
  ].join('\n')

  // Un événement « journée entière » se termine le lendemain (fin exclusive
  // pour l'API Google Calendar).
  const requestBody: calendar_v3.Schema$Event = {
    summary: titre,
    description,
    start: { date: toDateOnly(input.dateNotification) },
    end: { date: toDateOnly(addDays(input.dateNotification, 1)) },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 0 },
        { method: 'email', minutes: 24 * 60 },
      ],
    },
  }

  try {
    const { data } = await calendar.events.insert({ calendarId, requestBody })
    return { eventId: data.id ?? null, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[google-calendar] Échec de création de l\'événement :', message)
    return { eventId: null, error: message }
  }
}

/**
 * Supprime un événement Google Calendar (utile lors du renouvellement d'un
 * document : on remplace l'ancienne alerte par la nouvelle).
 */
export async function supprimerAlerteDocument(eventId: string): Promise<boolean> {
  const calendar = obtenirClientCalendar()
  if (!calendar) return false

  try {
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      eventId,
    })
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[google-calendar] Échec de suppression de l\'événement :', message)
    return false
  }
}

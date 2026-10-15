import type { DocumentStatut, DocumentVehicule } from '@/types'

const MS_PAR_JOUR = 1000 * 60 * 60 * 24

function aMinuit(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Nombre de jours calendaires avant expiration (négatif si déjà expiré).
 */
export function joursAvantExpiration(dateExpiration: Date, today = new Date()): number {
  const todayDate = aMinuit(today)
  const expiration = aMinuit(dateExpiration)
  return Math.round((expiration.getTime() - todayDate.getTime()) / MS_PAR_JOUR)
}

/**
 * Calcule le statut d'affichage d'un document à partir de la date du jour.
 * Ce statut est purement calculé — il n'est JAMAIS persisté en base.
 *
 *   🟢 VALIDE  — expire dans plus de 30 jours
 *   🟠 ALERTE  — expire dans 30 jours ou moins (mais plus de 4 jours)
 *   🔴 EXPIRE  — expire dans 4 jours ou moins, ou déjà expiré
 *   ⚪ RENOUVELE — cycle clôturé
 */
export function calculerStatut(doc: DocumentVehicule, today = new Date()): DocumentStatut {
  if (doc.estRenouvele) return 'RENOUVELE'

  const jours = joursAvantExpiration(doc.dateExpiration, today)

  if (jours <= 4) return 'EXPIRE'
  if (jours <= 30) return 'ALERTE'
  return 'VALIDE'
}

export function necessiteRenouvellement(statut: DocumentStatut): boolean {
  return statut === 'ALERTE' || statut === 'EXPIRE'
}

/**
 * Calcule date_expiration et date_notification à partir de la date de saisie.
 *
 * Règles métier :
 *   date_expiration   = dateSaisie + 12 mois
 *   date_notification = date_expiration - 4 jours
 */
export function calculerDatesDepuisSaisie(dateSaisie: Date): {
  dateExpiration: Date
  dateNotification: Date
} {
  const dateExpiration = new Date(dateSaisie)
  dateExpiration.setMonth(dateExpiration.getMonth() + 12)

  const dateNotification = new Date(dateExpiration)
  dateNotification.setDate(dateNotification.getDate() - 4)

  return { dateExpiration, dateNotification }
}

/**
 * Formatte une Date en string 'YYYY-MM-DD' (format attendu par PostgreSQL / Supabase).
 */
export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

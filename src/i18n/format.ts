// =============================================================================
// i18n — Formatage et interpolation (neutre, sans React)
// =============================================================================

import type { Locale } from './config'

/** Balise BCP-47 utilisée pour Intl (dates, nombres). */
const LOCALE_TAGS: Record<Locale, string> = {
  fr: 'fr-FR',
  ar: 'ar-MA', // arabe du Maroc : chiffres latins (usage local)
}

export function localeTag(locale: Locale): string {
  return LOCALE_TAGS[locale]
}

/**
 * Remplace les jetons `{cle}` d'un gabarit par les valeurs fournies.
 * Ex : interpolate('Expire dans {count} j', { count: 5 }) → 'Expire dans 5 j'
 */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))
}

/**
 * Formate une date SQL 'YYYY-MM-DD' selon la langue active.
 * Parse en date locale pour éviter tout décalage de fuseau.
 */
export function formaterDate(
  iso: string | null,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!iso) return '—'

  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso

  const date = new Date(year, month - 1, day)
  if (isNaN(date.getTime())) return iso

  return date.toLocaleDateString(
    LOCALE_TAGS[locale],
    options ?? { day: 'numeric', month: 'short', year: 'numeric' },
  )
}

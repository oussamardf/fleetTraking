// =============================================================================
// i18n — Accès aux dictionnaires
// =============================================================================

import type { Locale } from '../config'
import { fr, type Dictionary } from './fr'
import { ar } from './ar'

export type { Dictionary }

const DICTIONARIES: Record<Locale, Dictionary> = { fr, ar }

/** Renvoie le dictionnaire de la langue demandée. */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}

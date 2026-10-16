// =============================================================================
// i18n — Store de langue (source externe, compatible useSyncExternalStore)
// -----------------------------------------------------------------------------
// Pourquoi un store externe plutôt qu'un simple useState ?
//   - useSyncExternalStore utilise le « snapshot serveur » pendant l'hydratation
//     puis bascule sur le snapshot client (localStorage) → AUCUN avertissement
//     d'hydratation, tout en respectant la préférence stockée.
// =============================================================================

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  dirForLocale,
  isLocale,
  type Locale,
} from './config'

let current: Locale | null = null
const listeners = new Set<() => void>()

function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    return isLocale(stored) ? stored : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

/** Snapshot CLIENT (mémoïsé pour rester référentiellement stable). */
export function getClientLocale(): Locale {
  if (current === null) {
    current = typeof window === 'undefined' ? DEFAULT_LOCALE : readStoredLocale()
  }
  return current
}

/** Snapshot SERVEUR (utilisé au SSR et pendant l'hydratation). */
export function getServerLocale(): Locale {
  return DEFAULT_LOCALE
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Applique la langue et la direction sur l'élément <html>. */
export function applyLocaleToDocument(locale: Locale): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.documentElement.dir = dirForLocale(locale)
}

/** Change la langue : persiste, met à jour <html> et notifie les abonnés. */
export function setLocale(next: Locale): void {
  if (next === getClientLocale()) return

  current = next

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
  } catch {
    // Stockage indisponible (navigation privée) — on continue en mémoire.
  }

  applyLocaleToDocument(next)
  for (const listener of listeners) listener()
}

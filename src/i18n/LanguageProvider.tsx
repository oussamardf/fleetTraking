'use client'

// =============================================================================
// i18n — Contexte React (Provider + hook useI18n)
// =============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { dirForLocale, type Locale } from './config'
import { getDictionary, type Dictionary } from './dictionaries'
import {
  applyLocaleToDocument,
  getClientLocale,
  getServerLocale,
  setLocale,
  subscribeLocale,
} from './store'

interface I18nContextValue {
  /** Langue active. */
  locale: Locale
  /** Direction d'écriture ('rtl' en arabe). */
  dir: 'ltr' | 'rtl'
  /** Dictionnaire de la langue active. */
  dict: Dictionary
  /** Change la langue. */
  setLocale: (locale: Locale) => void
  /** Bascule FR ⇄ AR. */
  toggleLocale: () => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, getClientLocale, getServerLocale)
  const dir = dirForLocale(locale)

  // Garde <html lang/dir> synchronisé (le script inline l'a déjà fait avant paint).
  useEffect(() => {
    applyLocaleToDocument(locale)
  }, [locale])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir,
      dict: getDictionary(locale),
      setLocale,
      toggleLocale: () => setLocale(locale === 'fr' ? 'ar' : 'fr'),
    }),
    [locale, dir],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n doit être utilisé à l’intérieur de <LanguageProvider>.')
  }
  return context
}

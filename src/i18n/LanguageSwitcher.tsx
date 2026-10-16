'use client'

// =============================================================================
// i18n — Sélecteur de langue FR / AR
// =============================================================================

import { Languages } from 'lucide-react'
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/config'
import { useI18n } from '@/i18n/LanguageProvider'

export default function LanguageSwitcher() {
  const { locale, setLocale, dict } = useI18n()

  return (
    <div className="lang-switcher" role="group" aria-label={dict.common.language}>
      <Languages className="lang-switcher-icon" aria-hidden="true" />

      <div className="lang-switcher-options">
        {LOCALES.map((code: Locale) => {
          const active = code === locale
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              aria-pressed={active}
              title={LOCALE_NAMES[code]}
              className={`lang-switcher-btn${active ? ' lang-switcher-btn--active' : ''}`}
            >
              {code.toUpperCase()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

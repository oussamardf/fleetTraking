// =============================================================================
// i18n — Configuration des langues supportées
// -----------------------------------------------------------------------------
// Module neutre (importable côté serveur ET client) : aucune dépendance React.
// =============================================================================

/** Langues supportées par l'application. */
export const LOCALES = ['fr', 'ar'] as const

export type Locale = (typeof LOCALES)[number]

/** Langue par défaut (utilisée au SSR et en l'absence de préférence stockée). */
export const DEFAULT_LOCALE: Locale = 'fr'

/** Clé localStorage où l'on mémorise le choix de l'utilisateur. */
export const LOCALE_STORAGE_KEY = 'fleettrack-locale'

/** Libellés courts affichés dans le sélecteur. */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'FR',
  ar: 'AR',
}

/** Nom natif de chaque langue (attribut title / accessibilité). */
export const LOCALE_NAMES: Record<Locale, string> = {
  fr: 'Français',
  ar: 'العربية',
}

/** Garde de type : la valeur est-elle une Locale supportée ? */
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** Direction d'écriture associée à une langue. */
export function dirForLocale(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

/**
 * Script inline exécuté AVANT le premier paint (premier enfant du <body>).
 * Il lit la préférence stockée et applique `lang` / `dir` sur <html>, ce qui
 * évite tout « flash » de direction incorrecte au chargement.
 *
 * Volontairement minimal et défensif (try/catch, valeurs en dur) pour ne jamais
 * bloquer le rendu.
 */
export const LOCALE_INIT_SCRIPT = `(function(){try{var l=window.localStorage.getItem('${LOCALE_STORAGE_KEY}');if(l!=='fr'&&l!=='ar'){l='fr';}document.documentElement.lang=l;document.documentElement.dir=(l==='ar')?'rtl':'ltr';}catch(e){}})();`

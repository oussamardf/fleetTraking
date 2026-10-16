import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { LOCALE_INIT_SCRIPT } from '@/i18n/config'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'FleetTrack — Gestion de flotte',
    template: '%s | FleetTrack',
  },
  description:
    'Application de suivi des documents de véhicules : assurance, visite technique, vignette.',
}

/**
 * Root layout — contient le <html>, le <body> et le provider de langue.
 *
 * i18n / RTL :
 *  - `lang="fr" dir="ltr"` est la valeur par défaut rendue par le serveur.
 *  - Le script inline (premier enfant du <body>) lit la préférence stockée et
 *    applique `lang`/`dir` AVANT le premier paint → aucun flash de direction.
 *  - `suppressHydrationWarning` sur <html> est nécessaire car ce script modifie
 *    des attributs que React gère par ailleurs.
 *  - `LanguageProvider` (client) expose la langue + le dictionnaire à tout l'arbre.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      dir="ltr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_INIT_SCRIPT }} />
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}

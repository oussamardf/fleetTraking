import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
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
 * Root layout — contient uniquement le <html> et <body>.
 * La sidebar est gérée dans le layout du groupe (app).
 * La page /login utilise le layout du groupe (auth) — sans sidebar.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}

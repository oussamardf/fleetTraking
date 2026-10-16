'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Truck,
  Search,
  PlusCircle,
  RefreshCw,
  CheckCircle,
  ShieldCheck,
  Wrench,
  ReceiptText,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DOCUMENT_TYPES, type DocumentType, type UserRole } from '@/types'
import { useI18n } from '@/i18n/LanguageProvider'
import { interpolate, formaterDate } from '@/i18n/format'
import type { Dictionary } from '@/i18n/dictionaries'
import type { Locale } from '@/i18n/config'
import RenouvelerDocumentModal, {
  type DocumentARenouveler,
} from '@/components/RenouvelerDocumentModal'
import SupprimerVehiculeModal from '@/components/SupprimerVehiculeModal'

// ─── Modèle de données ────────────────────────────────────────────────────────

interface DocumentStatus {
  id: string
  dateExpiration: string
}

type DocumentsParType = Partial<Record<DocumentType, DocumentStatus | null>>

interface VehiculeData {
  id: string
  nom: string
  imageUrl: string | null
  documents: DocumentsParType
}

/** Niveaux d'urgence simplifiés (3 couleurs + états limites). */
type Niveau = keyof Dictionary['status']

type VehiculeAnalyse = VehiculeData & {
  /** Nombre de jours restants du document le plus proche (null si aucun). */
  urgence: number | null
  /** Niveau global du véhicule = le plus critique de ses documents. */
  niveau: Niveau
}

type Filtre = 'TOUS' | 'EN_REGLE' | 'URGENCE'

/** Ligne brute `documents_vehicule` renvoyée par Supabase. */
interface DocumentDbRow {
  id: string
  type_document: DocumentType
  date_expiration: string | null
  est_renouvele: boolean
}

/** Ligne brute `vehicules` avec ses documents imbriqués. */
interface VehiculeDbRow {
  id: string
  nom: string
  image_url: string | null
  documents_vehicule: DocumentDbRow[] | null
}

/** Icône explicite par type de document. */
const DOCUMENT_ICONS: Record<DocumentType, typeof ShieldCheck> = {
  ASSURANCE: ShieldCheck,
  VISITE_TECHNIQUE: Wrench,
  VIGNETTE: ReceiptText,
}

/** Seuil (jours) en dessous duquel un document devient « urgent » (rouge). */
const SEUIL_URGENT = 7
/** Seuil (jours) en dessous duquel un document devient « à vérifier » (orange). */
const SEUIL_ALERTE = 30

const FILTRES: { key: Filtre; dot?: string }[] = [
  { key: 'TOUS' },
  { key: 'EN_REGLE', dot: 'bg-status-valid' },
  { key: 'URGENCE', dot: 'bg-status-expired' },
]

// ─── Styles de statut (discrets : un point + une couleur de texte) ─────────────

const DOT_CLASSES: Record<Niveau, string> = {
  valid: 'bg-status-valid',
  warning: 'bg-status-alert',
  danger: 'bg-status-expired',
  expired: 'bg-status-expired',
  unknown: 'bg-surface-400',
}

const TEXT_CLASSES: Record<Niveau, string> = {
  valid: 'text-status-valid',
  warning: 'text-status-alert',
  danger: 'text-status-expired',
  expired: 'text-status-expired',
  unknown: 'text-surface-400',
}

// ─── Logique métier (pure) ────────────────────────────────────────────────────

/** Parse 'YYYY-MM-DD' en Date locale (évite les décalages de fuseau). */
function parseDateLocale(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Jours restants avant expiration (négatif si expiré). */
function joursRestants(iso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiration = parseDateLocale(iso)
  expiration.setHours(0, 0, 0, 0)
  return Math.round((expiration.getTime() - today.getTime()) / 86_400_000)
}

function joursDocument(doc?: DocumentStatus | null): number | null {
  if (!doc?.dateExpiration) return null
  return joursRestants(doc.dateExpiration)
}

/** Traduit un nombre de jours en niveau visuel. */
function niveauDepuisJours(jours: number | null): Niveau {
  if (jours === null) return 'unknown'
  if (jours < 0) return 'expired'
  if (jours <= SEUIL_URGENT) return 'danger'
  if (jours <= SEUIL_ALERTE) return 'warning'
  return 'valid'
}

function analyserVehicule(vehicule: VehiculeData): VehiculeAnalyse {
  const jours = DOCUMENT_TYPES.map((type) => joursDocument(vehicule.documents?.[type])).filter(
    (j): j is number => j !== null,
  )

  if (jours.length === 0) return { ...vehicule, urgence: null, niveau: 'unknown' }

  const urgence = Math.min(...jours)
  return { ...vehicule, urgence, niveau: niveauDepuisJours(urgence) }
}

/** Pour chaque type, garde le document actif le plus récent. */
function mapperVehicules(rows: VehiculeDbRow[]): VehiculeData[] {
  return rows.map((row) => {
    const documents: DocumentsParType = {}

    for (const type of DOCUMENT_TYPES) {
      const candidats = (row.documents_vehicule ?? [])
        .filter((d) => d.type_document === type && !d.est_renouvele && d.date_expiration)
        .sort((a, b) => (b.date_expiration ?? '').localeCompare(a.date_expiration ?? ''))

      const actif = candidats[0]
      documents[type] = actif
        ? { id: actif.id, dateExpiration: actif.date_expiration as string }
        : null
    }

    return { id: row.id, nom: row.nom, imageUrl: row.image_url, documents }
  })
}

/** « Expire dans X j » / « Expiré depuis X j » / « Expire aujourd'hui ». */
function texteEcheance(jours: number, dict: Dictionary): string {
  if (jours < 0) return interpolate(dict.dashboard.daysAgo, { count: Math.abs(jours) })
  if (jours === 0) return dict.dashboard.today
  return interpolate(dict.dashboard.daysIn, { count: jours })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ParcAutomobilePage() {
  const { dict, locale } = useI18n()

  const [vehicules, setVehicules] = useState<VehiculeData[]>([])
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState<Filtre>('TOUS')

  const [documentARenouveler, setDocumentARenouveler] = useState<DocumentARenouveler | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const isAdmin = role === 'ADMIN'

  // ── Rôle de l'utilisateur (une fois) ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function loadRole() {
      const client = createClient()
      try {
        const {
          data: { user },
        } = await client.auth.getUser()
        if (!user) return

        const { data: profil, error } = await client
          .from('utilisateurs')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error) console.error('Error loading user role:', error)
        else if (!cancelled && profil?.role) setRole(profil.role as UserRole)
      } catch (error) {
        console.error('Error loading user role:', error)
      }
    }
    loadRole()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Véhicules + documents (rechargé après renouvellement / suppression) ────
  useEffect(() => {
    let cancelled = false
    async function loadVehicules() {
      const client = createClient()
      try {
        const { data, error } = await client
          .from('vehicules')
          .select(
            'id, nom, image_url, documents_vehicule ( id, type_document, date_expiration, est_renouvele )',
          )
          .order('nom', { ascending: true })

        if (error) {
          console.error('Error loading vehicles:', error)
          return
        }
        if (!cancelled && Array.isArray(data)) {
          setVehicules(mapperVehicules(data as VehiculeDbRow[]))
        }
      } catch (error) {
        console.error('Error loading vehicles:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadVehicules()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // ── Toast auto-effaçable ──────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(id)
  }, [toast])

  const analyses = useMemo(() => vehicules.map(analyserVehicule), [vehicules])

  const compteurs = useMemo(() => {
    let enRegle = 0
    let urgence = 0
    for (const a of analyses) {
      if (a.niveau === 'valid') enRegle++
      else if (a.niveau !== 'unknown') urgence++
    }
    return { enRegle, urgence }
  }, [analyses])

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase()

    const filtres = analyses.filter((v) => {
      if (q && !v.nom.toLowerCase().includes(q)) return false
      if (filtre === 'EN_REGLE') return v.niveau === 'valid'
      if (filtre === 'URGENCE') return v.niveau !== 'valid' && v.niveau !== 'unknown'
      return true
    })

    // Tri par urgence (défaut) : expiration la plus proche d'abord.
    return filtres.sort((a, b) => {
      const ua = a.urgence ?? Number.POSITIVE_INFINITY
      const ub = b.urgence ?? Number.POSITIVE_INFINITY
      return ua - ub
    })
  }, [analyses, recherche, filtre])

  const onRenouvellementReussi = useCallback((message: string) => {
    setDocumentARenouveler(null)
    setToast(message)
    setReloadKey((k) => k + 1)
  }, [])

  const onSuppressionReussie = useCallback((message: string) => {
    setToast(message)
    setReloadKey((k) => k + 1)
  }, [])

  // ── État de chargement ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-body">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl border border-surface-600 bg-surface-800"
            />
          ))}
        </div>
      </div>
    )
  }

  const sousTitre = interpolate(
    vehicules.length > 1 ? dict.dashboard.subtitlePlural : dict.dashboard.subtitle,
    { count: vehicules.length },
  )

  return (
    <div className="page-body">
      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-100 sm:text-3xl">
            {dict.dashboard.title}
          </h1>
          <p className="mt-1 text-sm text-surface-400">
            {sousTitre}
            {compteurs.urgence > 0 && (
              <>
                {' · '}
                <span className="font-medium text-status-alert">
                  {interpolate(dict.dashboard.toWatch, { count: compteurs.urgence })}
                </span>
              </>
            )}
          </p>
        </div>

        {isAdmin && (
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            {dict.dashboard.addVehicle}
          </Link>
        )}
      </header>

      {/* ── Barre d'outils : recherche + filtres ────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={dict.dashboard.searchPlaceholder}
            aria-label={dict.dashboard.searchLabel}
            className="min-h-11 w-full rounded-lg border border-surface-600 bg-surface-800 pe-3 ps-10 text-sm text-surface-100 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={dict.dashboard.filtersLabel}
        >
          {FILTRES.map(({ key, dot }) => {
            const actif = filtre === key
            const label =
              key === 'TOUS'
                ? dict.dashboard.filterAll
                : key === 'EN_REGLE'
                  ? dict.dashboard.filterValid
                  : dict.dashboard.filterUrgent
            const compte =
              key === 'TOUS'
                ? vehicules.length
                : key === 'EN_REGLE'
                  ? compteurs.enRegle
                  : compteurs.urgence

            return (
              <button
                key={key}
                type="button"
                onClick={() => setFiltre(key)}
                aria-pressed={actif}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${
                  actif
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-surface-600 bg-surface-800 text-surface-200 hover:border-brand-500 hover:text-surface-100'
                }`}
              >
                {dot && <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />}
                {label}
                <span className={actif ? 'text-white/70' : 'text-surface-400'}>{compte}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Liste ───────────────────────────────────────────────────────── */}
      {liste.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-600 px-6 text-center">
          <Truck className="h-10 w-10 text-surface-400/60" aria-hidden="true" />
          <p className="text-base font-semibold text-surface-200">
            {vehicules.length === 0 ? dict.dashboard.emptyTitle : dict.dashboard.noResult}
          </p>
          {vehicules.length === 0 ? (
            <p className="max-w-md text-sm text-surface-400">
              {isAdmin ? dict.dashboard.emptyAdmin : dict.dashboard.emptyUser}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                setRecherche('')
                setFiltre('TOUS')
              }}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              {dict.dashboard.resetFilters}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {liste.map((vehicule) => (
            <VehiculeCarte
              key={vehicule.id}
              vehicule={vehicule}
              isAdmin={isAdmin}
              locale={locale}
              onRenouveler={setDocumentARenouveler}
              onSupprime={onSuppressionReussie}
            />
          ))}
        </div>
      )}

      {/* ── Modale de renouvellement ────────────────────────────────────── */}
      {documentARenouveler && (
        <RenouvelerDocumentModal
          document={documentARenouveler}
          onClose={() => setDocumentARenouveler(null)}
          onSuccess={onRenouvellementReussi}
        />
      )}

      {/* ── Toast de confirmation ───────────────────────────────────────── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 end-6 z-50 flex items-center gap-3 rounded-lg border border-surface-600 bg-surface-800 px-4 py-3 text-sm text-surface-100 shadow-lg"
        >
          <CheckCircle className="h-5 w-5 shrink-0 text-status-valid" aria-hidden="true" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}

// ─── Carte véhicule (simple, lisible) ─────────────────────────────────────────

function VehiculeCarte({
  vehicule,
  isAdmin,
  locale,
  onRenouveler,
  onSupprime,
}: {
  vehicule: VehiculeAnalyse
  isAdmin: boolean
  locale: Locale
  onRenouveler: (document: DocumentARenouveler) => void
  onSupprime: (message: string) => void
}) {
  const { dict } = useI18n()
  const statutGlobal = dict.status[vehicule.niveau]

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-surface-600 bg-surface-800 shadow-sm transition-shadow hover:shadow-md">
      {/* Photo (ou repli) + bouton supprimer (Admin) */}
      <div className="relative h-40 w-full bg-surface-700">
        {vehicule.imageUrl ? (
          <Image
            src={vehicule.imageUrl}
            alt={vehicule.nom}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Truck className="h-10 w-10 text-surface-400/60" aria-hidden="true" />
          </div>
        )}

        {isAdmin && (
          <div className="absolute end-3 top-3 rounded-lg bg-surface-800/90 p-0.5 shadow-sm backdrop-blur-sm">
            <SupprimerVehiculeModal
              vehiculeId={vehicule.id}
              vehiculeNom={vehicule.nom}
              onSuccess={onSupprime}
            />
          </div>
        )}
      </div>

      {/* Corps */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 truncate text-lg font-semibold tracking-tight text-surface-100">
            {vehicule.nom}
          </h2>
          <span
            className={`inline-flex shrink-0 items-center gap-2 text-sm font-medium ${TEXT_CLASSES[vehicule.niveau]}`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${DOT_CLASSES[vehicule.niveau]}`}
              aria-hidden="true"
            />
            {statutGlobal.label}
          </span>
        </div>

        {/* Documents */}
        <ul className="mt-4 divide-y divide-surface-600 border-t border-surface-600">
          {DOCUMENT_TYPES.map((type) => {
            const doc = vehicule.documents?.[type]
            const jours = joursDocument(doc)
            const niveau = niveauDepuisJours(jours)
            const statut = dict.status[niveau]
            const Icone = DOCUMENT_ICONS[type]
            const renouvelable =
              isAdmin &&
              doc != null &&
              (niveau === 'warning' || niveau === 'danger' || niveau === 'expired')

            return (
              <li key={type} className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-surface-100">
                    <Icone className="h-4 w-4 shrink-0 text-surface-400" aria-hidden="true" />
                    <span className="truncate">{dict.documents[type]}</span>
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${TEXT_CLASSES[niveau]}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${DOT_CLASSES[niveau]}`}
                      aria-hidden="true"
                    />
                    {statut.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-surface-400">
                  <span>
                    {interpolate(dict.dashboard.expiresOn, {
                      date: formaterDate(doc?.dateExpiration ?? null, locale),
                    })}
                  </span>
                  {jours !== null && (
                    <span className={`font-medium ${TEXT_CLASSES[niveau]}`}>
                      {texteEcheance(jours, dict)}
                    </span>
                  )}
                </div>

                {renouvelable && (
                  <button
                    type="button"
                    onClick={() =>
                      onRenouveler({
                        id: doc.id,
                        type,
                        vehiculeNom: vehicule.nom,
                        dateExpiration: doc.dateExpiration,
                      })
                    }
                    aria-label={interpolate(dict.dashboard.renewNamed, {
                      document: dict.documents[type],
                    })}
                    className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {dict.dashboard.renew}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </article>
  )
}

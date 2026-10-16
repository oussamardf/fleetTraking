'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { CalendarPlus, Loader2, X } from 'lucide-react'
import { renouvelerDocument } from '@/actions/vehicules'
import { useI18n } from '@/i18n/LanguageProvider'
import { formaterDate, interpolate } from '@/i18n/format'

export interface DocumentARenouveler {
  id: string
  type: 'ASSURANCE' | 'VISITE_TECHNIQUE' | 'VIGNETTE'
  vehiculeNom: string
  /** Date d'expiration actuelle (affichage informatif). */
  dateExpiration: string | null
}

interface RenouvelerDocumentModalProps {
  document: DocumentARenouveler
  onClose: () => void
  /** Appelé après un renouvellement réussi (fermeture + toast côté parent). */
  onSuccess: (message: string) => void
}

/** 'YYYY-MM-DD' du jour (local). */
function aujourdHui(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 'YYYY-MM-DD' dans 12 mois (valeur par défaut, réduit les clics). */
function dansDouzeMois(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function RenouvelerDocumentModal({
  document,
  onClose,
  onSuccess,
}: RenouvelerDocumentModalProps) {
  const { dict, locale } = useI18n()

  const [dateExpiration, setDateExpiration] = useState(dansDouzeMois())
  const [erreur, setErreur] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const label = dict.documents[document.type]

  // Focus initial + fermeture au clavier (Échap / clic sur le fond).
  useEffect(() => {
    inputRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPending, onClose])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!dateExpiration || isPending) return

    setErreur(null)
    startTransition(async () => {
      const result = await renouvelerDocument(document.id, dateExpiration)

      if (result.status === 'success') {
        onSuccess(
          interpolate(dict.renew.success, {
            document: label,
            date: formaterDate(dateExpiration, locale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
          }),
        )
      } else {
        setErreur(result.message)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fond assombri — clic pour fermer (désactivé pendant le chargement) */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          if (!isPending) onClose()
        }}
        aria-hidden="true"
      />

      {/* Boîte de dialogue */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="renouveler-titre"
        className="relative w-full max-w-md rounded-2xl border border-surface-600 bg-surface-800 p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          aria-label={dict.common.close}
          className="absolute end-4 top-4 rounded-lg p-1 text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-100 disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>

        {/* En-tête */}
        <div className="mb-5 flex items-start gap-3 pe-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600">
            <CalendarPlus className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="renouveler-titre" className="text-base font-semibold text-surface-100">
              {dict.renew.title}
            </h2>
            <p className="mt-0.5 text-sm text-surface-400">
              <span className="font-medium text-surface-200">{label}</span>
              {' · '}
              {document.vehiculeNom}
            </p>
          </div>
        </div>

        {document.dateExpiration && (
          <p className="mb-4 rounded-lg bg-surface-700/50 px-3 py-2 text-xs text-surface-400">
            {dict.renew.current} :{' '}
            <span className="text-surface-200">
              {formaterDate(document.dateExpiration, locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nouvelle-date" className="text-sm font-medium text-surface-200">
              {dict.renew.newDate}
            </label>
            <input
              ref={inputRef}
              id="nouvelle-date"
              type="date"
              required
              min={aujourdHui()}
              value={dateExpiration}
              onChange={(e) => setDateExpiration(e.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-surface-600/60 bg-surface-700 px-3 py-2 text-sm text-surface-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40 disabled:opacity-50"
            />
            <p className="text-xs text-surface-400">{dict.renew.hint}</p>
          </div>

          {erreur && (
            <p
              role="alert"
              className="rounded-lg border border-status-expired/30 bg-status-expired/10 px-3 py-2 text-sm text-status-expired"
            >
              {erreur}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:bg-surface-700 hover:text-surface-100 disabled:opacity-50"
            >
              {dict.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isPending || !dateExpiration}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {dict.renew.submitting}
                </>
              ) : (
                dict.renew.confirm
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

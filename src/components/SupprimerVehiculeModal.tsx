'use client'

import { useEffect, useState, useTransition } from 'react'
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'
import { supprimerVehicule } from '@/actions/vehicules'
import { useI18n } from '@/i18n/LanguageProvider'
import { interpolate } from '@/i18n/format'

interface SupprimerVehiculeModalProps {
  vehiculeId: string
  vehiculeNom: string
  /** Appelé après une suppression réussie (fermeture + toast côté parent). */
  onSuccess: (message: string) => void
}

/**
 * Bouton « Supprimer » (icône corbeille) + modale de confirmation stricte.
 * Auto-suffisant : gère son propre état d'ouverture et l'appel à la Server Action.
 * À ne rendre que pour un administrateur.
 */
export default function SupprimerVehiculeModal({
  vehiculeId,
  vehiculeNom,
  onSuccess,
}: SupprimerVehiculeModalProps) {
  const { dict } = useI18n()

  const [ouvert, setOuvert] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Fermeture au clavier (Échap), sauf pendant la suppression.
  useEffect(() => {
    if (!ouvert) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) setOuvert(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [ouvert, isPending])

  function fermer() {
    if (isPending) return
    setOuvert(false)
    setErreur(null)
  }

  function confirmer() {
    if (isPending) return
    setErreur(null)

    startTransition(async () => {
      const result = await supprimerVehicule(vehiculeId)

      if (result.status === 'success') {
        setOuvert(false)
        onSuccess(interpolate(dict.delete.success, { name: vehiculeNom }))
      } else {
        setErreur(result.message)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        title={dict.dashboard.deleteVehicle}
        aria-label={interpolate(dict.dashboard.deleteNamed, { name: vehiculeNom })}
        className="rounded-md p-1.5 text-status-expired transition-colors hover:bg-status-expired/10 focus:outline-none focus:ring-1 focus:ring-status-expired/40"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Fond assombri — clic pour fermer (désactivé pendant la suppression) */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={fermer}
            aria-hidden="true"
          />

          {/* Boîte de dialogue de confirmation */}
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="supprimer-titre"
            aria-describedby="supprimer-description"
            className="relative w-full max-w-md rounded-2xl border border-status-expired/30 bg-surface-800 p-6 shadow-xl"
          >
            <button
              type="button"
              onClick={fermer}
              disabled={isPending}
              aria-label={dict.common.close}
              className="absolute end-4 top-4 rounded-lg p-1 text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-100 disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>

            {/* En-tête */}
            <div className="mb-4 flex items-start gap-3 pe-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-status-expired/10 text-status-expired">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 id="supprimer-titre" className="text-base font-semibold text-surface-100">
                  {dict.delete.title}
                </h2>
                <p className="mt-0.5 truncate text-sm font-medium text-surface-200">{vehiculeNom}</p>
              </div>
            </div>

            <p id="supprimer-description" className="text-sm text-surface-400">
              {dict.delete.description}
            </p>

            {erreur && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-status-expired/30 bg-status-expired/10 px-3 py-2 text-sm text-status-expired"
              >
                {erreur}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={fermer}
                disabled={isPending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-surface-300 transition-colors hover:bg-surface-700 hover:text-surface-100 disabled:opacity-50"
              >
                {dict.common.cancel}
              </button>
              <button
                type="button"
                onClick={confirmer}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-status-expired px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {dict.delete.submitting}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {dict.delete.confirm}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

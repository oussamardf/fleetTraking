'use client'

import { useActionState, useRef, useState } from 'react'
import Image from 'next/image'
import {
  UploadCloud,
  CheckCircle,
  XCircle,
  Car,
  CalendarDays,
} from 'lucide-react'
import { ajouterVehicule, type ActionState } from '@/actions/vehicules'

const initialState: ActionState = { status: 'idle' }

export default function AjouterVehiculeForm() {
  const [state, action, isPending] = useActionState(ajouterVehicule, initialState)

  // Prévisualisation de l'image sélectionnée
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName]     = useState<string | null>(null)
  const fileInputRef                = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
  }

  const hasFile = !!previewUrl

  return (
    <form action={action} className="form">

      {/* ── Nom / Matricule ───────────────────────────────────────────── */}
      <div className="form-group">
        <label htmlFor="nom" className="form-label form-label--required">
          <Car
            style={{ display: 'inline', width: '0.875rem', height: '0.875rem', marginRight: '0.375rem', verticalAlign: '-0.1em' }}
          />
          Nom / Matricule
        </label>
        <input
          id="nom"
          name="nom"
          type="text"
          className="form-input"
          placeholder="Ex : Camion 07 — AB-123-CD"
          required
          disabled={isPending}
          autoComplete="off"
        />
      </div>

      {/* ── Photo du véhicule ─────────────────────────────────────────── */}
      <div className="form-group">
        <span className="form-label form-label--required">
          Photo du véhicule
        </span>

        {/* Input caché, accessible via le label cliquable */}
        <label
          htmlFor="image"
          className={`form-file-label${hasFile ? ' form-file-label--has-file' : ''}`}
        >
          <input
            ref={fileInputRef}
            id="image"
            name="image"
            type="file"
            accept="image/*"
            className="form-file-input"
            required
            disabled={isPending}
            onChange={handleFileChange}
          />

          {previewUrl ? (
            /* Prévisualisation */
            <>
              <Image
                src={previewUrl}
                alt="Prévisualisation du véhicule"
                width={640}
                height={180}
                className="form-image-preview"
                style={{ objectFit: 'cover' }}
                unoptimized // URL locale (blob:) — pas de CDN
              />
              <span className="form-file-text">
                <strong>{fileName}</strong>
              </span>
              <span className="form-file-hint">Cliquez pour changer</span>
            </>
          ) : (
            /* État vide */
            <>
              <UploadCloud className="form-file-icon" />
              <span className="form-file-text">
                <strong>Cliquez pour choisir</strong> ou glissez une image
              </span>
              <span className="form-file-hint">PNG, JPG, WEBP — max 5 Mo</span>
            </>
          )}
        </label>
      </div>

      {/* ── Dates des documents ───────────────────────────────────────── */}
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <p className="form-section-title">
          <CalendarDays
            style={{ display: 'inline', width: '0.875rem', height: '0.875rem', marginRight: '0.375rem', verticalAlign: '-0.1em' }}
          />
          Dates de début des documents
        </p>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-surface-400)' }}>
          L&apos;expiration sera calculée automatiquement à +12 mois, l&apos;alerte à −4 jours.
        </p>

        <div className="form-dates-grid">
          <div className="form-group">
            <label htmlFor="date_assurance" className="form-label form-label--required">
              Assurance
            </label>
            <input
              id="date_assurance"
              name="date_assurance"
              type="date"
              className="form-input"
              required
              disabled={isPending}
            />
          </div>

          <div className="form-group">
            <label htmlFor="date_visite_technique" className="form-label form-label--required">
              Visite Technique
            </label>
            <input
              id="date_visite_technique"
              name="date_visite_technique"
              type="date"
              className="form-input"
              required
              disabled={isPending}
            />
          </div>

          <div className="form-group">
            <label htmlFor="date_vignette" className="form-label form-label--required">
              Vignette
            </label>
            <input
              id="date_vignette"
              name="date_vignette"
              type="date"
              className="form-input"
              required
              disabled={isPending}
            />
          </div>
        </div>
      </div>

      {/* ── Message de retour (succès / erreur) ───────────────────────── */}
      {state.status === 'success' && (
        <div role="status" className="form-alert form-alert--success">
          <CheckCircle className="form-alert-icon" />
          <span>{state.message}</span>
        </div>
      )}

      {state.status === 'error' && (
        <div role="alert" className="form-alert form-alert--error">
          <XCircle className="form-alert-icon" />
          <span>{state.message}</span>
        </div>
      )}

      {/* ── Bouton de soumission ───────────────────────────────────────── */}
      <div>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              Enregistrement en cours…
            </>
          ) : (
            'Ajouter le véhicule'
          )}
        </button>
      </div>
    </form>
  )
}

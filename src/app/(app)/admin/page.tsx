import type { Metadata } from 'next'
import { ShieldCheck, PlusCircle } from 'lucide-react'
import AjouterVehiculeForm from '@/components/AjouterVehiculeForm'

export const metadata: Metadata = {
  title: 'Administration',
  description:
    "Espace administrateur : gestion des véhicules, saisie des dates de documents et validation des renouvellements.",
}

export default function AdminPage() {
  return (
    <>
      {/* ── En-tête de page ─────────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldCheck
            style={{
              width: '1.5rem',
              height: '1.5rem',
              color: 'var(--color-brand-600)',
            }}
          />
          <div>
            <h1 className="page-title">Administration</h1>
            <p className="page-subtitle">
              Gestion des véhicules et de leurs documents
            </p>
          </div>
        </div>
      </div>

      {/* ── Corps de la page ────────────────────────────────────────── */}
      <div className="page-body">
        <div
          style={{
            maxWidth: '680px',
          }}
        >
          {/* Titre de section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              marginBottom: '1.5rem',
            }}
          >
            <PlusCircle
              style={{
                width: '1.25rem',
                height: '1.25rem',
                color: 'var(--color-brand-600)',
              }}
            />
            <h2
              style={{
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--color-surface-100)',
                letterSpacing: '-0.01em',
              }}
            >
              Ajouter un véhicule
            </h2>
          </div>

          {/* Formulaire dans une carte */}
          <div className="card">
            <AjouterVehiculeForm />
          </div>
        </div>
      </div>
    </>
  )
}

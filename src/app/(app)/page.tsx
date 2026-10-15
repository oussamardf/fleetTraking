import { Suspense } from 'react'
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { LayoutDashboard, Truck } from 'lucide-react'
import { listerVehiculesAvecDocuments } from '@/actions/vehicules'
import VehiculeCard from '@/components/VehiculeCard'

export const metadata: Metadata = {
  title: 'Tableau de bord',
  description:
    'Vue d\'ensemble de la flotte : statut des documents par véhicule (assurance, visite technique, vignette).',
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-grid" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="card vehicle-card vehicle-card--skeleton" />
      ))}
    </div>
  )
}

async function DashboardGrid() {
  await connection()
  const today = new Date()

  let vehicules
  try {
    vehicules = await listerVehiculesAvecDocuments()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur inconnue lors du chargement.'
    return (
      <div className="dashboard-empty" role="alert">
        <Truck className="dashboard-empty-icon" />
        <p className="dashboard-empty-title">Impossible de charger la flotte</p>
        <p className="dashboard-empty-text">{message}</p>
      </div>
    )
  }

  if (vehicules.length === 0) {
    return (
      <div className="dashboard-empty">
        <Truck className="dashboard-empty-icon" />
        <p className="dashboard-empty-title">Aucun véhicule pour le moment</p>
        <p className="dashboard-empty-text">
          Ajoutez un véhicule depuis l&apos;administration pour suivre ses documents ici.
        </p>
      </div>
    )
  }

  return (
    <div className="dashboard-grid">
      {vehicules.map((vehicule) => (
        <VehiculeCard key={vehicule.id} vehicule={vehicule} today={today} />
      ))}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LayoutDashboard
            style={{
              width: '1.5rem',
              height: '1.5rem',
              color: 'var(--color-brand-400)',
            }}
          />
          <div>
            <h1 className="page-title">Tableau de bord</h1>
            <p className="page-subtitle">
              Suivi en temps réel des documents de votre flotte
            </p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardGrid />
        </Suspense>
      </div>
    </>
  )
}

import Image from 'next/image'
import { RefreshCw, Truck } from 'lucide-react'
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  STATUT_CSS_CLASS,
  STATUT_LABELS,
  type DocumentType,
  type DocumentVehiculeAvecStatut,
  type VehiculeAvecDocuments,
} from '@/types'
import { joursAvantExpiration, necessiteRenouvellement } from '@/lib/document-logic'

function formaterDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function labelBadge(doc: DocumentVehiculeAvecStatut, today: Date): string {
  if (doc.statut === 'EXPIRE' && joursAvantExpiration(doc.dateExpiration, today) < 0) {
    return 'Expiré'
  }
  return STATUT_LABELS[doc.statut]
}

function DocumentRow({
  type,
  document,
  today,
}: {
  type: DocumentType
  document: DocumentVehiculeAvecStatut | null | undefined
  today: Date
}) {
  if (!document) {
    return (
      <li className="document-row">
        <div className="document-row-info">
          <span className="document-row-type">{DOCUMENT_TYPE_LABELS[type]}</span>
          <span className="document-row-date">Non renseigné</span>
        </div>
        <span className={`badge ${STATUT_CSS_CLASS.RENOUVELE}`}>Absent</span>
      </li>
    )
  }

  const renouveler = necessiteRenouvellement(document.statut)

  return (
    <li className="document-row">
      <div className="document-row-info">
        <span className="document-row-type">{DOCUMENT_TYPE_LABELS[type]}</span>
        <span className="document-row-date">
          Expire le {formaterDate(document.dateExpiration)}
        </span>
      </div>
      <div className="document-row-actions">
        <span className={`badge ${STATUT_CSS_CLASS[document.statut]}`}>
          {labelBadge(document, today)}
        </span>
        {renouveler && (
          <button type="button" className="btn-renew" title="Renouveler ce document">
            <RefreshCw className="btn-renew-icon" aria-hidden="true" />
            Renouveler
          </button>
        )}
      </div>
    </li>
  )
}

export default function VehiculeCard({
  vehicule,
  today,
}: {
  vehicule: VehiculeAvecDocuments
  today: Date
}) {
  return (
    <article className="card vehicle-card">
      <div className="vehicle-card-image-wrap">
        {vehicule.imageUrl ? (
          <Image
            src={vehicule.imageUrl}
            alt={vehicule.nom}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="vehicle-card-image"
          />
        ) : (
          <div className="vehicle-card-image-fallback">
            <Truck aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="vehicle-card-body">
        <h2 className="vehicle-card-name">{vehicule.nom}</h2>
        <ul className="document-list">
          {DOCUMENT_TYPES.map((type) => (
            <DocumentRow
              key={type}
              type={type}
              document={vehicule.documents[type]}
              today={today}
            />
          ))}
        </ul>
      </div>
    </article>
  )
}

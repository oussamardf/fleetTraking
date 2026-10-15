import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldOff } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Accès refusé',
  description: "Cette page est réservée aux administrateurs.",
}

export default function AccesRefusePage() {
  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldOff
            style={{
              width: '1.5rem',
              height: '1.5rem',
              color: 'var(--color-status-expired)',
            }}
          />
          <div>
            <h1 className="page-title">Accès refusé</h1>
            <p className="page-subtitle">
              L&apos;administration est réservée aux comptes avec le rôle ADMIN.
            </p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ maxWidth: '40rem' }}>
          <p style={{ margin: '0 0 1rem', color: 'var(--color-surface-200)' }}>
            Votre compte est connecté, mais il n&apos;a pas les droits
            administrateur. C&apos;est pour cela que le lien
            &laquo;&nbsp;Administration&nbsp;&raquo; renvoyait vers le tableau de
            bord.
          </p>
          <p
            style={{
              margin: '0 0 1.5rem',
              fontSize: '0.875rem',
              color: 'var(--color-surface-400)',
            }}
          >
            Dans Supabase, exécutez :{' '}
            <code style={{ color: 'var(--color-brand-300)' }}>
              UPDATE public.utilisateurs SET role = &apos;ADMIN&apos; WHERE email =
              &apos;votre@email.com&apos;;
            </code>
          </p>
          <Link href="/" className="btn-primary" style={{ width: 'fit-content' }}>
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </>
  )
}

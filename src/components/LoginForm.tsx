'use client'

import { useActionState } from 'react'
import { Mail, Lock, XCircle } from 'lucide-react'
import { login, type AuthActionState } from '@/actions/auth'

const initialState: AuthActionState = { status: 'idle' }

export default function LoginForm() {
  const [state, action, isPending] = useActionState(login, initialState)

  return (
    <form action={action} className="form">
      {/* Email */}
      <div className="form-group">
        <label htmlFor="email" className="form-label form-label--required">
          <Mail
            style={{
              display: 'inline',
              width: '0.875rem',
              height: '0.875rem',
              marginRight: '0.375rem',
              verticalAlign: '-0.1em',
            }}
          />
          Adresse email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="form-input"
          placeholder="nom@entreprise.com"
          required
          disabled={isPending}
          autoComplete="email"
          autoFocus
        />
      </div>

      {/* Mot de passe */}
      <div className="form-group">
        <label htmlFor="password" className="form-label form-label--required">
          <Lock
            style={{
              display: 'inline',
              width: '0.875rem',
              height: '0.875rem',
              marginRight: '0.375rem',
              verticalAlign: '-0.1em',
            }}
          />
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="form-input"
          placeholder="••••••••"
          required
          disabled={isPending}
          autoComplete="current-password"
        />
      </div>

      {/* Message d'erreur */}
      {state.status === 'error' && (
        <div role="alert" className="form-alert form-alert--error">
          <XCircle className="form-alert-icon" />
          <span>{state.message}</span>
        </div>
      )}

      {/* Bouton de connexion */}
      <button
        type="submit"
        className="btn-primary"
        disabled={isPending}
        style={{ width: '100%' }}
      >
        {isPending ? (
          <>
            <span className="btn-spinner" aria-hidden="true" />
            Connexion en cours…
          </>
        ) : (
          'Se connecter'
        )}
      </button>
    </form>
  )
}

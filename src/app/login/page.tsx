import type { Metadata } from 'next'
import { Truck } from 'lucide-react'
import LoginForm from '@/components/LoginForm'

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous pour accéder à FleetTrack.',
}

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-card">
        {/* En-tête */}
        <div className="login-header">
          <div className="login-logo">
            <Truck className="login-logo-icon" />
          </div>
          <h1 className="login-title">FleetTrack</h1>
          <p className="login-subtitle">
            Connectez-vous pour accéder à votre espace
          </p>
        </div>

        {/* Formulaire */}
        <LoginForm />
      </div>
    </div>
  )
}

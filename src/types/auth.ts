// ─── Rôles (alignés sur l'enum SQL public.user_role) ──────────────────────────
export const USER_ROLES = ['ADMIN', 'USER'] as const
export type UserRole = (typeof USER_ROLES)[number]

// ─── Profil applicatif (miroir de public.utilisateurs) ────────────────────────
export interface Utilisateur {
  id: string        // uuid — FK → auth.users.id
  email: string
  role: UserRole
}

// ─── DTO connexion ────────────────────────────────────────────────────────────
export interface LoginCredentials {
  email: string
  password: string
}

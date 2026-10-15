'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ─── Types de retour ──────────────────────────────────────────────────────────

export type AuthActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const supabase = await createClient()

  const email    = (formData.get('email')    as string | null)?.trim()
  const password =  formData.get('password') as string | null

  if (!email || !password) {
    return { status: 'error', message: 'Email et mot de passe requis.' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { status: 'error', message: 'Email ou mot de passe incorrect.' }
  }

  // Le proxy.ts rafraîchira la session automatiquement au prochain request.
  revalidatePath('/', 'layout')
  redirect('/')
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

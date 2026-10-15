import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proxy helper — Rafraîchit la session Supabase et applique les règles d'accès :
 *
 *  1. Routes publiques (/login, /auth) → accès libre.
 *  2. Visiteur non connecté sur route protégée → redirect /login.
 *  3. Utilisateur connecté sur /login → redirect /.
 *  4. Route /admin/* → vérifie que le rôle est 'ADMIN' dans `public.utilisateurs`.
 *     Si non-ADMIN → redirect /.
 */
export async function updateSession(request: NextRequest) {
  // Passe sans erreur si les variables Supabase ne sont pas encore configurées
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT : getUser() valide le token côté Supabase Auth (pas juste le cookie)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Routes publiques — pas de protection ────────────────────────────────
  const isPublicRoute = pathname.startsWith('/login') || pathname.startsWith('/auth')

  // ── Règle 1 : visiteur non connecté → redirect /login ──────────────────
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── Règle 2 : utilisateur connecté sur /login → redirect / ─────────────
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // ── Règle 3 : route /admin/* → vérification du rôle ADMIN ─────────────
  if (user && pathname.startsWith('/admin')) {
    const { data: utilisateur } = await supabase
      .from('utilisateurs')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!utilisateur || utilisateur.role !== 'ADMIN') {
      const url = request.nextUrl.clone()
      url.pathname = '/acces-refuse'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

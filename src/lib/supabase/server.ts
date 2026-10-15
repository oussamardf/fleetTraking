import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Client Supabase pour les Server Components, Server Actions et Route Handlers.
 * Doit être appelé à l'intérieur d'une requête (accès au cookie store Next.js).
 *
 * @supabase/ssr lit et écrit les cookies de session via le cookie store de Next.js,
 * ce qui assure la propagation de la session côté serveur sans état global.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll peut échouer depuis un Server Component (lecture seule).
            // Si un Proxy/proxy.ts rafraîchit la session, ce bloc est ignoré sans danger.
          }
        },
      },
    },
  )
}

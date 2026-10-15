import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

/**
 * Proxy (anciennement Middleware) Next.js 16.
 *
 * Rafraîchit la session Supabase sur chaque requête et protège les routes.
 * Le fichier s'appelle désormais `proxy.ts` (convention Next.js 16).
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Applique le proxy à toutes les routes sauf :
     * - _next/static  (fichiers statiques)
     * - _next/image   (optimisation d'images)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Fichiers publics avec extension
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

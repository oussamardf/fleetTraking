import { createBrowserClient } from '@supabase/ssr'

/**
 * Client Supabase pour les Composants Client ('use client').
 * Crée une instance par appel — @supabase/ssr gère la deduplication interne.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

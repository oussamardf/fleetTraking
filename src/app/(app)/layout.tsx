import Sidebar from '@/components/layout/Sidebar'

/**
 * Layout du groupe (app) — toutes les pages protégées.
 * Affiche le shell avec la Sidebar à gauche et le contenu à droite.
 * Le route group (app) n'affecte pas les URLs (/ reste /, /admin reste /admin).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  )
}

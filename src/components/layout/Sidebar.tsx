'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShieldCheck, Truck, ChevronRight, LogOut } from 'lucide-react'
import { logout } from '@/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/i18n/LanguageProvider'
import LanguageSwitcher from '@/i18n/LanguageSwitcher'

type NavItem = {
  /** Clé dans `dict.nav`. */
  key: 'parc' | 'admin'
  href: string
  icon: typeof LayoutDashboard
  /** Réservé aux administrateurs — jamais rendu pour un profil standard. */
  adminOnly: boolean
}

const NAV_ITEMS: NavItem[] = [
  { key: 'parc', href: '/', icon: LayoutDashboard, adminOnly: false },
  { key: 'admin', href: '/admin', icon: ShieldCheck, adminOnly: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { dict } = useI18n()

  // RBAC : l'entrée admin n'est montée que si le rôle est confirmé ADMIN.
  // Par défaut on reste au moindre privilège — le lien n'est donc jamais
  // présent dans le DOM d'un utilisateur standard.
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadRole() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data: profil, error } = await supabase
          .from('utilisateurs')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('[Sidebar] Résolution du rôle impossible :', error)
          return
        }

        if (!cancelled && profil?.role === 'ADMIN') setIsAdmin(true)
      } catch (error) {
        console.error('[Sidebar] Résolution du rôle impossible :', error)
      }
    }

    loadRole()
    return () => {
      cancelled = true
    }
  }, [])

  // Le filtrage garantit que les entrées admin ne sont pas dans le DOM
  // des utilisateurs standards.
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <aside className="sidebar">
      {/* Logo / Marque */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Truck className="sidebar-logo-icon" />
        </div>
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">{dict.common.appName}</span>
          <span className="sidebar-brand-sub">{dict.common.appTagline}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-label">{dict.nav.menu}</p>
        <ul className="sidebar-nav-list">
          {navItems.map(({ key, href, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`}
                >
                  <Icon className="sidebar-nav-icon" />
                  <span className="sidebar-nav-label">{dict.nav[key]}</span>
                  {isActive && <ChevronRight className="sidebar-nav-chevron" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Pied de la sidebar — langue + déconnexion */}
      <div className="sidebar-footer">
        <LanguageSwitcher />

        <form action={logout}>
          <button className="sidebar-logout-btn" type="submit">
            <LogOut className="sidebar-logout-icon" />
            <span>{dict.nav.logout}</span>
          </button>
        </form>
      </div>
    </aside>
  )
}

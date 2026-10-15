'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShieldCheck,
  Truck,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { logout } from '@/actions/auth'

const navItems = [
  {
    label: 'Tableau de bord',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Administration',
    href: '/admin',
    icon: ShieldCheck,
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      {/* Logo / Marque */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Truck className="sidebar-logo-icon" />
        </div>
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">FleetTrack</span>
          <span className="sidebar-brand-sub">Gestion de flotte</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-label">Menu principal</p>
        <ul className="sidebar-nav-list">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href)

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`}
                >
                  <Icon className="sidebar-nav-icon" />
                  <span className="sidebar-nav-label">{label}</span>
                  {isActive && <ChevronRight className="sidebar-nav-chevron" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Pied de la sidebar — Déconnexion */}
      <div className="sidebar-footer">
        <form action={logout}>
          <button className="sidebar-logout-btn" type="submit">
            <LogOut className="sidebar-logout-icon" />
            <span>Déconnexion</span>
          </button>
        </form>
      </div>
    </aside>
  )
}

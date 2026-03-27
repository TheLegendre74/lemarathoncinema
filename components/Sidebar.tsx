'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/actions'
import { levelFromExp, getBadge, CONFIG } from '@/lib/config'
import type { Profile } from '@/lib/supabase/types'

interface SidebarProps { profile: Profile }

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const level = levelFromExp(profile.exp)
  const badge = getBadge(profile.exp)

  const nav = [
    { href: '/',            icon: '🏠', label: 'Accueil' },
    { href: '/films',       icon: '🎬', label: 'Films' },
    { href: '/semaine',     icon: '⭐', label: 'Film de la semaine' },
    { href: '/duels',       icon: '⚔️', label: 'Duels' },
    { href: '/notes',       icon: '📊', label: 'Classement films' },
    { href: '/classement',  icon: '🏆', label: 'Classement joueurs' },
    { href: '/profil',      icon: '👤', label: 'Mon profil' },
    { href: '/easter-eggs', icon: '🥚', label: 'Easter Eggs' },
    ...(profile.is_admin ? [{ href: '/admin', icon: '🔧', label: 'Administration' }] : []),
  ]

  async function handleSignOut() {
    await signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">Ciné<br/>Marathon</div>
        <div className="sidebar-logo-sub">{CONFIG.SAISON_LABEL}</div>
      </div>

      <div style={{ padding: '.8rem 0' }}>
        {nav.map(n => (
          <Link key={n.href} href={n.href} className={`nav-item ${pathname === n.href ? 'active' : ''}`}>
            <span style={{ fontSize: '.95rem', width: 18, textAlign: 'center', flexShrink: 0 }}>{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </div>

      <div className="sidebar-bottom">
        <div className="user-chip">
          <div className="user-ava">{profile.pseudo.slice(0, 2).toUpperCase()}</div>
          <div>
            <div style={{ fontSize: '.85rem', fontWeight: 500 }}>{profile.pseudo}</div>
            <div style={{ fontSize: '.7rem', color: 'var(--gold)' }}>
              {profile.exp} EXP · Niv.{level}
              {badge && <span style={{ marginLeft: '.4rem' }}>{badge.icon}</span>}
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="btn btn-outline btn-full"
          style={{ fontSize: '.78rem' }}
        >
          Déconnexion
        </button>
      </div>
    </nav>
  )
}

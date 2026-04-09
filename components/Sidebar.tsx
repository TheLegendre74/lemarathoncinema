'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/actions'
import { levelFromExp, getActiveBadge, CONFIG } from '@/lib/config'
import type { Profile } from '@/lib/supabase/types'

interface SidebarProps { profile: Profile | null }

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const level = profile ? levelFromExp(profile.exp) : null
  const badge = profile ? getActiveBadge(profile.exp, (profile as any).active_badge) : null

  const nav = [
    { href: '/',              icon: '🏠', label: 'Accueil',            short: 'Accueil'    },
    { href: '/films',         icon: '🎬', label: 'Films',              short: 'Films'      },
    { href: '/semaine',       icon: '⭐', label: 'Film de la semaine', short: 'Semaine'    },
    { href: '/duels',         icon: '⚔️', label: 'Duels',              short: 'Duels'      },
    { href: '/notes',         icon: '📊', label: 'Classement films',   short: 'Notes'      },
    { href: '/classement',    icon: '🏆', label: 'Classement joueurs', short: 'Classement' },
    { href: '/forum',         icon: '💬', label: 'Forum',              short: 'Forum'      },
    { href: '/rattrapage',    icon: '🎓', label: 'Rattrapage cinéma',  short: 'Rattrapage' },
    { href: '/easter-eggs',   icon: '🥚', label: 'Easter Eggs',        short: 'Easter'     },
    ...(profile ? [{ href: '/profil', icon: '👤', label: 'Mon profil',     short: 'Profil' }] : []),
    ...(profile?.is_admin ? [{ href: '/admin', icon: '🔧', label: 'Administration', short: 'Admin' }] : []),
  ]

  async function handleSignOut() {
    await signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <>
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
        {profile ? (
          <>
            <div className="user-chip">
              <div className="user-ava" style={profile.avatar_url ? { backgroundImage: `url(${profile.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                {!profile.avatar_url && profile.pseudo.slice(0, 2).toUpperCase()}
              </div>
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
          </>
        ) : (
          <>
            <div className="user-chip">
              <div className="user-ava" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>👤</div>
              <div>
                <div style={{ fontSize: '.85rem', fontWeight: 500, color: 'var(--text2)' }}>Mode Invité</div>
                <div style={{ fontSize: '.7rem', color: 'var(--text3)' }}>Lecture seule</div>
              </div>
            </div>
            <Link href="/auth" className="btn btn-gold btn-full" style={{ fontSize: '.78rem', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
              Se connecter
            </Link>
          </>
        )}
      </div>
    </nav>

    {/* Bottom nav mobile */}
    <nav className="bottom-nav">
      {nav.map(n => (
        <Link key={n.href} href={n.href} className={`bottom-nav-item ${pathname === n.href ? 'active' : ''}`}>
          <span className="bottom-nav-icon">{n.icon}</span>
          <span className="bottom-nav-label">{n.short}</span>
        </Link>
      ))}
      {profile ? (
        <button className="bottom-nav-item" onClick={handleSignOut}>
          <span className="bottom-nav-icon">🚪</span>
          <span className="bottom-nav-label">Quitter</span>
        </button>
      ) : (
        <Link href="/auth" className="bottom-nav-item">
          <span className="bottom-nav-icon">🔑</span>
          <span className="bottom-nav-label">Connexion</span>
        </Link>
      )}
    </nav>
    </>
  )
}

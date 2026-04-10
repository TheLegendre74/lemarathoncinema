'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { signOut } from '@/lib/actions'
import { levelFromExp, getActiveBadge, CONFIG } from '@/lib/config'
import type { Profile } from '@/lib/supabase/types'

interface SidebarProps { profile: Profile | null; hasRageuxEgg?: boolean; hasTamagotchiEgg?: boolean }

export default function Sidebar({ profile, hasRageuxEgg = false, hasTamagotchiEgg = false }: SidebarProps) {
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const router      = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  function isActive(href: string) {
    if (href.includes('?')) {
      const [p, q] = href.split('?')
      const key = q.split('=')[0], val = q.split('=')[1]
      return pathname === p && searchParams.get(key) === val
    }
    if (href === '/notes') return pathname === '/notes' && searchParams.get('tab') !== 'pires'
    return pathname === href
  }

  const level = profile ? levelFromExp(profile.exp) : null
  const badge = profile ? getActiveBadge(profile.exp, (profile as any).active_badge) : null

  const allNav = [
    { href: '/',            icon: '🏠', label: 'Accueil',            short: 'Accueil'    },
    { href: '/films',       icon: '🎬', label: 'Films',              short: 'Films'      },
    { href: '/semaine',     icon: '⭐', label: 'Film de la semaine', short: 'Semaine'    },
    { href: '/duels',       icon: '⚔️', label: 'Duels',              short: 'Duels'      },
    { href: '/notes',       icon: '📊', label: 'Classement films',   short: 'Notes'      },
    ...(hasRageuxEgg      ? [{ href: '/notes?tab=pires', icon: '💀', label: 'Pires Films',      short: 'Pires'      }] : []),
    ...(hasTamagotchiEgg  ? [{ href: '/tamagotchi',     icon: '🤍', label: 'Mon Alien',        short: 'Alien'      }] : []),
    { href: '/classement',  icon: '🏆', label: 'Classement joueurs', short: 'Classement' },
    { href: '/forum',       icon: '💬', label: 'Forum',              short: 'Forum'      },
    { href: '/rattrapage',  icon: '🎓', label: 'Rattrapage cinéma',  short: 'Rattrapage' },
    { href: '/easter-eggs', icon: '🥚', label: 'Easter Eggs',        short: 'Easter'     },
    ...(profile           ? [{ href: '/profil',         icon: '👤', label: 'Mon profil',       short: 'Profil'     }] : []),
    ...(profile?.is_admin ? [{ href: '/admin',          icon: '🔧', label: 'Administration',   short: 'Admin'      }] : []),
  ]

  // 4 onglets toujours visibles + bouton Menu
  const primaryHrefs = ['/', '/films', '/duels', '/notes']
  const primaryNav   = allNav.filter(n => primaryHrefs.includes(n.href))
  const menuNav      = allNav.filter(n => !primaryHrefs.includes(n.href))

  async function handleSignOut() {
    setMenuOpen(false)
    await signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <>
    {/* ══════════════════ SIDEBAR DESKTOP ══════════════════ */}
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">Ciné<br/>Marathon</div>
        <div className="sidebar-logo-sub">{CONFIG.SAISON_LABEL}</div>
      </div>

      <div style={{ padding: '.8rem 0' }}>
        {allNav.map(n => (
          <Link key={n.href} href={n.href} className={`nav-item ${isActive(n.href) ? 'active' : ''}`}>
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
            <button onClick={handleSignOut} className="btn btn-outline btn-full" style={{ fontSize: '.78rem' }}>
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

    {/* ══════════════════ TAB BAR MOBILE ══════════════════ */}
    <nav className="bottom-nav">
      {primaryNav.map(n => (
        <Link key={n.href} href={n.href} className={`bottom-nav-item ${isActive(n.href) ? 'active' : ''}`}>
          <span className="bottom-nav-icon">{n.icon}</span>
          <span className="bottom-nav-label">{n.short}</span>
        </Link>
      ))}
      <button
        className={`bottom-nav-item ${menuOpen ? 'active' : ''}`}
        onClick={() => setMenuOpen(v => !v)}
        aria-label="Menu"
      >
        <span className="bottom-nav-icon" style={{ fontSize: '1.1rem', fontWeight: menuOpen ? 700 : 400 }}>
          {menuOpen ? '✕' : '☰'}
        </span>
        <span className="bottom-nav-label">Menu</span>
      </button>
    </nav>

    {/* ══════════════════ DRAWER MOBILE ══════════════════ */}
    {menuOpen && (
      <>
        <div className="mobile-overlay" onClick={() => setMenuOpen(false)} />
        <div className="mobile-drawer">

          <div className="mobile-drawer-handle" />

          {/* Infos utilisateur */}
          <div className="mobile-drawer-user">
            {profile ? (
              <>
                <div
                  className="user-ava"
                  style={profile.avatar_url
                    ? { backgroundImage: `url(${profile.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center', width: 46, height: 46, fontSize: '1.1rem' }
                    : { width: 46, height: 46, fontSize: '1.1rem' }}
                >
                  {!profile.avatar_url && profile.pseudo.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{profile.pseudo}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--gold)', marginTop: '.1rem' }}>
                    {profile.exp} EXP · Niveau {level}
                    {badge && <span style={{ marginLeft: '.35rem' }}>{badge.icon}</span>}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="user-ava" style={{ background: 'var(--bg3)', color: 'var(--text3)', width: 46, height: 46 }}>👤</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text2)' }}>Mode Invité</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text3)' }}>Lecture seule</div>
                </div>
              </>
            )}
          </div>

          {/* Grille des pages */}
          <div className="mobile-drawer-grid">
            {menuNav.map(n => (
              <Link
                key={n.href}
                href={n.href}
                className={`mobile-drawer-item ${isActive(n.href) ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="mobile-drawer-item-icon">{n.icon}</span>
                <span className="mobile-drawer-item-label">{n.short}</span>
              </Link>
            ))}
          </div>

          <div className="sep" />

          {profile ? (
            <button className="btn btn-outline btn-full" onClick={handleSignOut} style={{ fontSize: '.88rem' }}>
              🚪 Déconnexion
            </button>
          ) : (
            <Link
              href="/auth"
              className="btn btn-gold btn-full"
              style={{ textDecoration: 'none', textAlign: 'center', fontSize: '.88rem' }}
              onClick={() => setMenuOpen(false)}
            >
              🔑 Se connecter
            </Link>
          )}
        </div>
      </>
    )}
    </>
  )
}

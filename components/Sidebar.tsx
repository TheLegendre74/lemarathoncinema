'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { signOut } from '@/lib/actions'
import { levelFromExp, getActiveBadge, CONFIG } from '@/lib/config'
import type { Profile } from '@/lib/supabase/types'

interface SidebarProps { profile: Profile | null; hasRageuxEgg?: boolean; hasTamagotchiEgg?: boolean; hasConwayEgg?: boolean; unreadMessages?: number }

export default function Sidebar({ profile, hasRageuxEgg = false, hasTamagotchiEgg = false, hasConwayEgg = false, unreadMessages = 0 }: SidebarProps) {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [clippyMastered,  setClippyMastered]  = useState(false)
  const [clippyActive,    setClippyActive]    = useState(false)
  const [conwayUnlocked,  setConwayUnlocked]  = useState(hasConwayEgg)
  useEffect(() => {
    setClippyMastered(localStorage.getItem('clippy_mastered') === '1')
    setClippyActive(localStorage.getItem('clippy_active') === '1')
    // Fallback localStorage pour affichage immédiat si egg déclenché dans cette session
    if (!hasConwayEgg && localStorage.getItem('conway_unlocked') === '1') setConwayUnlocked(true)
    function onState(e: Event) { setClippyActive((e as CustomEvent).detail?.active ?? false) }
    function onConwayUnlock() { setConwayUnlocked(true) }
    window.addEventListener('clippy:statechange', onState)
    window.addEventListener('conway:unlocked', onConwayUnlock)
    return () => {
      window.removeEventListener('clippy:statechange', onState)
      window.removeEventListener('conway:unlocked', onConwayUnlock)
    }
  }, [hasConwayEgg])

  function isActive(href: string) {
    if (href.includes('?')) {
      const [p, q] = href.split('?')
      const key = q.split('=')[0], val = q.split('=')[1]
      return pathname === p && searchParams.get(key) === val
    }
    if (href === '/notes') return pathname === '/notes' && searchParams.get('tab') !== 'pires'
    return pathname === href
  }

  const level = useMemo(() => profile ? levelFromExp(profile.exp) : null, [profile?.exp])
  const badge = useMemo(() => profile ? getActiveBadge(profile.exp, (profile as any).active_badge) : null, [profile?.exp, (profile as any)?.active_badge])

  /* ── Structure groupée ── */
  const standaloneNav = useMemo(() => [
    { href: '/',      icon: '🏠', label: 'Accueil',        short: 'Accueil' },
    ...(profile       ? [{ href: '/profil', icon: '👤', label: 'Mon profil', short: 'Profil', badge: unreadMessages > 0 ? unreadMessages : null }] : []),
    ...(profile?.is_admin ? [{ href: '/admin', icon: '🔧', label: 'Administration', short: 'Admin' }] : []),
  ], [profile?.id, profile?.is_admin, unreadMessages])

  const navGroups = useMemo(() => [
    {
      id: 'evenement',
      icon: '🎪',
      label: 'Évènement Collectif',
      items: [
        { href: '/semaine', icon: '⭐', label: 'Films de la semaine', short: 'Semaine' },
        { href: '/duels',   icon: '⚔️', label: 'Duels',               short: 'Duels'   },
      ],
    },
    {
      id: 'films',
      icon: '🎬',
      label: 'Films',
      items: [
        { href: '/films',          icon: '🎬', label: 'Liste de Films',      short: 'Films'     },
        { href: '/notes',          icon: '📊', label: 'Classements Films',   short: 'Notes'     },
        ...(hasRageuxEgg ? [{ href: '/notes?tab=pires', icon: '💀', label: 'Pires Films', short: 'Pires' }] : []),
        { href: '/rattrapage',     icon: '🎓', label: 'Rattrapages Cinéma',  short: 'Rattrapage'},
        ...(profile ? [{ href: '/watchlist', icon: '📋', label: 'Mes Watchlists', short: 'Watch' }] : []),
      ],
    },
    {
      id: 'social',
      icon: '👥',
      label: 'Social',
      items: [
        { href: '/forum',        icon: '💬', label: 'Forum',              short: 'Forum'      },
        { href: '/marathoniens', icon: '🎖️', label: 'Marathoniens',       short: 'Joueurs'    },
        { href: '/classement',   icon: '🏆', label: 'Classement Joueurs', short: 'Classement' },
        { href: '/messages',     icon: '✉️', label: 'Messages',           short: 'Messages',  badge: unreadMessages > 0 ? unreadMessages : null },
      ],
    },
    {
      id: 'secret',
      icon: '🔮',
      label: 'Secret',
      items: [
        ...(hasTamagotchiEgg  ? [{ href: '/tamagotchi', icon: '🤍', label: 'Mon Alien',       short: 'Alien'  }] : []),
        ...(conwayUnlocked    ? [{ href: '/conway',     icon: '◼',  label: 'Jeu de la Vie',   short: 'Conway' }] : []),
        { href: '/easter-eggs', icon: '🥚', label: 'Easter Eggs', short: 'Easter' },
      ],
    },
  ], [hasRageuxEgg, hasTamagotchiEgg, conwayUnlocked, unreadMessages])

  /* groupe actif selon la page courante */
  const activeGroup = useCallback(() => {
    for (const g of navGroups) {
      if (g.items.some(i => isActive(i.href))) return g.id
    }
    return null
  }, [navGroups, pathname, searchParams])

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const ag = activeGroup()
    return ag ? { [ag]: true } : {}
  })

  function toggleGroup(gid: string) {
    setOpenGroups(prev => ({ ...prev, [gid]: !prev[gid] }))
  }

  /* nav mobile : tous les items à plat */
  const allItemsFlat = [
    ...standaloneNav,
    ...navGroups.flatMap(g => g.items),
  ]
  const primaryHrefs = ['/', '/films', '/marathoniens', '/forum', '/notes']
  const primaryNav   = allItemsFlat.filter(n => primaryHrefs.includes(n.href))
  const menuNav      = allItemsFlat.filter(n => !primaryHrefs.includes(n.href))

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

      <div style={{ padding: '.6rem 0' }}>
        {/* Items standalone */}
        {standaloneNav.map(n => (
          <Link key={n.href} href={n.href} className={`nav-item ${isActive(n.href) ? 'active' : ''}`}>
            <span style={{ fontSize: '.95rem', width: 18, textAlign: 'center', flexShrink: 0 }}>{n.icon}</span>
            {n.label}
            {(n as any).badge && (
              <span style={{ marginLeft: 'auto', background: 'var(--red)', color: '#fff', borderRadius: 99, fontSize: '.6rem', fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>
                {(n as any).badge > 99 ? '99+' : (n as any).badge}
              </span>
            )}
          </Link>
        ))}

        <div className="nav-sep" />

        {/* Groupes accordéon */}
        {navGroups.map(g => {
          const isOpen   = !!openGroups[g.id]
          const isActive_ = g.items.some(i => isActive(i.href))
          return (
            <div key={g.id}>
              <div
                className={`nav-group-header ${isOpen ? 'open' : ''} ${isActive_ ? 'active' : ''}`}
                onClick={() => toggleGroup(g.id)}
              >
                <span style={{ fontSize: '.95rem', width: 18, textAlign: 'center', flexShrink: 0 }}>{g.icon}</span>
                {g.label}
                <span className={`nav-group-arrow ${isOpen ? 'open' : ''}`}>▶</span>
              </div>
              <div className={`nav-submenu ${isOpen ? 'open' : ''}`}>
                {g.items.map(item => (
                  <Link key={item.href} href={item.href} className={`nav-subitem ${isActive(item.href) ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{item.label}</span>
                    {(item as any).badge && (
                      <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 99, fontSize: '.6rem', fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center', flexShrink: 0 }}>
                        {(item as any).badge > 99 ? '99+' : (item as any).badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
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

          <div className="mobile-drawer-grid">
            {menuNav.map(n => (
              <Link
                key={n.href}
                href={n.href}
                className={`mobile-drawer-item ${isActive(n.href) ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
                style={{ position: 'relative' }}
              >
                <span className="mobile-drawer-item-icon">{n.icon}</span>
                <span className="mobile-drawer-item-label">{n.short}</span>
                {(n.href === '/profil' || n.href === '/messages') && unreadMessages > 0 && (
                  <span style={{ position: 'absolute', top: 4, right: 4, background: 'var(--red)', color: '#fff', borderRadius: 99, fontSize: '.55rem', fontWeight: 700, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </Link>
            ))}
            {clippyMastered && (
              <button
                className="mobile-drawer-item"
                onClick={() => { setMenuOpen(false); window.dispatchEvent(new CustomEvent(clippyActive ? 'clippy:revoke' : 'clippy:invoke')) }}
                style={clippyActive
                  ? { background: 'rgba(232,90,90,.08)', border: '1px solid rgba(232,90,90,.25)' }
                  : { background: 'rgba(232,196,106,.06)', border: '1px solid rgba(232,196,106,.2)' }
                }
              >
                <span className="mobile-drawer-item-icon">{clippyActive ? '🔒' : '📦'}</span>
                <span className="mobile-drawer-item-label">{clippyActive ? 'Révoquer' : 'Coffre'}</span>
              </button>
            )}
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

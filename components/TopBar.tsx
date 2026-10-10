'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme, useNavLabel, useNavCourtLabel } from '@/components/theme/ThemeProvider'
import { NAV_ENTRIES, ACCOUNT_ENTRIES, CATEGORIES, BOTTOM_NAV_KEYS, getCategoryEntries, isEntryVisible } from '@/lib/nav'
import type { NavConditions, NavEntry, NavCategory } from '@/lib/nav'
import type { NavKey, NavCourtKey } from '@/lib/themes/types'
import { useConfig } from '@/components/config/ConfigProvider'
import { IconHome, IconFilm, IconStar, IconMessageCircle, IconUsers, IconMenu, IconX, IconChevronDown, IconUser, IconLogOut, IconShield, IconMail } from '@/components/ui/icons'
import styles from './TopBar.module.css'

interface TopBarProps {
  cond: NavConditions
  pseudo?: string
  playerLevel?: number | null
  onLogout: () => void
}

export default function TopBar({ cond, pseudo, playerLevel, onLogout }: TopBarProps) {
  const pathname = usePathname()
  const config = useConfig()
  const { key: themeKey, week, def } = useTheme()
  const navLabel = useNavLabel()
  const navCourtLabel = useNavCourtLabel()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const menuTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const closeMenus = useCallback(() => {
    setOpenMenu(null)
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current)
  }, [])

  useEffect(() => { closeMenus(); setDrawerOpen(false) }, [pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  const isActive = (route: string) => {
    if (route === '/') return pathname === '/'
    if (route.includes('?')) return pathname === route.split('?')[0]
    return pathname?.startsWith(route)
  }

  const seasonLabel = `SAISON ${String(config.SAISON_NUMERO).padStart(2, '0')}`
  const daysUntil = Math.max(0, Math.ceil((new Date(config.MARATHON_START).getTime() - Date.now()) / 86400000))
  const isPreSeason = new Date(config.MARATHON_START) > new Date()
  const weekPill = week
    ? def.weekLabel(week)
    : isPreSeason ? `${seasonLabel} · J-${daysUntil}` : seasonLabel
  const weekPillCourt = week
    ? def.weekCourt(week)
    : isPreSeason ? `J-${daysUntil}` : `S${String(config.SAISON_NUMERO).padStart(2, '0')}`

  const videoclubEntry = NAV_ENTRIES.find(e => e.key === 'videoclub')
  const showVideoclub = videoclubEntry && isEntryVisible(videoclubEntry, cond)

  return (
    <>
      {/* ── Skip link ── */}
      <a href="#contenu" className={styles.skip}>Aller au contenu</a>

      {/* ── TOP BAR ── */}
      <header className={styles.bar}>
        <div className={styles.barInner}>
          <div className={styles.left}>
            <Link href="/" className={styles.brand} data-brand-title>
              <span className={styles.brandCine}>CINÉ</span>{' '}
              <span className={styles.brandMarathon}>MARATHON</span>
            </Link>

            {/* Desktop nav entries */}
            <nav className={styles.desktopNav}>
              <Link href="/" className={`${styles.navLink} ${isActive('/') ? styles.navActive : ''}`}>
                {navLabel('home')}
              </Link>
              {showVideoclub && (
                <Link href="/videoclub" className={`${styles.navLink} ${isActive('/videoclub') ? styles.navActive : ''}`}>
                  <span className={styles.neonDot} />
                  {navLabel('videoclub')}
                </Link>
              )}
              {CATEGORIES.map(cat => (
                <DropdownMenu
                  key={cat.key}
                  label={navLabel(cat.labelKey)}
                  entries={getCategoryEntries(cat.key, cond)}
                  isActive={(entries) => entries.some(e => isActive(e.route))}
                  pathname={pathname}
                  openMenu={openMenu}
                  menuKey={cat.key}
                  setOpenMenu={setOpenMenu}
                  closeMenus={closeMenus}
                  unreadMessages={cond.unreadMessages}
                />
              ))}
            </nav>
          </div>

          <div className={styles.right}>
            {themeKey === 'action' && (
              <EtageBadge level={playerLevel ?? null} />
            )}
            <span className={styles.weekPill}>
              <span className={styles.weekPillFull}>{weekPill}</span>
              <span className={styles.weekPillCourt}>{weekPillCourt}</span>
            </span>
            {/* Tablet menu button */}
            <button className={styles.tabletMenuBtn} onClick={() => setDrawerOpen(true)} aria-label="Menu">
              <IconMenu />
            </button>
            {/* Account */}
            {cond.isAuth ? (
              <AccountMenu
                pseudo={pseudo}
                cond={cond}
                onLogout={onLogout}
                pathname={pathname}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
                closeMenus={closeMenus}
              />
            ) : (
              <Link href="/auth" className={styles.loginBtn}>{navLabel('login')}</Link>
            )}
          </div>
        </div>
      </header>

      {/* ── BOTTOM NAV (mobile) ── */}
      <nav className={styles.bottomBar}>
        {BOTTOM_NAV_KEYS.map(key => {
          const entry = NAV_ENTRIES.find(e => e.key === key)
          if (!entry) return null
          return (
            <Link key={key} href={entry.route} className={`${styles.bottomItem} ${isActive(entry.route) ? styles.bottomActive : ''}`}>
              <BottomIcon navKey={key} />
              <span className={styles.bottomLabel}>{navCourtLabel(key as NavCourtKey)}</span>
            </Link>
          )
        })}
        <button className={`${styles.bottomItem} ${drawerOpen ? styles.bottomActive : ''}`} onClick={() => setDrawerOpen(!drawerOpen)}>
          {drawerOpen ? <IconX /> : <IconMenu />}
          <span className={styles.bottomLabel}>Menu</span>
        </button>
      </nav>

      {/* ── DRAWER (mobile + tablet) ── */}
      {drawerOpen && (
        <>
          <div className={styles.overlay} onClick={() => setDrawerOpen(false)} />
          <div className={styles.drawer} role="dialog" aria-modal="true" aria-label="Menu">
            <div className={styles.drawerHandle} />
            <div className={styles.drawerWeek}>{weekPill}</div>
            {cond.isAuth && pseudo && (
              <div className={styles.drawerUser}>
                <div className={styles.avatar}>{pseudo.charAt(0).toUpperCase()}</div>
                <span className={styles.drawerPseudo}>{pseudo}</span>
              </div>
            )}
            {showVideoclub && (
              <Link href="/videoclub" className={styles.drawerLink} onClick={() => setDrawerOpen(false)}>
                <span className={styles.neonDot} />{navLabel('videoclub')}
              </Link>
            )}
            {CATEGORIES.map(cat => {
              const entries = getCategoryEntries(cat.key, cond)
              if (entries.length === 0) return null
              return (
                <div key={cat.key} className={styles.drawerSection}>
                  <div className={styles.drawerSectionTitle}>{navLabel(cat.labelKey)}</div>
                  {entries.map(e => (
                    <Link key={e.key} href={e.route} className={`${styles.drawerLink} ${isActive(e.route) ? styles.drawerActive : ''}`} onClick={() => setDrawerOpen(false)}>
                      {navLabel(e.key)}
                      {e.badge === 'unread' && cond.unreadMessages > 0 && (
                        <span className={styles.unreadBadge}>{cond.unreadMessages}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )
            })}
            {cond.isAuth && (
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>Compte</div>
                <Link href="/profil" className={styles.drawerLink} onClick={() => setDrawerOpen(false)}>{navLabel('profil')}</Link>
                {cond.isAdmin && (
                  <Link href="/admin" className={styles.drawerLink} onClick={() => setDrawerOpen(false)}>{navLabel('admin')}</Link>
                )}
                <button className={styles.drawerLink} onClick={() => { setDrawerOpen(false); onLogout() }}>{navLabel('logout')}</button>
              </div>
            )}
            {!cond.isAuth && (
              <Link href="/auth" className={styles.drawerLoginBtn} onClick={() => setDrawerOpen(false)}>{navLabel('login')}</Link>
            )}
          </div>
        </>
      )}
    </>
  )
}

/* ── Dropdown menu (desktop) ── */
function DropdownMenu({
  label, entries, isActive: checkActive, pathname, openMenu, menuKey, setOpenMenu, closeMenus, unreadMessages,
}: {
  label: string
  entries: NavEntry[]
  isActive: (entries: NavEntry[]) => boolean
  pathname: string | null
  openMenu: string | null
  menuKey: string
  setOpenMenu: (k: string | null) => void
  closeMenus: () => void
  unreadMessages: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const navLabel = useNavLabel()
  const isOpen = openMenu === menuKey
  const active = checkActive(entries)

  useEffect(() => {
    if (!isOpen) return
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) closeMenus() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenus() }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey) }
  }, [isOpen])

  if (entries.length === 0) return null

  return (
    <div ref={ref} className={styles.dropdown}>
      <button
        className={`${styles.navLink} ${active ? styles.navActive : ''}`}
        onClick={() => setOpenMenu(isOpen ? null : menuKey)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {label}
        <IconChevronDown className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
      </button>
      {isOpen && (
        <div className={styles.dropdownPanel}>
          {entries.map(e => {
            const isCurrentActive = pathname === e.route || (e.route !== '/' && pathname?.startsWith(e.route.split('?')[0]))
            return (
              <Link key={e.key} href={e.route} className={`${styles.dropdownItem} ${isCurrentActive ? styles.dropdownActive : ''}`} onClick={closeMenus}>
                {navLabel(e.key)}
                {e.badge === 'unread' && unreadMessages > 0 && (
                  <span className={styles.unreadBadge}>{unreadMessages}</span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Account menu (desktop) ── */
function AccountMenu({
  pseudo, cond, onLogout, pathname, openMenu, setOpenMenu, closeMenus,
}: {
  pseudo?: string
  cond: NavConditions
  onLogout: () => void
  pathname: string | null
  openMenu: string | null
  setOpenMenu: (k: string | null) => void
  closeMenus: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const navLabel = useNavLabel()
  const isOpen = openMenu === 'account'

  useEffect(() => {
    if (!isOpen) return
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) closeMenus() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenus() }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey) }
  }, [isOpen])

  return (
    <div ref={ref} className={styles.dropdown}>
      <button className={styles.avatarBtn} onClick={() => setOpenMenu(isOpen ? null : 'account')} aria-expanded={isOpen} aria-label="Compte">
        <div className={styles.avatar}>
          {pseudo?.charAt(0).toUpperCase() ?? '?'}
        </div>
        {cond.unreadMessages > 0 && <span className={styles.avatarDot} />}
      </button>
      {isOpen && (
        <div className={`${styles.dropdownPanel} ${styles.dropdownRight}`}>
          <Link href="/profil" className={styles.dropdownItem} onClick={closeMenus}>
            <IconUser width={16} height={16} /> {navLabel('profil')}
          </Link>
          <Link href="/messages" className={styles.dropdownItem} onClick={closeMenus}>
            <IconMail width={16} height={16} /> {navLabel('messages')}
            {cond.unreadMessages > 0 && <span className={styles.unreadBadge}>{cond.unreadMessages}</span>}
          </Link>
          {cond.isAdmin && (
            <Link href="/admin" className={styles.dropdownItem} onClick={closeMenus}>
              <IconShield width={16} height={16} /> {navLabel('admin')}
            </Link>
          )}
          <button className={styles.dropdownItem} onClick={() => { closeMenus(); onLogout() }}>
            <IconLogOut width={16} height={16} /> {navLabel('logout')}
          </button>
        </div>
      )}
    </div>
  )
}

function EtageBadge({ level }: { level: number | null }) {
  const touchCountRef = useRef(0)
  const touchTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const label = level !== null ? `ÉTAGE ${pad2(Math.min(level, 12))}` : 'ÉTAGE —'

  const handleTouch = useCallback(() => {
    touchCountRef.current++
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    touchTimerRef.current = setTimeout(() => { touchCountRef.current = 0 }, 3000)
    if (touchCountRef.current >= 5) {
      touchCountRef.current = 0
      window.dispatchEvent(new CustomEvent('action:nakatomi-secours'))
    }
  }, [])

  return (
    <span
      className={styles.etageBadge}
      data-etage-badge
      onClick={handleTouch}
      role="button"
      tabIndex={0}
      style={{ touchAction: 'manipulation' }}
    >
      {label}
    </span>
  )
}

function BottomIcon({ navKey }: { navKey: NavKey }) {
  switch (navKey) {
    case 'home': return <IconHome />
    case 'films': return <IconFilm />
    case 'notes': return <IconStar />
    case 'forum': return <IconMessageCircle />
    case 'marathoniens': return <IconUsers />
    default: return null
  }
}

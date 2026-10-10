'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './admin.module.css'

interface AdminNavProps {
  counts: {
    join: number
    films: number
    reports: number
    duels: number
  }
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Tableau de bord', exact: true },
  { href: '/admin/theme', label: 'Theme & saison' },
  { href: '/admin/seances', label: 'Seances' },
  { href: '/admin/joueurs', label: 'Joueurs' },
  { href: '/admin/films', label: 'Films' },
  { href: '/admin/contenu', label: 'Contenu' },
  { href: '/admin/oeufs', label: 'Oeufs' },
  { href: '/admin/reglages', label: 'Reglages' },
  { href: '/admin/outils', label: 'Outils' },
]

function getBadge(href: string, counts: AdminNavProps['counts']): number {
  switch (href) {
    case '/admin/joueurs': return counts.join
    case '/admin/films': return counts.films + counts.reports
    case '/admin/seances': return counts.duels
    default: return 0
  }
}

export default function AdminNav({ counts }: AdminNavProps) {
  const pathname = usePathname()

  const totalPending = counts.join + counts.films + counts.reports + counts.duels

  return (
    <>
      <nav className={styles.sidebar}>
        {NAV_ITEMS.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const badge = getBadge(item.href, counts)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.sideLink} ${active ? styles.sideLinkActive : ''}`}
            >
              <span>{item.label}</span>
              {badge > 0 && <span className={styles.badge}>{badge}</span>}
            </Link>
          )
        })}
      </nav>
      <div className={styles.mobileSelect}>
        <select
          value={NAV_ITEMS.find(i => i.exact ? pathname === i.href : pathname.startsWith(i.href))?.href ?? '/admin'}
          onChange={e => { window.location.href = e.target.value }}
          className={styles.input}
        >
          {NAV_ITEMS.map(item => {
            const badge = getBadge(item.href, counts)
            return (
              <option key={item.href} value={item.href}>
                {item.label}{badge > 0 ? ` (${badge})` : ''}
              </option>
            )
          })}
        </select>
      </div>
    </>
  )
}

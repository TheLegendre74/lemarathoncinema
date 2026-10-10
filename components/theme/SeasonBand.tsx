'use client'

import { useTheme } from './ThemeProvider'
import type { SeasonWeek } from '@/lib/themes/types'
import styles from './SeasonBand.module.css'

const THEME_COLORS: Record<string, string> = {
  action: 'var(--accent-fg, #d4790e)',
  comedie: 'var(--accent-fg, #d4790e)',
  western: 'var(--accent-fg, #d4790e)',
  horreur: 'var(--accent-fg, #d4790e)',
  neutre: 'var(--ink3)',
}

function formatDateRange(dateDebut: string): string {
  const start = new Date(dateDebut + 'T12:00:00Z')
  const end = new Date(start.getTime() + 6 * 86400000)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' }
  const s = start.toLocaleDateString('fr-FR', opts)
  const e = end.toLocaleDateString('fr-FR', opts)
  return `${s} — ${e}`
}

function themeLabel(theme: string): string {
  const map: Record<string, string> = {
    action: 'Action', comedie: 'Comedie', western: 'Western',
    horreur: 'Horreur', neutre: 'Neutre',
  }
  return map[theme] ?? theme
}

interface SeasonBandProps {
  weeks: SeasonWeek[]
}

export default function SeasonBand({ weeks }: SeasonBandProps) {
  const { week: currentWeek } = useTheme()

  if (!weeks.length) return null

  const currentSaison = currentWeek?.saison ?? weeks[0]?.saison
  const seasonWeeks = weeks
    .filter(w => w.saison === currentSaison)
    .sort((a, b) => a.semaine - b.semaine)

  if (!seasonWeeks.length) return null

  const now = new Date()

  return (
    <div className={styles.band}>
      <div className={styles.label}>Saison {String(currentSaison).padStart(2, '0')}</div>
      <div className={styles.weeks}>
        {seasonWeeks.map(w => {
          const wStart = new Date(w.date_debut + 'T00:00:00Z')
          const wEnd = new Date(wStart.getTime() + 7 * 86400000)
          const isPast = now >= wEnd
          const isCurrent = currentWeek?.semaine === w.semaine && currentWeek?.saison === w.saison

          return (
            <div
              key={`${w.saison}-${w.semaine}`}
              className={`${styles.week} ${isCurrent ? styles.weekCurrent : ''} ${isPast ? styles.weekPast : ''}`}
            >
              <div className={styles.weekNum}>S{w.semaine}</div>
              <div className={styles.weekTheme}>{themeLabel(w.theme)}</div>
              <div className={styles.weekDates}>{formatDateRange(w.date_debut)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

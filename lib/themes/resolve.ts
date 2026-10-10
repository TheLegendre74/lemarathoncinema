import type { ThemeKey, ResolvedTheme, SeasonWeek } from './types'
import { READY_THEMES } from './types'
import { parisParts, fromParis } from '../time/paris'

interface ResolveInput {
  now: Date
  cfg: { theme_mode: 'auto' | 'force'; theme_force: ThemeKey }
  weeks: SeasonWeek[]
  previewCookie: ThemeKey | null
  isAdmin: boolean
}

function findCurrentWeek(now: Date, weeks: SeasonWeek[]): (SeasonWeek & { total: number }) | null {
  if (!weeks.length) return null

  const saisons = new Map<number, number>()
  for (const w of weeks) {
    saisons.set(w.saison, (saisons.get(w.saison) ?? 0) + 1)
  }

  const sorted = [...weeks].sort((a, b) => {
    const da = new Date(a.date_debut).getTime()
    const db = new Date(b.date_debut).getTime()
    return da - db
  })

  for (let i = 0; i < sorted.length; i++) {
    const w = sorted[i]
    const [y, m, d] = w.date_debut.split('-').map(Number)
    const start = fromParis(y, m, d, 0, 0)

    let end: Date
    if (i + 1 < sorted.length) {
      const next = sorted[i + 1]
      const [ny, nm, nd] = next.date_debut.split('-').map(Number)
      end = fromParis(ny, nm, nd, 0, 0)
    } else {
      end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
    }

    if (now >= start && now < end) {
      return { ...w, total: saisons.get(w.saison) ?? 1 }
    }
  }

  return null
}

export function resolveTheme(input: ResolveInput): ResolvedTheme {
  const { now, cfg, weeks, previewCookie, isAdmin } = input

  const currentWeek = findCurrentWeek(now, weeks)
  const weekInfo = currentWeek
    ? { saison: currentWeek.saison, semaine: currentWeek.semaine, total: currentWeek.total, theme: currentWeek.theme }
    : null

  function resolve(): { key: ThemeKey; source: ResolvedTheme['source'] } {
    if (cfg.theme_mode === 'force') {
      if (READY_THEMES.includes(cfg.theme_force)) {
        return { key: cfg.theme_force, source: 'force' }
      }
      return { key: 'neutre', source: 'force' }
    }

    if (currentWeek && READY_THEMES.includes(currentWeek.theme as ThemeKey)) {
      return { key: currentWeek.theme as ThemeKey, source: 'planning' }
    }

    return { key: 'neutre', source: 'defaut' }
  }

  const { key: realKey, source: realSource } = resolve()

  if (previewCookie && isAdmin && READY_THEMES.includes(previewCookie)) {
    return { key: previewCookie, real: realKey, source: 'apercu', week: weekInfo }
  }

  return { key: realKey, real: realKey, source: realSource, week: weekInfo }
}

export function nextMondayParis(now: Date): Date {
  const p = parisParts(now)
  const daysUntilMonday = p.dow === 1 ? 7 : (8 - p.dow)
  const mondayUtc = new Date(Date.UTC(p.y, p.m - 1, p.d + daysUntilMonday))
  return fromParis(mondayUtc.getUTCFullYear(), mondayUtc.getUTCMonth() + 1, mondayUtc.getUTCDate(), 0, 0)
}

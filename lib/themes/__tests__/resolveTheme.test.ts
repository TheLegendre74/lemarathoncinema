import { describe, it, expect } from 'vitest'
import { resolveTheme, nextMondayParis } from '../resolve'
import { fromParis } from '../../time/paris'
import type { ThemeKey, SeasonWeek } from '../types'

function makeWeeks(entries: Array<{ saison: number; semaine: number; theme: string; date_debut: string }>): SeasonWeek[] {
  return entries
}

const defaultCfg = { theme_mode: 'auto' as const, theme_force: 'neutre' as ThemeKey }

describe('resolveTheme', () => {
  it('renvoie neutre quand la table est vide', () => {
    const r = resolveTheme({
      now: new Date('2026-10-05T10:00:00Z'),
      cfg: defaultCfg,
      weeks: [],
      previewCookie: null,
      isAdmin: false,
    })
    expect(r.key).toBe('neutre')
    expect(r.source).toBe('defaut')
    expect(r.week).toBeNull()
  })

  it('suit le planning quand une semaine couvre now', () => {
    const weeks = makeWeeks([
      { saison: 1, semaine: 1, theme: 'action', date_debut: '2026-10-05' },
      { saison: 1, semaine: 2, theme: 'comedie', date_debut: '2026-10-12' },
    ])
    const now = fromParis(2026, 10, 7, 14, 0)
    const r = resolveTheme({ now, cfg: defaultCfg, weeks, previewCookie: null, isAdmin: false })
    expect(r.key).toBe('action')
    expect(r.source).toBe('planning')
    expect(r.week).toEqual({ saison: 1, semaine: 1, total: 2, theme: 'action' })
  })

  it('le mode force est prioritaire sur le planning', () => {
    const weeks = makeWeeks([
      { saison: 1, semaine: 1, theme: 'action', date_debut: '2026-10-05' },
    ])
    const now = fromParis(2026, 10, 7, 12, 0)
    const r = resolveTheme({
      now,
      cfg: { theme_mode: 'force', theme_force: 'western' },
      weeks,
      previewCookie: null,
      isAdmin: false,
    })
    expect(r.key).toBe('western')
    expect(r.source).toBe('force')
    expect(r.week).not.toBeNull()
  })

  it("l'apercu admin fonctionne pour un admin", () => {
    const r = resolveTheme({
      now: new Date('2026-10-06T10:00:00Z'),
      cfg: defaultCfg,
      weeks: [],
      previewCookie: 'horreur',
      isAdmin: true,
    })
    expect(r.key).toBe('horreur')
    expect(r.real).toBe('neutre')
    expect(r.source).toBe('apercu')
  })

  it("l'apercu est ignore pour un non-admin", () => {
    const r = resolveTheme({
      now: new Date('2026-10-06T10:00:00Z'),
      cfg: defaultCfg,
      weeks: [],
      previewCookie: 'horreur',
      isAdmin: false,
    })
    expect(r.key).toBe('neutre')
    expect(r.source).toBe('defaut')
  })

  it('un theme non pret retombe en neutre', () => {
    const weeks = makeWeeks([
      { saison: 1, semaine: 1, theme: 'documentaire', date_debut: '2026-10-05' },
    ])
    const now = fromParis(2026, 10, 7, 10, 0)
    const r = resolveTheme({ now, cfg: defaultCfg, weeks, previewCookie: null, isAdmin: false })
    expect(r.key).toBe('neutre')
    expect(r.source).toBe('defaut')
    expect(r.week).not.toBeNull()
  })

  it('bascule exacte le lundi 0h Paris (heure ete, CEST)', () => {
    const weeks = makeWeeks([
      { saison: 1, semaine: 1, theme: 'action', date_debut: '2026-06-15' },
      { saison: 1, semaine: 2, theme: 'comedie', date_debut: '2026-06-22' },
    ])

    const justBefore = new Date(fromParis(2026, 6, 22, 0, 0).getTime() - 1)
    const r1 = resolveTheme({ now: justBefore, cfg: defaultCfg, weeks, previewCookie: null, isAdmin: false })
    expect(r1.key).toBe('action')

    const exact = fromParis(2026, 6, 22, 0, 0)
    const r2 = resolveTheme({ now: exact, cfg: defaultCfg, weeks, previewCookie: null, isAdmin: false })
    expect(r2.key).toBe('comedie')
  })

  it('bascule exacte le lundi 0h Paris (heure hiver, CET)', () => {
    const weeks = makeWeeks([
      { saison: 2, semaine: 1, theme: 'western', date_debut: '2026-11-02' },
      { saison: 2, semaine: 2, theme: 'horreur', date_debut: '2026-11-09' },
    ])

    const justBefore = new Date(fromParis(2026, 11, 9, 0, 0).getTime() - 1)
    const r1 = resolveTheme({ now: justBefore, cfg: defaultCfg, weeks, previewCookie: null, isAdmin: false })
    expect(r1.key).toBe('western')

    const exact = fromParis(2026, 11, 9, 0, 0)
    const r2 = resolveTheme({ now: exact, cfg: defaultCfg, weeks, previewCookie: null, isAdmin: false })
    expect(r2.key).toBe('horreur')
  })

  it('le force avec un theme inconnu retombe en neutre', () => {
    const r = resolveTheme({
      now: new Date(),
      cfg: { theme_mode: 'force', theme_force: 'fantaisie' as ThemeKey },
      weeks: [],
      previewCookie: null,
      isAdmin: false,
    })
    expect(r.key).toBe('neutre')
    expect(r.source).toBe('force')
  })
})

describe('nextMondayParis', () => {
  it('renvoie le lundi suivant en heure de Paris', () => {
    const wednesday = fromParis(2026, 10, 7, 15, 0)
    const result = nextMondayParis(wednesday)
    const expected = fromParis(2026, 10, 12, 0, 0)
    expect(result.getTime()).toBe(expected.getTime())
  })

  it('un lundi renvoie le lundi suivant, pas le meme jour', () => {
    const monday = fromParis(2026, 10, 5, 10, 0)
    const result = nextMondayParis(monday)
    const expected = fromParis(2026, 10, 12, 0, 0)
    expect(result.getTime()).toBe(expected.getTime())
  })
})

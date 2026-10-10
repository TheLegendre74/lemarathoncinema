'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import {
  adminSetThemeMode,
  adminSetThemeForce,
  setThemePreview,
  adminSaveSeasonWeeks,
} from '@/lib/themes/actions'
import { READY_THEMES, type ThemeKey, type SeasonWeek, type ResolvedTheme } from '@/lib/themes/types'
import styles from '../admin.module.css'

const THEME_LABELS: Record<ThemeKey, string> = {
  neutre: 'Neutre', action: 'Action', comedie: 'Comedie',
  western: 'Western', horreur: 'Horreur',
}

const SOURCE_LABELS: Record<string, string> = {
  apercu: 'apercu admin', force: 'impose', planning: 'planning', defaut: 'defaut',
}

const THEME_COLORS: Record<ThemeKey, [string, string, string]> = {
  neutre: ['#1a1a1a', '#d4790e', '#e8e0d4'],
  action: ['#ff6b2b', '#1a1a1a', '#fff'],
  comedie: ['#c0392b', '#f7dc6f', '#fdf2e9'],
  western: ['#8b0000', '#d2b48c', '#2d1810'],
  horreur: ['#e8c87a', '#1a0a0a', '#8b0000'],
}

interface Props {
  resolved: ResolvedTheme
  themeMode: string
  themeForce: string
  seasonWeeks: SeasonWeek[]
  saisonNumero: number
  videoclubMode: string
}

export default function ThemeAdminPage({ resolved, themeMode, themeForce, seasonWeeks, saisonNumero, videoclubMode }: Props) {
  const router = useRouter()
  const { addToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [weeks, setWeeks] = useState<SeasonWeek[]>(
    seasonWeeks.filter(w => w.saison === saisonNumero).sort((a, b) => a.semaine - b.semaine)
  )
  const [weeksDirty, setWeeksDirty] = useState(false)

  const weekInfo = resolved.week
    ? `, semaine ${resolved.week.semaine} / ${resolved.week.total}`
    : ''
  const statusLine = `En ce moment : ${THEME_LABELS[resolved.key] ?? resolved.key} — ${SOURCE_LABELS[resolved.source]}${weekInfo}.`

  async function handleForce(theme: ThemeKey) {
    if (busy) return
    if (!confirm(`Tout le site passe en ${THEME_LABELS[theme]}. Chacun le verra au prochain chargement de page.`)) return
    setBusy(true)
    try {
      await adminSetThemeForce(theme)
      addToast(`Enregistre — en ligne. Chacun le verra au prochain chargement de page.`)
      router.refresh()
    } catch (e: any) { addToast(e.message ?? 'Erreur') }
    finally { setBusy(false) }
  }

  async function handleAuto() {
    if (busy) return
    setBusy(true)
    try {
      await adminSetThemeMode('auto')
      addToast('Mode automatique — le planning reprend.')
      router.refresh()
    } catch (e: any) { addToast(e.message ?? 'Erreur') }
    finally { setBusy(false) }
  }

  async function handlePreview(key: ThemeKey | null) {
    if (busy) return
    setBusy(true)
    try {
      await setThemePreview(key)
      addToast(key ? `Apercu : ${THEME_LABELS[key]} — visible par toi seul.` : 'Apercu desactive.')
      router.refresh()
    } catch (e: any) { addToast(e.message ?? 'Erreur') }
    finally { setBusy(false) }
  }

  function addWeek() {
    const lastWeek = weeks[weeks.length - 1]
    const nextSemaine = lastWeek ? lastWeek.semaine + 1 : 1
    if (nextSemaine > 12) { addToast('Maximum 12 semaines'); return }
    let nextDate: string
    if (lastWeek) {
      const d = new Date(lastWeek.date_debut + 'T12:00:00Z')
      d.setDate(d.getDate() + 7)
      nextDate = d.toISOString().slice(0, 10)
    } else {
      const d = new Date()
      const day = d.getDay()
      const diff = day <= 1 ? 1 - day : 8 - day
      d.setDate(d.getDate() + diff)
      nextDate = d.toISOString().slice(0, 10)
    }
    setWeeks([...weeks, { saison: saisonNumero, semaine: nextSemaine, theme: 'action', date_debut: nextDate }])
    setWeeksDirty(true)
  }

  function removeWeek(idx: number) {
    setWeeks(weeks.filter((_, i) => i !== idx))
    setWeeksDirty(true)
  }

  function updateWeek(idx: number, field: keyof SeasonWeek, value: string | number) {
    setWeeks(weeks.map((w, i) => i === idx ? { ...w, [field]: value } : w))
    setWeeksDirty(true)
  }

  async function saveWeeks() {
    if (busy) return
    setBusy(true)
    try {
      await adminSaveSeasonWeeks(weeks.map(w => ({ ...w, saison: saisonNumero })))
      addToast('Planning enregistre — en ligne.')
      setWeeksDirty(false)
      router.refresh()
    } catch (e: any) { addToast(e.message ?? 'Erreur') }
    finally { setBusy(false) }
  }

  function isMonday(dateStr: string): boolean {
    const d = new Date(dateStr + 'T12:00:00Z')
    return d.getUTCDay() === 1
  }

  function formatDateRange(dateStr: string): string {
    const start = new Date(dateStr + 'T12:00:00Z')
    const end = new Date(start.getTime() + 6 * 86400000)
    const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }
    return `du ${start.toLocaleDateString('fr-FR', opts)} au ${end.toLocaleDateString('fr-FR', opts)}`
  }

  return (
    <>
      <h1 className={styles.pageTitle}>Theme & saison</h1>

      <div className={styles.card} style={{ marginBottom: 'var(--sp-6)' }}>
        <p style={{ fontSize: 'var(--fs-3)', margin: 0 }}>{statusLine}</p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {themeMode === 'force' ? 'Imposer un theme' : 'Suivre le planning'} /
          <button className={styles.btn} style={{ marginLeft: 'var(--sp-3)', fontSize: 'var(--fs-1)' }} disabled={busy} onClick={themeMode === 'force' ? handleAuto : () => {}}>
            {themeMode === 'force' ? 'Revenir au planning' : 'Mode actuel : planning'}
          </button>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--sp-4)' }}>
          {READY_THEMES.map(key => {
            const colors = THEME_COLORS[key]
            return (
              <div key={key} className={styles.card} style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
                  {colors.map((c, i) => (
                    <span key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: '1px solid var(--line)' }} />
                  ))}
                </div>
                <div style={{ fontWeight: 700, marginBottom: 'var(--sp-3)', fontSize: 'var(--fs-3)' }}>
                  {THEME_LABELS[key]}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  <button
                    className={styles.btnPrimary}
                    disabled={busy}
                    onClick={() => handleForce(key)}
                    style={{ fontSize: 'var(--fs-1)' }}
                  >
                    Mettre tout le site en {THEME_LABELS[key]}
                  </button>
                  {key !== 'neutre' && (
                    <button
                      className={styles.btn}
                      disabled={busy}
                      onClick={() => handlePreview(key)}
                      style={{ fontSize: 'var(--fs-1)' }}
                    >
                      Apercu pour moi
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Planning — Saison {saisonNumero}</h2>

        {weeks.length === 0 && (
          <p className={styles.empty}>Aucune semaine configuree.</p>
        )}

        {weeks.map((w, idx) => {
          const mondayOk = isMonday(w.date_debut)
          return (
            <div key={idx} className={styles.card} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, minWidth: 60 }}>Semaine {w.semaine}</span>
              <input
                type="date"
                className={styles.input}
                style={{ width: 160 }}
                value={w.date_debut}
                onChange={e => updateWeek(idx, 'date_debut', e.target.value)}
              />
              {!mondayOk && (
                <span style={{ color: 'var(--bad)', fontSize: 'var(--fs-1)', fontWeight: 600 }}>Pas un lundi</span>
              )}
              <select
                className={styles.input}
                style={{ width: 140 }}
                value={w.theme}
                onChange={e => updateWeek(idx, 'theme', e.target.value)}
              >
                {READY_THEMES.filter(k => k !== 'neutre').map(k => (
                  <option key={k} value={k}>{THEME_LABELS[k]}</option>
                ))}
              </select>
              <span style={{ color: 'var(--ink3)', fontSize: 'var(--fs-1)' }}>
                {formatDateRange(w.date_debut)}
              </span>
              <button className={styles.btnDanger} style={{ fontSize: 'var(--fs-1)', marginLeft: 'auto' }} onClick={() => removeWeek(idx)}>
                Supprimer
              </button>
            </div>
          )
        })}

        <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
          <button className={styles.btn} onClick={addWeek} disabled={busy || weeks.length >= 12}>
            Ajouter une semaine
          </button>
          {weeksDirty && (
            <button className={styles.btnPrimary} onClick={saveWeeks} disabled={busy}>
              Enregistrer le planning
            </button>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Videoclub</h2>
        <p style={{ fontSize: 'var(--fs-2)', color: 'var(--ink2)' }}>
          Mode actuel : <strong>{videoclubMode === 'bientot' ? 'Bientot' : videoclubMode === 'cache' ? 'Cache' : videoclubMode}</strong>
        </p>
      </div>
    </>
  )
}

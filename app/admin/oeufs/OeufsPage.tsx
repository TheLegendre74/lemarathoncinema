'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import { adminSetConfig } from '@/lib/actions'
import styles from '../admin.module.css'

const EGGS: Array<{ id: string; num: number; name: string; category: string }> = [
  { id: 'matrix', num: 1, name: 'La Pilule Rouge', category: 'Clavier' },
  { id: 'joker', num: 2, name: 'Why So Serious?', category: 'Clavier' },
  { id: 'marvin', num: 3, name: 'La Reponse Universelle', category: 'Clavier' },
  { id: 'hal', num: 4, name: 'Je suis desole, Dave', category: 'Clavier' },
  { id: 'nolan', num: 5, name: 'Le Maitre des Reves', category: 'Clavier' },
  { id: 'bond', num: 6, name: 'Bond, James Bond', category: 'Clavier' },
  { id: 'noctambule', num: 7, name: 'Le Noctambule', category: 'Heure' },
  { id: 'randy', num: 8, name: 'Randy Marsh', category: 'Clavier' },
  { id: 'tars', num: 9, name: 'TARS', category: 'Heure' },
  { id: 'kenny', num: 10, name: 'Oh My God!', category: 'Clavier' },
  { id: 'inception', num: 11, name: 'Inception', category: 'Action' },
  { id: 'parrain', num: 12, name: 'Le Parrain', category: 'Action' },
  { id: 'dundun', num: 13, name: 'DUN DUN', category: 'Action' },
  { id: 'rageux', num: 14, name: 'Le Rageux', category: 'Forum' },
  { id: 'facehugger', num: 15, name: 'Le Facehugger', category: 'Forum' },
  { id: 'fightclub', num: 16, name: 'Fight Club', category: 'Jeu' },
  { id: 'killbill', num: 17, name: 'Kill Bill', category: 'Jeu' },
  { id: 'conway', num: 18, name: 'La Guerre des Mondes', category: 'Clavier' },
  { id: 'southpark', num: 19, name: 'South Park', category: 'Clavier' },
  { id: 'pandora', num: 20, name: 'La Boite de Pandore', category: 'Action' },
  { id: 'jaws', num: 21, name: 'Les Dents de la Mer', category: 'Action' },
  { id: 'cinemon', num: 22, name: 'Cinemon', category: 'Jeu' },
  { id: 'clippy', num: 23, name: 'Clippy', category: 'Jeu' },
  { id: 'fever_night', num: 24, name: 'Fever Night', category: 'Succes' },
  { id: 'completionist', num: 25, name: 'Le Completionniste', category: 'Succes' },
  { id: 'theme-action-voiture', num: 26, name: 'La Voiture', category: 'Theme — Action' },
  { id: 'theme-action-nakatomi', num: 27, name: 'Nakatomi', category: 'Theme — Action' },
  { id: 'theme-comedie-vert', num: 28, name: 'Le Vert', category: 'Theme — Comedie' },
  { id: 'theme-comedie-blanquette', num: 29, name: 'La Blanquette', category: 'Theme — Comedie' },
  { id: 'theme-comedie-hyene', num: 30, name: "L'Hyene", category: 'Theme — Comedie' },
  { id: 'theme-western-mouche', num: 31, name: 'La Mouche', category: 'Theme — Western' },
  { id: 'theme-western-404', num: 32, name: 'La 404', category: 'Theme — Western' },
  { id: 'theme-western-duel', num: 33, name: "L'Heure du Duel", category: 'Theme — Western' },
  { id: 'theme-horreur-ballon', num: 34, name: 'Le Ballon Rouge', category: 'Theme — Horreur' },
  { id: 'theme-horreur-possession', num: 35, name: 'La Possession', category: 'Theme — Horreur' },
  { id: 'theme-horreur-cercle', num: 36, name: 'Le Cercle', category: 'Theme — Horreur' },
  { id: 'theme-horreur-apparition', num: 37, name: "L'Apparition", category: 'Theme — Horreur' },
]

const SUCCES_IDS = new Set(['fever_night', 'completionist'])

const EGG_TEXT_KEYS: Record<string, string[]> = {
  matrix: ['matrix_line1', 'matrix_line2', 'matrix_line3'],
  tars: ['tars_line1', 'tars_line2'],
  marvin: ['marvin_line1', 'marvin_line2'],
  hal: ['hal_line1', 'hal_line2'],
  noctambule: ['noctam_line1', 'noctam_line2'],
  kenny: ['kenny_text1', 'kenny_text2'],
  randy: ['randy_quote'],
  nolan: ['nolan_quote'],
}

interface Props {
  eggCounts: Record<string, number>
  eggsDisabled: string[]
  siteConfig: Record<string, string>
  tipiakLinks: Array<{ label: string; url: string }>
  clippyReplies: string[]
}

export default function OeufsPage({ eggCounts, eggsDisabled, siteConfig, tipiakLinks: initialTipiak, clippyReplies: initialClippy }: Props) {
  const router = useRouter()
  const { addToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [disabled, setDisabled] = useState(new Set(eggsDisabled))
  const [disabledDirty, setDisabledDirty] = useState(false)

  const [textVals, setTextVals] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const keys of Object.values(EGG_TEXT_KEYS)) {
      for (const k of keys) m[k] = siteConfig[k] ?? ''
    }
    return m
  })
  const [textDirty, setTextDirty] = useState(false)

  const [tipiakLinks, setTipiakLinks] = useState(initialTipiak)
  const [tipiakLabel, setTipiakLabel] = useState('')
  const [tipiakUrl, setTipiakUrl] = useState('')
  const [tipiakDirty, setTipiakDirty] = useState(false)

  const [clippyReplies, setClippyReplies] = useState(initialClippy)
  const [clippyNew, setClippyNew] = useState('')
  const [clippyDirty, setClippyDirty] = useState(false)

  function toggleEgg(id: string) {
    const next = new Set(disabled)
    if (next.has(id)) next.delete(id); else next.add(id)
    setDisabled(next)
    setDisabledDirty(true)
  }

  async function saveDisabled() {
    setBusy(true)
    const r = await adminSetConfig({ eggs_disabled: JSON.stringify([...disabled]) })
    if (r.error) addToast(r.error)
    else { addToast('Interrupteurs enregistres — en ligne.'); setDisabledDirty(false); router.refresh() }
    setBusy(false)
  }

  async function saveTexts() {
    setBusy(true)
    const r = await adminSetConfig(textVals)
    if (r.error) addToast(r.error)
    else { addToast('Textes enregistres — en ligne.'); setTextDirty(false); router.refresh() }
    setBusy(false)
  }

  async function saveTipiak() {
    setBusy(true)
    const r = await adminSetConfig({ TIPIAK_LINKS: JSON.stringify(tipiakLinks) })
    if (r.error) addToast(r.error)
    else { addToast('Liens Tipiak enregistres — en ligne.'); setTipiakDirty(false); router.refresh() }
    setBusy(false)
  }

  async function saveClippy() {
    setBusy(true)
    const r = await adminSetConfig({ CLIPPY_REPLIES: JSON.stringify(clippyReplies) })
    if (r.error) addToast(r.error)
    else { addToast('Repliques Clippy enregistrees — en ligne.'); setClippyDirty(false); router.refresh() }
    setBusy(false)
  }

  return (
    <>
      <h1 className={styles.pageTitle}>Oeufs</h1>

      {/* Tableau des oeufs */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Tous les oeufs ({EGGS.length})</h2>
        <div className={styles.card}>
          {EGGS.map(egg => {
            const isSuccess = SUCCES_IDS.has(egg.id)
            const isOff = disabled.has(egg.id)
            return (
              <div key={egg.id} className={styles.row} style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                <span style={{ minWidth: 30, fontSize: 'var(--fs-1)', color: 'var(--ink3)' }}>#{egg.num}</span>
                <span style={{ flex: 1, minWidth: 160, fontWeight: 600 }}>{egg.name}</span>
                <span style={{ fontSize: 'var(--fs-0)', color: 'var(--ink3)', minWidth: 120 }}>{egg.category}</span>
                <span style={{ fontSize: 'var(--fs-0)', color: 'var(--ink2)', minWidth: 60 }}>{eggCounts[egg.id] ?? 0} trouves</span>
                {!isSuccess && (
                  <button
                    className={isOff ? styles.btnDanger : styles.btn}
                    style={{ fontSize: 'var(--fs-0)', minWidth: 60 }}
                    onClick={() => toggleEgg(egg.id)}
                  >
                    {isOff ? 'Coupe' : 'Actif'}
                  </button>
                )}
                {isSuccess && <span style={{ fontSize: 'var(--fs-0)', color: 'var(--ink3)' }}>Calcule</span>}
              </div>
            )
          })}
        </div>
        {disabledDirty && (
          <button className={styles.btnPrimary} disabled={busy} onClick={saveDisabled}>
            Enregistrer les interrupteurs
          </button>
        )}
      </div>

      {/* Textes des oeufs */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Textes des oeufs</h2>
        <div className={styles.card}>
          {Object.entries(EGG_TEXT_KEYS).map(([eggId, keys]) => {
            const egg = EGGS.find(e => e.id === eggId)
            return (
              <div key={eggId} style={{ marginBottom: 'var(--sp-4)' }}>
                <div className={styles.label}>{egg?.name ?? eggId}</div>
                {keys.map(k => (
                  <div key={k} style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
                    <span style={{ fontSize: 'var(--fs-0)', color: 'var(--ink3)', minWidth: 100 }}>{k}</span>
                    <input
                      className={styles.input}
                      value={textVals[k] ?? ''}
                      onChange={e => { setTextVals(v => ({ ...v, [k]: e.target.value })); setTextDirty(true) }}
                    />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
        {textDirty && (
          <button className={styles.btnPrimary} disabled={busy} onClick={saveTexts}>
            Enregistrer les textes
          </button>
        )}
      </div>

      {/* Clippy */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Clippy — repliques personnalisees</h2>
        <div className={styles.card}>
          {clippyReplies.map((r, i) => (
            <div key={i} className={styles.row}>
              <span style={{ flex: 1, fontSize: 'var(--fs-1)' }}>{r}</span>
              <button className={styles.btnDanger} style={{ fontSize: 'var(--fs-0)' }} onClick={() => {
                setClippyReplies(clippyReplies.filter((_, j) => j !== i))
                setClippyDirty(true)
              }}>Retirer</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
            <input className={styles.input} placeholder="Nouvelle replique..." value={clippyNew} onChange={e => setClippyNew(e.target.value)} />
            <button className={styles.btn} onClick={() => {
              if (!clippyNew.trim()) return
              setClippyReplies([...clippyReplies, clippyNew.trim()])
              setClippyNew('')
              setClippyDirty(true)
            }}>Ajouter</button>
          </div>
        </div>
        {clippyDirty && (
          <button className={styles.btnPrimary} disabled={busy} onClick={saveClippy}>
            Enregistrer les repliques
          </button>
        )}
      </div>

      {/* Tipiak */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Liens Tipiak</h2>
        <div className={styles.card}>
          {tipiakLinks.map((l, i) => (
            <div key={i} className={styles.row}>
              <span style={{ flex: 1, fontSize: 'var(--fs-1)' }}>{l.label} — {l.url}</span>
              <button className={styles.btnDanger} style={{ fontSize: 'var(--fs-0)' }} onClick={() => {
                setTipiakLinks(tipiakLinks.filter((_, j) => j !== i))
                setTipiakDirty(true)
              }}>Retirer</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
            <input className={styles.input} style={{ flex: 1 }} placeholder="Libelle" value={tipiakLabel} onChange={e => setTipiakLabel(e.target.value)} />
            <input className={styles.input} style={{ flex: 2 }} placeholder="URL" value={tipiakUrl} onChange={e => setTipiakUrl(e.target.value)} />
            <button className={styles.btn} onClick={() => {
              if (!tipiakLabel.trim() || !tipiakUrl.trim()) return
              setTipiakLinks([...tipiakLinks, { label: tipiakLabel.trim(), url: tipiakUrl.trim() }])
              setTipiakLabel(''); setTipiakUrl('')
              setTipiakDirty(true)
            }}>Ajouter</button>
          </div>
        </div>
        {tipiakDirty && (
          <button className={styles.btnPrimary} disabled={busy} onClick={saveTipiak}>
            Enregistrer les liens
          </button>
        )}
      </div>
    </>
  )
}

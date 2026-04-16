'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adminCreateDuel, adminCloseDuel, adminSetWeekFilm, adminDeleteFilm, adminDeleteUser, adminGrantExp, adminCleanDuels, adminApproveFlaggedFilm, adminBatchFlaggedDecisions, adminSet18Flag, adminApproveAllPending, adminSetFilmCategory, adminFetchFilmPoster, adminUploadFilmPoster, adminRefreshMissingPosters, adminForceRefreshAllPosters, adminFetchFrenchPosters, adminScanAgeRestrictions, adminTestFilmCertification, adminDiagnostic, updateFilm, adminResolveReport, adminSetConfig, adminVerifyPosters, adminSetAdmin, adminAddNews, adminDeleteNews, adminAddRecommendation, adminDeleteRecommendation, deleteForumTopic, adminEndSeason, adminApproveFilmRequest, adminRejectFilmRequest, adminFetchOverviews, adminReviewMarathonRequest } from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'
import { CONFIG } from '@/lib/config'
import type { Film, Profile } from '@/lib/supabase/types'
import type { ServerConfig } from '@/lib/serverConfig'
import { DEFAULT_RULES, type RuleCard } from '@/lib/rules'

// ─── RULES EDITOR ────────────────────────────────────────────────────────────
function RulesEditor({ value, inputStyle }: {
  value: string
  inputStyle: React.CSSProperties
}) {
  const { addToast } = useToast()
  const [cards, setCards] = useState<RuleCard[]>(() => {
    try { const p = JSON.parse(value); return Array.isArray(p) && p.length > 0 ? p : [...DEFAULT_RULES] }
    catch { return [...DEFAULT_RULES] }
  })
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function update(i: number, patch: Partial<RuleCard>) {
    setCards(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c))
    setSaved(false)
  }

  function addCard() {
    setCards(prev => {
      const next = [...prev, { emoji: '📌', title: 'Nouvelle section', text: '' }]
      setOpenIdx(next.length - 1)
      return next
    })
    setSaved(false)
  }

  function remove(i: number) {
    setCards(prev => prev.filter((_, idx) => idx !== i))
    if (openIdx === i) setOpenIdx(null)
    setSaved(false)
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    setCards(prev => {
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setOpenIdx(j)
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const json = JSON.stringify(cards)
    const err = await adminSetConfig({ MARATHON_RULES: json })
    setSaving(false)
    if (err) { addToast('Erreur sauvegarde', 'error'); return }
    setSaved(true)
    addToast('✅ Règles sauvegardées ! La page d\'accueil est mise à jour.', 'success')
  }

  const ta: React.CSSProperties = { ...inputStyle, resize: 'vertical', minHeight: 60 }

  return (
    <div>
      {cards.map((c, i) => (
        <div key={i} style={{ border: '1px solid var(--border2)', borderRadius: 'var(--r)', marginBottom: '.5rem', overflow: 'hidden' }}>
          {/* Header bar */}
          <div
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.5rem .75rem', background: 'var(--bg3)', cursor: 'pointer', userSelect: 'none' }}
          >
            <span style={{ fontSize: '1rem' }}>{c.emoji}</span>
            <span style={{ flex: 1, fontSize: '.82rem', fontWeight: 500, color: 'var(--text2)' }}>{c.title || '(sans titre)'}</span>
            <span style={{ fontSize: '.65rem', color: 'var(--text3)', marginRight: '.3rem' }}>{openIdx === i ? '▲' : '▼'}</span>
            <button onClick={e => { e.stopPropagation(); move(i, -1) }} disabled={i === 0}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '.75rem', padding: '0 3px' }}>↑</button>
            <button onClick={e => { e.stopPropagation(); move(i, 1) }} disabled={i === cards.length - 1}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '.75rem', padding: '0 3px' }}>↓</button>
            <button onClick={e => { e.stopPropagation(); if (confirm(`Supprimer "${c.title}" ?`)) remove(i) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '.75rem', padding: '0 3px' }}>✕</button>
          </div>
          {/* Edit fields */}
          {openIdx === i && (
            <div style={{ padding: '.75rem', display: 'flex', flexDirection: 'column', gap: '.5rem', background: 'var(--bg2)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '.4rem' }}>
                <div>
                  <label style={{ fontSize: '.65rem', color: 'var(--text3)', display: 'block', marginBottom: '.15rem' }}>Emoji</label>
                  <input value={c.emoji} onChange={e => update(i, { emoji: e.target.value })} style={inputStyle} maxLength={4} />
                </div>
                <div>
                  <label style={{ fontSize: '.65rem', color: 'var(--text3)', display: 'block', marginBottom: '.15rem' }}>Titre</label>
                  <input value={c.title} onChange={e => update(i, { title: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '.65rem', color: 'var(--text3)', display: 'block', marginBottom: '.15rem' }}>
                  Texte principal <span style={{ opacity: .5 }}>({'{EXP_FILM}'}, {'{SEANCE_JOUR}'}, etc.)</span>
                </label>
                <textarea value={c.text ?? ''} onChange={e => update(i, { text: e.target.value })} style={ta} />
              </div>
              <div>
                <label style={{ fontSize: '.65rem', color: 'var(--text3)', display: 'block', marginBottom: '.15rem' }}>
                  Intro liste <span style={{ opacity: .5 }}>(texte avant les puces)</span>
                </label>
                <input value={c.intro ?? ''} onChange={e => update(i, { intro: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '.65rem', color: 'var(--text3)', display: 'block', marginBottom: '.15rem' }}>
                  Liste à puces <span style={{ opacity: .5 }}>(une entrée par ligne)</span>
                </label>
                <textarea
                  value={(c.list ?? []).join('\n')}
                  onChange={e => update(i, { list: e.target.value.split('\n').filter(Boolean) })}
                  style={ta}
                  placeholder="Item 1&#10;Item 2&#10;Item 3"
                />
              </div>
              <div>
                <label style={{ fontSize: '.65rem', color: 'var(--text3)', display: 'block', marginBottom: '.15rem' }}>
                  Texte après la liste
                </label>
                <input value={c.after ?? ''} onChange={e => update(i, { after: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '.65rem', color: 'var(--text3)', display: 'block', marginBottom: '.15rem' }}>
                  Tableau <span style={{ opacity: .5 }}>(une ligne : "Libellé | Valeur")</span>
                </label>
                <textarea
                  value={(c.table ?? []).map(r => r.join(' | ')).join('\n')}
                  onChange={e => {
                    const rows = e.target.value.split('\n').filter(Boolean).map(l => {
                      const sep = l.indexOf(' | ')
                      return sep >= 0 ? [l.slice(0, sep), l.slice(sep + 3)] as [string, string] : [l, ''] as [string, string]
                    })
                    update(i, { table: rows })
                  }}
                  style={ta}
                  placeholder="Regarder un film | +5 EXP&#10;Voter dans un duel | +2 EXP"
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Ajouter + Sauvegarder */}
      <div style={{ display: 'flex', gap: '.5rem', marginTop: '.3rem' }}>
        <button
          onClick={addCard}
          style={{ ...inputStyle, border: '1px dashed var(--border2)', cursor: 'pointer', padding: '.5rem', flex: 1, color: 'var(--text3)', fontSize: '.8rem', textAlign: 'center' }}
        >
          + Ajouter une section
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-gold"
          style={{ padding: '.5rem 1.2rem', fontSize: '.82rem', whiteSpace: 'nowrap' }}
        >
          {saving ? '…' : saved ? '✅ Sauvegardé' : '💾 Sauvegarder les règles'}
        </button>
      </div>
      <div style={{ fontSize: '.62rem', color: 'var(--text3)', marginTop: '.5rem', lineHeight: 1.5 }}>
        Variables : <code>{'{EXP_FILM}'}</code> <code>{'{EXP_FDLS}'}</code> <code>{'{EXP_DUEL_WIN}'}</code> <code>{'{EXP_VOTE}'}</code> <code>{'{SEANCE_JOUR}'}</code> <code>{'{SEANCE_HEURE}'}</code> <code>{'{FDLS_JOUR}'}</code> <code>{'{FDLS_HEURE}'}</code>
      </div>
    </div>
  )
}

// ─── CONFIG SECTION ──────────────────────────────────────────────────────────
function ConfigSection({ serverConfig, siteConfig, onSave, saving }: {
  serverConfig: ServerConfig
  siteConfig: Record<string, string>
  onSave: (c: Record<string, string>) => Promise<void>
  saving: boolean
}) {
  const cfg = serverConfig
  const [vals, setVals] = useState<Record<string, string>>({
    marathon_start:    siteConfig.marathon_start    ?? cfg.MARATHON_START.toISOString().slice(0, 16),
    saison_numero:     siteConfig.saison_numero     ?? String(cfg.SAISON_NUMERO),
    saison_label:      siteConfig.saison_label      ?? cfg.SAISON_LABEL,
    seance_jour:       siteConfig.seance_jour       ?? cfg.SEANCE_JOUR,
    seance_heure:      siteConfig.seance_heure      ?? cfg.SEANCE_HEURE,
    fdls_jour:         siteConfig.fdls_jour         ?? cfg.FDLS_JOUR,
    fdls_heure:        siteConfig.fdls_heure        ?? cfg.FDLS_HEURE,
    seuil_majority:    siteConfig.seuil_majority    ?? String(cfg.SEUIL_MAJORITY),
    exp_film:          siteConfig.exp_film          ?? String(cfg.EXP_FILM),
    exp_fdls:          siteConfig.exp_fdls          ?? String(cfg.EXP_FDLS),
    exp_duel_win:      siteConfig.exp_duel_win      ?? String(cfg.EXP_DUEL_WIN),
    exp_vote:          siteConfig.exp_vote          ?? String(cfg.EXP_VOTE),
    accueil_sous_titre: siteConfig.accueil_sous_titre ?? cfg.ACCUEIL_SOUS_TITRE,
    matrix_line1:      siteConfig.matrix_line1      ?? cfg.MATRIX_LINE1,
    matrix_line2:      siteConfig.matrix_line2      ?? cfg.MATRIX_LINE2,
    matrix_line3:      siteConfig.matrix_line3      ?? cfg.MATRIX_LINE3,
    joker_phrase:      siteConfig.joker_phrase      ?? cfg.JOKER_PHRASE,
    tars_line1:        siteConfig.tars_line1        ?? cfg.TARS_LINE1,
    tars_line2:        siteConfig.tars_line2        ?? cfg.TARS_LINE2,
    marvin_line1:      siteConfig.marvin_line1      ?? cfg.MARVIN_LINE1,
    marvin_line2:      siteConfig.marvin_line2      ?? cfg.MARVIN_LINE2,
    hal_line1:         siteConfig.hal_line1         ?? cfg.HAL_LINE1,
    hal_line2:         siteConfig.hal_line2         ?? cfg.HAL_LINE2,
    nolan_quote:       siteConfig.nolan_quote       ?? cfg.NOLAN_QUOTE,
    bond_line:         siteConfig.bond_line         ?? cfg.BOND_LINE,
    noctam_line1:      siteConfig.noctam_line1      ?? cfg.NOCTAM_LINE1,
    noctam_line2:      siteConfig.noctam_line2      ?? cfg.NOCTAM_LINE2,
    kenny_text1:       siteConfig.kenny_text1       ?? cfg.KENNY_TEXT1,
    kenny_text2:       siteConfig.kenny_text2       ?? cfg.KENNY_TEXT2,
    randy_quote:       siteConfig.randy_quote       ?? cfg.RANDY_QUOTE,
    fightclub_gameover: siteConfig.fightclub_gameover ?? cfg.FIGHTCLUB_GAMEOVER,
    killbill_end:      siteConfig.killbill_end      ?? cfg.KILLBILL_END,
    MARATHON_RULES:    siteConfig.MARATHON_RULES    ?? cfg.MARATHON_RULES ?? JSON.stringify(DEFAULT_RULES, null, 2),
  })

  const f = (key: string) => ({
    value: vals[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setVals(v => ({ ...v, [key]: e.target.value })),
  })

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)',
    borderRadius: 'var(--r)', padding: '.5rem .75rem', color: 'var(--text)',
    fontFamily: 'var(--font-body)', fontSize: '.83rem',
  }
  const Sub = ({ label }: { label: string }) => (
    <div style={{ fontSize: '.62rem', color: 'var(--text3)', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '.9rem 0 .4rem' }}>{label}</div>
  )

  return (
    <div style={{ background: 'rgba(232,90,90,.04)', border: '1px solid rgba(232,90,90,.18)', borderRadius: 'var(--rl)', padding: '1.3rem', marginBottom: '1.2rem' }}>
      <div style={{ fontSize: '.68rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '1rem' }}>
        ⚙️ Configuration du site
      </div>
      <div style={{ fontSize: '.75rem', color: 'var(--text3)', marginBottom: '1rem', lineHeight: 1.5 }}>
        Ces réglages écrasent les variables d'environnement sans redéploiement.
      </div>

      <Sub label="Marathon" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
        <div><label style={{ fontSize: '.72rem', color: 'var(--text2)', display: 'block', marginBottom: '.2rem' }}>Date de lancement</label>
          <input type="datetime-local" style={inputStyle} {...f('marathon_start')} /></div>
        <div><label style={{ fontSize: '.72rem', color: 'var(--text2)', display: 'block', marginBottom: '.2rem' }}>Saison n°</label>
          <input type="number" style={inputStyle} {...f('saison_numero')} min="1" /></div>
      </div>
      <div style={{ marginTop: '.5rem' }}><label style={{ fontSize: '.72rem', color: 'var(--text2)', display: 'block', marginBottom: '.2rem' }}>Label saison</label>
        <input style={inputStyle} {...f('saison_label')} placeholder="Saison 1 · 2026" /></div>

      <Sub label="Séances" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '.6rem' }}>
        {[['Jour séance', 'seance_jour'], ['Heure séance', 'seance_heure'], ['Jour FDLS', 'fdls_jour'], ['Heure FDLS', 'fdls_heure']].map(([label, key]) => (
          <div key={key}><label style={{ fontSize: '.72rem', color: 'var(--text2)', display: 'block', marginBottom: '.2rem' }}>{label}</label>
            <input style={inputStyle} {...f(key)} /></div>
        ))}
      </div>

      <Sub label="EXP & seuils" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '.6rem' }}>
        {[['EXP film', 'exp_film'], ['EXP FDLS', 'exp_fdls'], ['EXP duel', 'exp_duel_win'], ['EXP vote', 'exp_vote'], ['Seuil %', 'seuil_majority']].map(([label, key]) => (
          <div key={key}><label style={{ fontSize: '.72rem', color: 'var(--text2)', display: 'block', marginBottom: '.2rem' }}>{label}</label>
            <input type="number" style={inputStyle} {...f(key)} /></div>
        ))}
      </div>

      <Sub label="Phrase d'accueil (sous-titre du site)" />
      <input style={inputStyle} {...f('accueil_sous_titre')} />

      <Sub label="Règles du jeu (page d'accueil — synchronisées en temps réel)" />
      <RulesEditor
        value={vals['MARATHON_RULES'] ?? JSON.stringify(DEFAULT_RULES, null, 2)}
        inputStyle={inputStyle}
      />

      <Sub label="Easter eggs — Matrix (taper 'red pill')" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        {[['Ligne 1', 'matrix_line1'], ['Ligne 2', 'matrix_line2'], ['Ligne 3', 'matrix_line3']].map(([label, key]) => (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{label}</span>
            <input style={inputStyle} {...f(key)} />
          </div>
        ))}
      </div>

      <Sub label="Easter eggs — Joker (Konami code)" />
      <input style={inputStyle} {...f('joker_phrase')} />

      <Sub label="Easter eggs — TARS (à 14:07)" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        {[['Ligne 1', 'tars_line1'], ['Citation', 'tars_line2']].map(([label, key]) => (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{label}</span>
            <input style={inputStyle} {...f(key)} />
          </div>
        ))}
      </div>

      <Sub label="Easter eggs — Marvin (taper '42')" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        {[['Ligne 1', 'marvin_line1'], ['Ligne 2', 'marvin_line2']].map(([label, key]) => (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{label}</span>
            <input style={inputStyle} {...f(key)} />
          </div>
        ))}
      </div>

      <Sub label="Easter eggs — HAL 9000 (taper 'hal')" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        {[['Ligne 1', 'hal_line1'], ['Ligne 2', 'hal_line2']].map(([label, key]) => (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{label}</span>
            <input style={inputStyle} {...f(key)} />
          </div>
        ))}
      </div>

      <Sub label="Easter eggs — Nolan (taper 'nolan')" />
      <input style={inputStyle} {...f('nolan_quote')} />

      <Sub label="Easter eggs — Bond (taper 'bond')" />
      <input style={inputStyle} {...f('bond_line')} />

      <Sub label="Easter eggs — Noctambule (minuit–00h30)" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        {[['Ligne 1', 'noctam_line1'], ['Ligne 2', 'noctam_line2']].map(([label, key]) => (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{label}</span>
            <input style={inputStyle} {...f(key)} />
          </div>
        ))}
      </div>

      <Sub label="Easter eggs — Kenny (taper 'kill kenny')" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        {[['Texte 1', 'kenny_text1'], ['Texte 2', 'kenny_text2']].map(([label, key]) => (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{label}</span>
            <input style={inputStyle} {...f(key)} />
          </div>
        ))}
      </div>

      <Sub label="Easter eggs — Randy (taper 'randy')" />
      <input style={inputStyle} {...f('randy_quote')} />

      <Sub label="Easter eggs — Fight Club (taper 'tyler') — texte game over" />
      <input style={inputStyle} {...f('fightclub_gameover')} />

      <Sub label="Easter eggs — Kill Bill (taper 'kill bill') — texte victoire" />
      <input style={inputStyle} {...f('killbill_end')} />

      <button
        className="btn btn-gold"
        style={{ width: '100%', marginTop: '1.1rem' }}
        disabled={saving}
        onClick={() => onSave(vals)}
      >
        {saving ? '…' : '💾 Sauvegarder la configuration'}
      </button>
    </div>
  )
}

const GENRES = ['Action','Animation','Aventure','Comédie','Crime','Drame','Fantaisie','Guerre','Horreur','Policier','SF','Thriller','Western']

function EditFilmModal({ film, onClose, onSave }: {
  film: Film
  onClose: () => void
  onSave: (updates: { titre?: string; annee?: number; realisateur?: string; genre?: string; sousgenre?: string | null; poster?: string | null; saison?: number }) => Promise<boolean>
}) {
  const [titre, setTitre] = useState(film.titre)
  const [annee, setAnnee] = useState(String(film.annee))
  const [realisateur, setRealisateur] = useState(film.realisateur)
  const [genre, setGenre] = useState(film.genre)
  const [sousgenre, setSousgenre] = useState(film.sousgenre ?? '')
  const [poster, setPoster] = useState(film.poster ?? '')
  const [saison, setSaison] = useState(String(film.saison))
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setLoading(true)
    const ok = await onSave({
      titre: titre.trim(),
      annee: parseInt(annee),
      realisateur: realisateur.trim(),
      genre,
      sousgenre: sousgenre.trim() || null,
      poster: poster.trim() || null,
      saison: parseInt(saison),
    })
    setLoading(false)
    if (!ok) setErr('Une erreur est survenue.')
  }

  const fieldStyle: React.CSSProperties = { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.55rem .8rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.88rem' }

  return (
    <div className="modal-wrap" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div style={{ padding: '2rem 1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '1.2rem' }}>
            ✏️ Modifier — {film.titre}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="field"><label>Titre</label><input style={fieldStyle} value={titre} onChange={e => setTitre(e.target.value)} required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.7rem' }}>
              <div className="field"><label>Année</label><input style={fieldStyle} type="number" value={annee} onChange={e => setAnnee(e.target.value)} min="1888" max="2030" required /></div>
              <div className="field">
                <label>Saison</label>
                <select style={fieldStyle} value={saison} onChange={e => setSaison(e.target.value)}>
                  <option value="1">Saison 1</option>
                  <option value="2">Saison 2</option>
                </select>
              </div>
            </div>
            <div className="field"><label>Réalisateur</label><input style={fieldStyle} value={realisateur} onChange={e => setRealisateur(e.target.value)} required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.7rem' }}>
              <div className="field">
                <label>Genre</label>
                <select style={fieldStyle} value={genre} onChange={e => setGenre(e.target.value)}>
                  {GENRES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="field"><label>Sous-genre</label><input style={fieldStyle} value={sousgenre} onChange={e => setSousgenre(e.target.value)} placeholder="Optionnel" /></div>
            </div>
            <div className="field"><label>URL Affiche</label><input style={fieldStyle} value={poster} onChange={e => setPoster(e.target.value)} placeholder="https://image.tmdb.org/..." /></div>
            {err && <div style={{ color: 'var(--red)', fontSize: '.78rem', marginBottom: '.6rem' }}>{err}</div>}
            <div style={{ display: 'flex', gap: '.7rem', marginTop: '.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Annuler</button>
              <button type="submit" className="btn btn-gold" disabled={loading} style={{ flex: 1 }}>{loading ? '…' : 'Enregistrer'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(232,90,90,.04)', border: '1px solid rgba(232,90,90,.18)', borderRadius: 'var(--rl)', padding: '1.3rem', marginBottom: '1.2rem' }}>
      <div style={{ fontSize: '.68rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '1rem' }}>
        {icon} {title}
      </div>
      {children}
    </div>
  )
}

interface Props {
  profile: Profile
  films: Film[]
  users: any[]
  duels: any[]
  weekFilm: any
  totalUsers: number
  watchCountMap: Record<number, number>
  flaggedFilms: Film[]
  pendingFilms18: Film[]
  pendingApprovalFilms: any[]
  reports: any[]
  siteConfig: Record<string, string>
  serverConfig: ServerConfig
  news: any[]
  recommendations: any[]
  forumTopics: any[]
  marathonRequests: any[]
}

export default function AdminClient({ profile, films, users, duels, weekFilm, totalUsers, watchCountMap, flaggedFilms, pendingFilms18, pendingApprovalFilms, reports, siteConfig, serverConfig, news, recommendations, forumTopics, marathonRequests: initialMarathonRequests }: Props) {
  const { addToast } = useToast()
  const router = useRouter()
  const [posterLoading, setPosterLoading] = useState<Record<number, boolean>>({})
  const [editFilm, setEditFilm] = useState<Film | null>(null)
  const [allPostersNextId, setAllPostersNextId] = useState<number | null>(0)
  const [allPostersRunning, setAllPostersRunning] = useState(false)
  const [autoRunning, setAutoRunning] = useState(false)
  const [autoProgress, setAutoProgress] = useState('')
  const [frenchPostersNextId, setFrenchPostersNextId] = useState<number | null>(0)
  const [frenchPostersRunning, setFrenchPostersRunning] = useState(false)
  const [ageScanNextId, setAgeScanNextId] = useState<number | null>(0)
  const [ageScanRunning, setAgeScanRunning] = useState(false)
  const [ageScanDetails, setAgeScanDetails] = useState<Array<{ id: number; titre: string; tmdbId: number | null; flagged18: boolean; flagged16: boolean; certs: Record<string, string>; status: string }> | null>(null)
  const [ageScanDone, setAgeScanDone] = useState(false)
  const [ageScanError, setAgeScanError] = useState<string | null>(null)
  const [diagResult, setDiagResult] = useState<any>(null)
  const [diagLoading, setDiagLoading] = useState(false)
  const [flag18Saving, setFlag18Saving] = useState<Record<number, boolean>>({})
  const [localPending, setLocalPending] = useState<Film[]>(flaggedFilms)
  const [localPendingApproval, setLocalPendingApproval] = useState<any[]>(pendingApprovalFilms)
  const [approvalLoading, setApprovalLoading] = useState<Record<number, boolean>>({})
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set())
  const [approveAllLoading, setApproveAllLoading] = useState(false)
  const [testFilmId, setTestFilmId] = useState('')
  const [testResult, setTestResult] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [marathonRequests, setMarathonRequests] = useState<any[]>(initialMarathonRequests)
  const [marathonReviewLoading, setMarathonReviewLoading] = useState<Record<string, boolean>>({})

  // Sync avec flaggedFilms après router.refresh(), en excluant les films déjà traités
  useEffect(() => {
    setLocalPending(prev => {
      const refreshed = flaggedFilms.filter(f => !reviewedIds.has(f.id))
      return refreshed
    })
  }, [flaggedFilms])
  const [brokenPosters, setBrokenPosters] = useState<{ id: number; titre: string; poster: string }[]>([])
  const [verifyNextId, setVerifyNextId] = useState<number | null>(0)
  const [verifyRunning, setVerifyRunning] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [manualFilm1, setManualFilm1] = useState('')
  const [manualFilm2, setManualFilm2] = useState('')
  const [newsTitle, setNewsTitle] = useState('')
  const [newsContent, setNewsContent] = useState('')
  const [newsPinned, setNewsPinned] = useState(false)
  const [recoNiveau, setRecoNiveau] = useState<'debutant'|'intermediaire'|'confirme'>('debutant')
  const [recoTitre, setRecoTitre] = useState('')
  const [recoAnnee, setRecoAnnee] = useState('')
  const [recoReal, setRecoReal] = useState('')
  const [recoDesc, setRecoDesc] = useState('')
  const [tipiakLabel, setTipiakLabel] = useState('')
  const [tipiakUrl, setTipiakUrl] = useState('')
  const [tipiakLinks, setTipiakLinks] = useState<{label:string;url:string}[]>(
    (() => { try { return JSON.parse(siteConfig['TIPIAK_LINKS'] ?? '[]') } catch { return [] } })()
  )
  const [clippyReplies, setClippyReplies] = useState<string[]>(
    (() => { try { const p = JSON.parse(siteConfig['CLIPPY_REPLIES'] ?? '[]'); return Array.isArray(p) ? p : [] } catch { return [] } })()
  )
  const [clippyNewReply, setClippyNewReply] = useState('')
  const [clippyEditIdx, setClippyEditIdx] = useState<number | null>(null)
  const [clippyEditVal, setClippyEditVal] = useState('')
  const [clippySaving, setClippySaving] = useState(false)
  const [endingseason, setEndingSeason] = useState(false)

  // ── Scroll fix pour les boutons 18+ ─────────────────────────────────────────
  // Au lieu de tenter de restaurer après coup, on intercepte directement
  // l'événement scroll qui se produit dans les 150ms suivant un clic.
  function lockScrollFor150ms() {
    const y = window.scrollY
    const restore = () => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior })
    window.addEventListener('scroll', restore)
    setTimeout(() => window.removeEventListener('scroll', restore), 150)
  }

  // Preserve scroll for buttons that trigger router.refresh() (Next.js resets scroll on navigation).
  function keepScroll() {
    const y = window.scrollY
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior })
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior }))
    })
  }

  function getWatchPct(filmId: number) {
    if (!totalUsers) return 0
    return Math.round(((watchCountMap[filmId] ?? 0) / totalUsers) * 100)
  }

  async function createDuel() {
    const eligible = films.filter(f => f.saison === 1 && getWatchPct(f.id) < CONFIG.SEUIL_MAJORITY)
    if (eligible.length < 2) { addToast('Pas assez de films éligibles', '⚠️'); return }
    // Vraie randomisation parmi tous les films éligibles
    const shuffled = [...eligible].sort(() => Math.random() - 0.5)
    const f1 = shuffled[0], f2 = shuffled[1]
    const weekNum = duels.length + 1
    const result = await adminCreateDuel(f1.id, f2.id, weekNum)
    if (result.error) addToast(result.error, '⚠️')
    else { addToast(`Duel S${weekNum} créé : ${f1.titre} VS ${f2.titre}`, '⚔️'); router.refresh() }
  }

  async function createManualDuel() {
    if (!manualFilm1 || !manualFilm2) { addToast('Sélectionne 2 films', '⚠️'); return }
    if (manualFilm1 === manualFilm2) { addToast('Choisis 2 films différents', '⚠️'); return }
    const f1 = films.find(f => f.id === parseInt(manualFilm1))
    const f2 = films.find(f => f.id === parseInt(manualFilm2))
    if (!f1 || !f2) return
    const weekNum = duels.length + 1
    const result = await adminCreateDuel(f1.id, f2.id, weekNum)
    if (result.error) addToast(result.error, '⚠️')
    else { addToast(`Duel S${weekNum} créé : ${f1.titre} VS ${f2.titre}`, '⚔️'); setManualFilm1(''); setManualFilm2(''); router.refresh() }
  }

  async function closeDuel(duelId: number) {
    const result = await adminCloseDuel(duelId)
    if (result.error) addToast(result.error, '⚠️')
    else { addToast('Duel clôturé — vainqueur désigné !', '🏆'); router.refresh() }
  }

  async function setWeekFilm(filmId: string) {
    if (!filmId) return
    const result = await adminSetWeekFilm(parseInt(filmId), `${CONFIG.FDLS_JOUR} soir à ${CONFIG.FDLS_HEURE}`)
    if (result.error) addToast(result.error, '⚠️')
    else { addToast('Film de la semaine défini !', '🎬'); router.refresh() }
  }

  async function deleteFilm(filmId: number, titre: string) {
    if (!confirm(`Retirer "${titre}" de la liste ?`)) return
    await adminDeleteFilm(filmId)
    addToast(`"${titre}" retiré`, '🗑️')
    router.refresh()
  }

  async function deleteUser(userId: string, pseudo: string) {
    if (!confirm(`Supprimer "${pseudo}" ?`)) return
    await adminDeleteUser(userId)
    addToast(`${pseudo} supprimé`, '🗑️')
    router.refresh()
  }

  async function toggleAdmin(userId: string, pseudo: string, makeAdmin: boolean) {
    const msg = makeAdmin
      ? `Accorder les droits admin à "${pseudo}" ?\n\nCette personne pourra accéder au panneau admin et modifier le site.`
      : `Retirer les droits admin à "${pseudo}" ?`
    if (!confirm(msg)) return
    const result = await adminSetAdmin(userId, makeAdmin)
    if (result?.error) addToast(result.error, '⚠️')
    else {
      addToast(makeAdmin ? `${pseudo} est maintenant admin` : `Droits admin retirés à ${pseudo}`, makeAdmin ? '👑' : '🔓')
      router.refresh()
    }
  }

  async function grantExp(userId: string, pseudo: string, amount: number) {
    await adminGrantExp(userId, amount)
    addToast(`+${amount} EXP donné à ${pseudo}`, '🎖️')
    router.refresh()
  }

  async function cleanDuels() {
    if (!confirm('Supprimer TOUS les duels, votes et messages associés ? Cette action est irréversible.')) return
    const result = await adminCleanDuels()
    if (result.error) addToast(result.error, '⚠️')
    else { addToast('Tous les duels ont été supprimés', '🗑️'); router.refresh() }
  }

  async function fetchPoster(filmId: number, titre: string) {
    setPosterLoading(l => ({ ...l, [filmId]: true }))
    const result = await adminFetchFilmPoster(filmId)
    setPosterLoading(l => ({ ...l, [filmId]: false }))
    if (result.error) addToast(result.error, '⚠️')
    else { addToast(`Affiche de "${titre}" récupérée depuis TMDB`, '🖼️'); router.refresh() }
  }

  async function uploadPoster(filmId: number, titre: string, file: File | undefined) {
    if (!file) return
    setPosterLoading(l => ({ ...l, [filmId]: true }))
    const fd = new FormData()
    fd.append('poster', file)
    const result = await adminUploadFilmPoster(filmId, fd)
    setPosterLoading(l => ({ ...l, [filmId]: false }))
    if (result.error) addToast(result.error, '⚠️')
    else { addToast(`Affiche de "${titre}" mise à jour`, '🖼️'); router.refresh() }
  }

  async function refreshAllPosters() {
    addToast('Recherche en cours…', '🔄')
    const result = await adminRefreshMissingPosters()
    if (result.error) addToast(result.error, '⚠️')
    else if (result.count === 0) addToast('Toutes les affiches sont déjà renseignées', 'ℹ️')
    else { addToast(`${result.count} affiche(s) récupérée(s) !`, '🖼️'); router.refresh() }
  }

  async function resolveReport(reportId: string) {
    const result = await adminResolveReport(reportId)
    if (result.error) addToast(result.error, '⚠️')
    else { addToast('Signalement résolu', '✅'); router.refresh() }
  }

  async function saveConfig(configs: Record<string, string>) {
    setSavingConfig(true)
    const result = await adminSetConfig(configs)
    setSavingConfig(false)
    if (result.error) addToast(result.error, '⚠️')
    else { addToast('Configuration sauvegardée !', '✅'); router.refresh() }
  }

  async function verifyPostersBatch() {
    if (verifyNextId === null) { addToast('Toutes les affiches ont été vérifiées', 'ℹ️'); return }
    setVerifyRunning(true)
    const result = await adminVerifyPosters(verifyNextId)
    setVerifyRunning(false)
    if (result.error) { addToast(result.error, '⚠️'); return }
    const newBroken = result.broken ?? []
    if (newBroken.length) {
      setBrokenPosters(prev => {
        const ids = new Set(prev.map(b => b.id))
        return [...prev, ...newBroken.filter(b => !ids.has(b.id))]
      })
    }
    setVerifyNextId(result.nextId ?? null)
    const msg = result.nextId
      ? `${newBroken.length} affiche(s) cassée(s) trouvée(s) sur ${result.checked ?? 0} vérifiées — cliquer pour continuer`
      : `Vérification terminée — ${brokenPosters.length + newBroken.length} affiche(s) cassée(s) au total`
    addToast(msg, newBroken.length ? '⚠️' : '✅')
  }

  async function forceRefreshAll() {
    if (allPostersNextId === null) { addToast('Tous les films ont été traités !', '✅'); return }
    setAllPostersRunning(true)
    addToast('Mise à jour en cours (lot de 50)…', '🔄')
    const result = await adminForceRefreshAllPosters(allPostersNextId)
    setAllPostersRunning(false)
    if (result.error) { addToast(result.error, '⚠️'); return }
    const next = result.nextId ?? null
    setAllPostersNextId(next)
    addToast(
      next === null
        ? `✅ Terminé ! ${result.count} affiches mises à jour dans ce lot.`
        : `${result.count} affiches mises à jour — cliquer à nouveau pour le lot suivant`,
      '🖼️'
    )
    router.refresh()
  }

  async function fetchFrenchPostersAuto() {
    setFrenchPostersRunning(true)
    let nextId: number | null = 0
    let total = 0
    while (nextId !== null) {
      const result = await adminFetchFrenchPosters(nextId)
      if (result.error) { addToast(result.error, '⚠️'); break }
      total += result.count ?? 0
      nextId = result.nextId ?? null
      if (nextId !== null) await new Promise(r => setTimeout(r, 600))
    }
    setFrenchPostersNextId(null)
    setFrenchPostersRunning(false)
    addToast(`✅ ${total} affiche(s) françaises mises à jour !`, '🇫🇷')
    router.refresh()
  }

  async function scanAgeRestrictionsAuto() {
    setAgeScanRunning(true)
    setAgeScanDetails(null)
    setAgeScanDone(false)
    setAgeScanError(null)
    let nextId: number | null = 0
    let total = 0
    let totalPending = 0
    let lastError: string | null = null
    const allDetails: Array<{ id: number; titre: string; tmdbId: number | null; flagged18: boolean; flagged16: boolean; certs: Record<string, string>; status: string }> = []
    while (nextId !== null) {
      const result = await adminScanAgeRestrictions(nextId)
      if (result.error) {
        lastError = result.error
        addToast(result.error, '⚠️')
        break
      }
      total += result.count ?? 0
      totalPending += result.pendingCount ?? 0
      if (result.details) allDetails.push(...result.details)
      nextId = result.nextId ?? null
      if (nextId !== null) await new Promise(r => setTimeout(r, 600))
    }
    setAgeScanNextId(null)
    setAgeScanRunning(false)
    setAgeScanDetails(allDetails)
    setAgeScanDone(true)
    setAgeScanError(lastError)
    if (!lastError) {
      const detected18 = allDetails.filter(d => d.flagged18).length
      const alreadyConfirmed = allDetails.filter(d => d.status === 'already_confirmed').length
      const adminOverride = allDetails.filter(d => d.status === 'admin_override').length
      const parts = [`${total} scannés`, `${detected18} 18+ selon TMDB`]
      if (totalPending > 0) parts.push(`${totalPending} nouveaux à confirmer`)
      if (alreadyConfirmed > 0) parts.push(`${alreadyConfirmed} déjà confirmés`)
      if (adminOverride > 0) parts.push(`${adminOverride} admin override`)
      addToast(`✅ ${parts.join(' · ')}`, '🔞')
      router.refresh()
    }
  }

  async function forceRefreshAllAuto() {
    setAutoRunning(true)
    let nextId: number | null = 0
    let totalCount = 0
    let lot = 1
    while (nextId !== null) {
      setAutoProgress(`Lot ${lot} en cours…`)
      const result = await adminForceRefreshAllPosters(nextId)
      if (result.error) { addToast(result.error, '⚠️'); break }
      totalCount += result.count ?? 0
      nextId = result.nextId ?? null
      lot++
      if (nextId !== null) await new Promise(r => setTimeout(r, 800))
    }
    setAllPostersNextId(null)
    setAutoRunning(false)
    setAutoProgress('')
    addToast(`✅ Terminé ! ${totalCount} affiches mises à jour au total.`, '🖼️')
    router.refresh()
  }

  async function setFilm18(film: Film, is18: boolean) {
    setFlag18Saving(prev => ({ ...prev, [film.id]: true }))
    const result = await adminSet18Flag(film.id, is18)
    setFlag18Saving(prev => { const n = { ...prev }; delete n[film.id]; return n })
    if ('error' in result) addToast(result.error!, '⚠️')
    else {
      setReviewedIds(prev => new Set([...prev, film.id]))
      setLocalPending(prev => prev.filter(f => f.id !== film.id))
      addToast(is18 ? `🔞 "${film.titre}" confirmé 18+` : `✓ "${film.titre}" — repassé Normal`, '✅')
      router.refresh()
    }
  }

  async function approveAllPending() {
    if (!localPending.length) return
    setApproveAllLoading(true)
    const result = await adminApproveAllPending()
    setApproveAllLoading(false)
    if ('error' in result) { addToast(result.error!, '⚠️'); return }
    addToast(`🔞 ${result.count} film(s) confirmés 18+ — catégorie mise à jour`, '✅')
    setLocalPending([])
    router.refresh()
  }

  return (
    <div style={{ overflowAnchor: 'none' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Administration</div>
        <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>Accès restreint · {CONFIG.SAISON_LABEL}</div>
      </div>

      {/* 18+ alert banner — seulement si des films attendent confirmation */}
      {localPending.length > 0 && (
        <div style={{ background: 'rgba(232,90,90,.12)', border: '2px solid var(--red)', borderRadius: 'var(--rl)', padding: '1rem 1.3rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '.8rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🔞</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: '.9rem' }}>
              {localPending.length} film{localPending.length > 1 ? 's' : ''} détecté{localPending.length > 1 ? 's' : ''} 18+ par le CNC — confirmation requise
            </div>
            <div style={{ fontSize: '.76rem', color: 'var(--text2)', marginTop: '.2rem' }}>
              Le scan automatique les a identifiés. Confirme ou refuse dans la section ci-dessous.
            </div>
          </div>
        </div>
      )}

      {/* Demandes de dépassement de limite marathon */}
      {marathonRequests.length > 0 && (
        <div style={{ background: 'rgba(232,196,106,.08)', border: '2px solid rgba(232,196,106,.5)', borderRadius: 'var(--rl)', padding: '1rem 1.3rem', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.8rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🎬</span>
            <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '.9rem' }}>
              {marathonRequests.length} demande{marathonRequests.length > 1 ? 's' : ''} de dépassement de limite marathon
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {marathonRequests.map((r: any) => (
              <div key={r.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.75rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: r.message ? '.4rem' : 0, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--gold)' }}>
                    {r.profiles?.pseudo ?? r.user_id}
                  </span>
                  <span style={{ fontSize: '.68rem', color: 'var(--text3)' }}>
                    {new Date(r.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontSize: '.65rem', background: 'rgba(232,196,106,.12)', color: 'var(--gold)', border: '1px solid rgba(232,196,106,.3)', borderRadius: 99, padding: '1px 7px', marginLeft: 'auto' }}>
                    Jour : {r.day}
                  </span>
                </div>
                {r.message && (
                  <div style={{ fontSize: '.78rem', color: 'var(--text2)', fontStyle: 'italic', borderLeft: '2px solid rgba(232,196,106,.3)', paddingLeft: '.6rem', marginBottom: '.6rem', lineHeight: 1.5 }}>
                    "{r.message}"
                  </div>
                )}
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <button
                    className="btn btn-green"
                    style={{ fontSize: '.72rem', padding: '.25rem .7rem' }}
                    disabled={marathonReviewLoading[r.id]}
                    onClick={async () => {
                      setMarathonReviewLoading(prev => ({ ...prev, [r.id]: true }))
                      const res = await adminReviewMarathonRequest(r.id, 'approve')
                      if (res?.error) { addToast(res.error, '⚠️'); setMarathonReviewLoading(prev => ({ ...prev, [r.id]: false })); return }
                      setMarathonRequests(prev => prev.filter(x => x.id !== r.id))
                      addToast(`Demande approuvée — ${r.profiles?.pseudo} peut ajouter jusqu'à 8 films`, '✅')
                    }}
                  >
                    ✓ Approuver (max 8/jour)
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: '.72rem', padding: '.25rem .7rem', color: 'var(--red)', borderColor: 'var(--red)' }}
                    disabled={marathonReviewLoading[r.id]}
                    onClick={async () => {
                      setMarathonReviewLoading(prev => ({ ...prev, [r.id]: true }))
                      const res = await adminReviewMarathonRequest(r.id, 'reject')
                      if (res?.error) { addToast(res.error, '⚠️'); setMarathonReviewLoading(prev => ({ ...prev, [r.id]: false })); return }
                      setMarathonRequests(prev => prev.filter(x => x.id !== r.id))
                      addToast(`Demande refusée — ${r.profiles?.pseudo} reste bloqué 24h`, '🔒')
                    }}
                  >
                    ✗ Refuser (bloquer 24h)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signalements */}
      {reports.length > 0 && (
        <div style={{ background: 'rgba(232,90,90,.1)', border: '2px solid var(--red)', borderRadius: 'var(--rl)', padding: '1rem 1.3rem', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.8rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🚨</span>
            <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: '.9rem' }}>
              {reports.length} signalement{reports.length > 1 ? 's' : ''} en attente
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            {reports.map((r: any) => (
              <div key={r.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.6rem 1rem', display: 'flex', alignItems: 'center', gap: '.7rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '.75rem', color: 'var(--red)', fontWeight: 600 }}>🎬 {r.film?.titre}</span>
                <span style={{ fontSize: '.75rem', color: 'var(--text3)' }}>par {r.reporter?.pseudo}</span>
                <span style={{ flex: 1, fontSize: '.82rem' }}>{r.reason}</span>
                <span style={{ fontSize: '.68rem', color: 'var(--text3)' }}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                <button className="btn btn-green" style={{ fontSize: '.72rem', padding: '.25rem .6rem' }} onClick={() => resolveReport(r.id)}>✓ Résolu</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duels */}
      <Section icon="⚔️" title="Gestion des duels">
        <div style={{ display: 'flex', gap: '.7rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button className="btn btn-gold" onClick={createDuel}>
            🎲 Duel aléatoire (tous les films éligibles)
          </button>
          <button className="btn btn-red" onClick={cleanDuels} style={{ fontSize: '.8rem' }}>
            🗑️ Nettoyer tous les duels
          </button>
        </div>
        {/* Duel manuel */}
        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem', padding: '.75rem', background: 'var(--bg3)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '.8rem', color: 'var(--text3)', whiteSpace: 'nowrap' }}>Duel manuel :</span>
          <select
            value={manualFilm1}
            onChange={e => setManualFilm1(e.target.value)}
            style={{ flex: 1, minWidth: 140, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.45rem .7rem', color: 'var(--text2)', fontSize: '.82rem' }}
          >
            <option value="">Film 1…</option>
            {films.filter(f => f.saison === 1).map(f => (
              <option key={f.id} value={f.id}>{f.titre}</option>
            ))}
          </select>
          <span style={{ color: 'var(--text3)', fontSize: '.85rem' }}>VS</span>
          <select
            value={manualFilm2}
            onChange={e => setManualFilm2(e.target.value)}
            style={{ flex: 1, minWidth: 140, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.45rem .7rem', color: 'var(--text2)', fontSize: '.82rem' }}
          >
            <option value="">Film 2…</option>
            {films.filter(f => f.saison === 1).map(f => (
              <option key={f.id} value={f.id}>{f.titre}</option>
            ))}
          </select>
          <button className="btn btn-gold" style={{ fontSize: '.8rem', whiteSpace: 'nowrap' }} onClick={createManualDuel}>
            ⚔️ Créer ce duel
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {duels.map((d: any) => {
            const v1 = d.votes?.filter((v: any) => v.film_choice === d.film1_id).length ?? 0
            const v2 = d.votes?.filter((v: any) => v.film_choice === d.film2_id).length ?? 0
            return (
              <div key={d.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.75rem 1rem', display: 'flex', alignItems: 'center', gap: '.8rem', flexWrap: 'wrap' }}>
                <span style={{ flex: 1, fontSize: '.82rem' }}>
                  <strong>{d.film1?.titre}</strong> VS <strong>{d.film2?.titre}</strong>
                  <span style={{ color: 'var(--text3)', marginLeft: '.5rem' }}>S{d.week_num}</span>
                </span>
                <span style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{v1 + v2} votes</span>
                {d.closed ? (
                  <span style={{ fontSize: '.72rem', color: 'var(--green)' }}>✓ Clôturé</span>
                ) : (
                  <button className="btn btn-outline" style={{ fontSize: '.73rem', padding: '.28rem .65rem' }} onClick={() => closeDuel(d.id)}>Clôturer</button>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      {/* Week film */}
      <Section icon="🎬" title="Film de la semaine">
        {weekFilm && (
          <div style={{ marginBottom: '.8rem', display: 'flex', alignItems: 'center', gap: '.8rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.7rem 1rem' }}>
            <span style={{ fontSize: '.85rem', flex: 1 }}>Actuel : <strong>{(weekFilm as any).films?.titre}</strong></span>
            <button className="btn btn-red" style={{ fontSize: '.73rem', padding: '.28rem .65rem' }} onClick={async () => {
              const { createClient } = await import('@/lib/supabase/client')
              const sb = createClient()
              await (sb.from('week_films') as any).update({ active: false }).eq('active', true)
              addToast('Film de la semaine retiré', '↩️')
              router.refresh()
            }}>Retirer</button>
          </div>
        )}
        <select
          style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.65rem .9rem', color: 'var(--text2)', fontFamily: 'var(--font-body)', fontSize: '.88rem' }}
          defaultValue=""
          onChange={e => setWeekFilm(e.target.value)}
        >
          <option value="">Choisir le film de cette semaine…</option>
          {films.filter(f => f.saison === 1).map(f => (
            <option key={f.id} value={f.id}>{f.titre} ({f.annee}) — {getWatchPct(f.id)}% vus</option>
          ))}
        </select>
      </Section>

      {/* Users */}
      <Section icon="👥" title={`Joueurs (${users.length})`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', maxHeight: 400, overflowY: 'auto' }}>
          {users.map((u: any) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '.8rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.6rem 1rem', flexWrap: 'wrap' }}>
              <span style={{ flex: 1, fontSize: '.85rem', fontWeight: 500 }}>
                {u.pseudo}
                {u.is_admin && <span style={{ marginLeft: '.4rem', fontSize: '.6rem', color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase' }}>👑 admin</span>}
              </span>
              <span style={{ fontSize: '.72rem', color: 'var(--text3)' }}>S{u.saison}</span>
              <span style={{ fontSize: '.8rem', color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{u.exp} EXP</span>
              <span style={{ fontSize: '.72rem', color: 'var(--text2)' }}>🎬 {u.watched?.length ?? 0}</span>
              <button className="btn btn-green" style={{ fontSize: '.7rem', padding: '.22rem .55rem' }} onClick={() => grantExp(u.id, u.pseudo, 10)}>+10 EXP</button>
              {u.is_admin ? (
                u.id !== profile.id && (
                  <button className="btn btn-outline" style={{ fontSize: '.7rem', padding: '.22rem .55rem', borderColor: 'var(--gold)', color: 'var(--gold)' }} onClick={() => toggleAdmin(u.id, u.pseudo, false)}>
                    ✕ Admin
                  </button>
                )
              ) : (
                <>
                  <button className="btn btn-outline" style={{ fontSize: '.7rem', padding: '.22rem .55rem', borderColor: 'var(--gold)', color: 'var(--gold)' }} onClick={() => toggleAdmin(u.id, u.pseudo, true)}>
                    👑 Admin
                  </button>
                  <button className="btn btn-red" style={{ fontSize: '.7rem', padding: '.22rem .55rem' }} onClick={() => deleteUser(u.id, u.pseudo)}>✕</button>
                </>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Section — Films soumis sans correspondance TMDB (validation manuelle) */}
      {localPendingApproval.length > 0 && (
        <Section icon="📋" title={`Demandes d'ajout manuel — ${localPendingApproval.length} film(s) en attente`}>
          <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Ces films ont été soumis par des membres sans correspondance automatique TMDB. Approuvez ou refusez chaque demande.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {localPendingApproval.map((f: any) => (
              <div key={f.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.75rem 1rem', display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.titre} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({f.annee})</span>
                  </div>
                  <div style={{ fontSize: '.7rem', color: 'var(--text2)', marginTop: 2 }}>
                    {f.realisateur} · {f.genre}{f.sousgenre ? ` / ${f.sousgenre}` : ''}
                    {f.profiles?.pseudo && <span style={{ color: 'var(--text3)', marginLeft: '.5rem' }}>— soumis par <strong>{f.profiles.pseudo}</strong></span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: '.72rem', padding: '.25rem .6rem', color: 'var(--green)', borderColor: 'var(--green)' }}
                    disabled={approvalLoading[f.id]}
                    onClick={async () => {
                      setApprovalLoading(l => ({ ...l, [f.id]: true }))
                      const res = await adminApproveFilmRequest(f.id)
                      setApprovalLoading(l => ({ ...l, [f.id]: false }))
                      if (res.error) addToast(res.error, '⚠️')
                      else { setLocalPendingApproval(prev => prev.filter(x => x.id !== f.id)); addToast(`"${f.titre}" approuvé ✅`, '🎬'); router.refresh() }
                    }}
                  >✅ Approuver</button>
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: '.72rem', padding: '.25rem .6rem', color: 'var(--red)', borderColor: 'var(--red)' }}
                    disabled={approvalLoading[f.id]}
                    onClick={async () => {
                      setApprovalLoading(l => ({ ...l, [f.id]: true }))
                      const res = await adminRejectFilmRequest(f.id)
                      setApprovalLoading(l => ({ ...l, [f.id]: false }))
                      if (res.error) addToast(res.error, '⚠️')
                      else { setLocalPendingApproval(prev => prev.filter(x => x.id !== f.id)); addToast(`"${f.titre}" refusé`, '🗑️') }
                    }}
                  >✕ Refuser</button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Section 18+ — Films classés 18+ à valider */}
      <Section icon="🔞" title={`Validation 18+${localPending.length > 0 ? ` — ${localPending.length} film(s)` : ' — aucun film 18+'}`}>
        <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Films marqués <strong style={{ color: 'var(--red)' }}>18+</strong> par le scanner ou manuellement.<br />
          <strong style={{ color: 'var(--green)' }}>✓ Normal</strong> → retire le flag 18+. &nbsp;
          <strong style={{ color: 'var(--red)' }}>🔞 18+</strong> → confirme. &nbsp;
          <strong style={{ color: '#d0a0ff' }}>🔞 Étrange</strong> → 18+ contenu étrange.
        </div>

        {localPending.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            {localPending.map(f => {
              const saving = !!flag18Saving[f.id]
              const isStrange = (f as any).flagged_18strange
              return (
                <div key={f.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 70px 70px 90px', gap: '.4rem', alignItems: 'center',
                  background: isStrange ? 'rgba(160,0,220,.08)' : 'rgba(232,90,90,.07)',
                  border: `1px solid ${isStrange ? 'rgba(160,0,220,.3)' : 'rgba(232,90,90,.22)'}`,
                  borderRadius: 'var(--r)', padding: '.5rem .8rem', opacity: saving ? 0.6 : 1,
                }}>
                  <span style={{ fontSize: '.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.titre}
                    <span style={{ color: 'var(--text3)', fontSize: '.7rem', marginLeft: '.35rem' }}>({f.annee})</span>
                    {isStrange && <span style={{ color: '#d0a0ff', fontSize: '.65rem', marginLeft: '.35rem' }}>Étrange</span>}
                  </span>
                  <button type="button" disabled={saving}
                    onClick={() => { lockScrollFor150ms(); setFilm18(f, false) }}
                    style={{ padding: '.35rem 0', borderRadius: 'var(--r)', border: '1px solid rgba(79,217,138,.35)', cursor: saving ? 'default' : 'pointer', fontSize: '.72rem', fontWeight: 700, background: 'transparent', color: 'var(--green)' }}
                  >{saving ? '…' : '✓ Normal'}</button>
                  <button type="button" disabled={saving}
                    onClick={() => { lockScrollFor150ms(); setFilm18(f, true) }}
                    style={{ padding: '.35rem 0', borderRadius: 'var(--r)', border: '1px solid rgba(232,90,90,.4)', cursor: saving ? 'default' : 'pointer', fontSize: '.72rem', fontWeight: 700, background: 'transparent', color: 'var(--red)' }}
                  >{saving ? '…' : '🔞 18+'}</button>
                  <button type="button" disabled={saving}
                    onClick={async () => {
                      lockScrollFor150ms()
                      setFlag18Saving(prev => ({ ...prev, [f.id]: true }))
                      await adminSetFilmCategory(f.id, 'strange')
                      setFlag18Saving(prev => { const n = { ...prev }; delete n[f.id]; return n })
                      setReviewedIds(prev => new Set([...prev, f.id]))
                      setLocalPending(prev => prev.filter(x => x.id !== f.id))
                      router.refresh()
                    }}
                    style={{ padding: '.35rem 0', borderRadius: 'var(--r)', border: '1px solid rgba(160,0,220,.4)', cursor: saving ? 'default' : 'pointer', fontSize: '.72rem', fontWeight: 700, background: 'transparent', color: '#d0a0ff' }}
                  >{saving ? '…' : '🔞 Étrange'}</button>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ fontSize: '.82rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <span>✅</span> Aucun film 18+ — lance le scanner pour détecter automatiquement.
          </div>
        )}

        {/* Bouton scan + résultats */}
        <div style={{ marginTop: '1.2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.6rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              style={{ fontSize: '.8rem' }}
              disabled={ageScanRunning}
              onClick={scanAgeRestrictionsAuto}
            >
              {ageScanRunning ? '⏳ Scan TMDB en cours…' : '🔞 Scanner tous les films (TMDB)'}
            </button>
            <button
              className="btn btn-outline"
              style={{ fontSize: '.8rem' }}
              disabled={diagLoading}
              onClick={async () => {
                setDiagLoading(true)
                const r = await adminDiagnostic()
                setDiagResult(r)
                setDiagLoading(false)
              }}
            >
              {diagLoading ? '⏳…' : '🔬 Tester connexion DB'}
            </button>
          </div>
          {diagResult && (
            <div style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,0,.3)', borderRadius: 'var(--r)', padding: '.75rem', marginBottom: '.6rem', fontSize: '.72rem', fontFamily: 'monospace' }}>
              <div style={{ color: 'yellow', fontWeight: 700, marginBottom: '.4rem' }}>🔬 Diagnostic DB</div>
              {'error' in diagResult ? (
                <div style={{ color: 'orange' }}>Erreur: {diagResult.error}</div>
              ) : (
                <>
                  <div>adminClient count: <span style={{ color: diagResult.adminCount?.error ? 'red' : 'lime' }}>{diagResult.adminCount?.error ? `ERREUR: ${diagResult.adminCount.error}` : JSON.stringify(diagResult.adminCount?.data)}</span></div>
                  <div>adminClient select: <span style={{ color: diagResult.adminSelect?.error ? 'red' : 'lime' }}>{diagResult.adminSelect?.error ? `ERREUR: ${diagResult.adminSelect.error}` : `${diagResult.adminSelect?.data?.length ?? 0} films`} {diagResult.adminSelect?.data?.length ? `(ids: ${diagResult.adminSelect.data.map((f: any) => f.id).join(', ')})` : ''}</span></div>
                  <div>supabase select:   <span style={{ color: diagResult.userSelect?.error ? 'red' : 'lime' }}>{diagResult.userSelect?.error ? `ERREUR: ${diagResult.userSelect.error}` : `${diagResult.userSelect?.data?.length ?? 0} films`}</span></div>
                  <div>TMDB_API_KEY: <span style={{ color: diagResult.tmdbKey === 'MANQUANTE' ? 'red' : 'lime' }}>{diagResult.tmdbKey}</span></div>
                  <div>SERVICE_ROLE_KEY: <span style={{ color: diagResult.serviceKey === 'MANQUANTE' ? 'red' : 'lime' }}>{diagResult.serviceKey}</span></div>
                </>
              )}
            </div>
          )}

          {ageScanDone && (
            <div style={{ background: 'rgba(0,0,0,.25)', border: `2px solid ${ageScanError ? 'rgba(255,150,0,.6)' : 'rgba(255,255,255,.12)'}`, borderRadius: 'var(--r)', padding: '.85rem', maxHeight: '360px', overflowY: 'auto' }}>
              {ageScanError ? (
                <div style={{ color: 'orange', fontSize: '.82rem', fontWeight: 700 }}>⚠️ {ageScanError}</div>
              ) : !ageScanDetails?.length ? (
                <div style={{ color: 'orange', fontSize: '.82rem', fontWeight: 700 }}>
                  ⚠️ 0 films trouvés en DB — vérifie SUPABASE_SERVICE_ROLE_KEY sur Vercel.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '.75rem', fontWeight: 700, marginBottom: '.5rem', display: 'flex', gap: '.8rem', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--accent)' }}>📋 {ageScanDetails.length} scannés</span>
                    <span style={{ color: 'var(--red)' }}>🔞 {ageScanDetails.filter(d => d.status === 'pending').length} nouveaux 18+</span>
                    <span style={{ color: 'var(--green)' }}>✅ {ageScanDetails.filter(d => d.status === 'already_confirmed').length} déjà confirmés</span>
                    <span style={{ color: '#a78bfa' }}>🛡 {ageScanDetails.filter(d => d.status === 'admin_override').length} override admin</span>
                    <span style={{ color: 'var(--text3)' }}>❓ {ageScanDetails.filter(d => d.status === 'no_tmdb').length} sans TMDB</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.18rem' }}>
                    {ageScanDetails.map(d => {
                      const color = d.status === 'pending' ? 'var(--red)' : d.status === 'already_confirmed' ? 'var(--green)' : d.status === 'admin_override' ? '#a78bfa' : d.status === 'no_tmdb' ? 'var(--text3)' : d.status.startsWith('error') || d.status.startsWith('http') || d.status.startsWith('db_') ? 'orange' : 'var(--text2)'
                      const icon = d.status === 'pending' ? '🔞' : d.status === 'already_confirmed' ? '✅' : d.status === 'admin_override' ? '🛡' : d.status === 'no_tmdb' ? '❓' : d.status.startsWith('error') || d.status.startsWith('http') || d.status.startsWith('db_') ? '⚠' : '✓'
                      const label = d.status === 'no_tmdb' ? 'pas de TMDB' : d.status === 'already_confirmed' ? 'déjà confirmé' : d.status === 'admin_override' ? 'admin override' : d.status === 'pending' ? (Object.entries(d.certs).map(([k, v]) => `${k}:${v}`).join(' ') || 'adult=true') : d.status.startsWith('error') || d.status.startsWith('http') || d.status.startsWith('db_') ? d.status : Object.entries(d.certs).map(([k, v]) => `${k}:${v}`).join(' ') || '—'
                      return (
                        <div key={d.id} style={{ fontSize: '.68rem', display: 'flex', gap: '.5rem', color }}>
                          <span style={{ flexShrink: 0 }}>{icon}</span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.titre}</span>
                          <span style={{ color: 'var(--text3)', flexShrink: 0, fontSize: '.62rem' }}>{label}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Outil de test : certification TMDB pour un film spécifique */}
        <div style={{ marginTop: '1.2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '.68rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '.6rem' }}>
            🔬 Tester la certification TMDB d'un film
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <select
              value={testFilmId}
              onChange={e => { setTestFilmId(e.target.value); setTestResult(null) }}
              style={{ flex: 1, minWidth: 200, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.4rem .6rem', color: 'var(--text)', fontSize: '.8rem' }}
            >
              <option value="">— Choisir un film —</option>
              {films.map(f => (
                <option key={f.id} value={String(f.id)}>{f.titre} ({f.annee})</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!testFilmId || testLoading}
              onClick={async () => {
                if (!testFilmId) return
                setTestLoading(true)
                setTestResult(null)
                const r = await adminTestFilmCertification(Number(testFilmId))
                setTestResult(r)
                setTestLoading(false)
              }}
              style={{ padding: '.4rem .9rem', borderRadius: 'var(--r)', border: '1px solid rgba(99,179,237,.4)', background: 'rgba(99,179,237,.1)', color: '#63b3ed', fontSize: '.8rem', fontWeight: 600, cursor: testFilmId && !testLoading ? 'pointer' : 'default' }}
            >
              {testLoading ? '⏳ Test…' : '🔬 Tester'}
            </button>
          </div>
          {testResult && (
            <div style={{ marginTop: '.75rem', background: 'rgba(0,0,0,.2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.75rem', fontSize: '.75rem' }}>
              {'error' in testResult ? (
                <div style={{ color: 'orange' }}>⚠️ {testResult.error}</div>
              ) : (
                <>
                  <div style={{ fontWeight: 700, marginBottom: '.4rem', color: testResult.flagged18 ? 'var(--red)' : 'var(--green)' }}>
                    {testResult.flagged18 ? '🔞 18+ détecté' : '✅ Pas 18+'} — {testResult.titre}
                    {testResult.flagged16 && !testResult.flagged18 && <span style={{ color: 'orange', marginLeft: '.5rem' }}>⚠ 16+</span>}
                    {testResult.isAdult && <span style={{ color: 'var(--red)', marginLeft: '.5rem' }}>(adult=true)</span>}
                  </div>
                  {Object.keys(testResult.certs ?? {}).length > 0 && (
                    <div style={{ marginBottom: '.4rem' }}>
                      <span style={{ color: 'var(--text3)' }}>Certifs clés : </span>
                      {Object.entries(testResult.certs).map(([k, v]) => (
                        <span key={k} style={{ marginRight: '.5rem', color: 'var(--accent)' }}>{k}:{String(v)}</span>
                      ))}
                    </div>
                  )}
                  {Object.keys(testResult.rawCerts ?? {}).length > 0 ? (
                    <details>
                      <summary style={{ cursor: 'pointer', color: 'var(--text2)', fontSize: '.7rem' }}>
                        Toutes les certifications TMDB ({Object.keys(testResult.rawCerts).length} pays)
                      </summary>
                      <div style={{ marginTop: '.4rem', display: 'flex', flexDirection: 'column', gap: '.15rem' }}>
                        {Object.entries(testResult.rawCerts).map(([country, certs]) => (
                          <div key={country} style={{ display: 'flex', gap: '.5rem' }}>
                            <span style={{ color: 'var(--text3)', minWidth: 32 }}>{country}</span>
                            <span>{(certs as string[]).join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <div style={{ color: 'var(--text3)', fontSize: '.72rem' }}>Aucune certification disponible dans TMDB pour ce film.</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Films */}
      <Section icon="🎥" title={`Films (${films.length})`}>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginBottom: '.8rem' }}>
          <button className="btn btn-outline" style={{ fontSize: '.78rem' }} onClick={refreshAllPosters}>
            🔄 Affiches manquantes (lot de 30)
          </button>
          <button
            className="btn btn-outline"
            style={{ fontSize: '.78rem' }}
            disabled={allPostersRunning || allPostersNextId === null || autoRunning}
            onClick={forceRefreshAll}
          >
            {allPostersRunning ? '…' : allPostersNextId === null ? '✅ Tout traité' : '🔄 Tout rafraîchir depuis TMDB (lot de 50)'}
          </button>
          <button
            className="btn btn-gold"
            style={{ fontSize: '.78rem' }}
            disabled={autoRunning}
            onClick={forceRefreshAllAuto}
          >
            {autoRunning ? `⏳ ${autoProgress}` : '⚡ Tout rafraîchir automatiquement'}
          </button>
          <button
            className="btn btn-outline"
            style={{ fontSize: '.78rem' }}
            disabled={verifyRunning || verifyNextId === null}
            onClick={verifyPostersBatch}
          >
            {verifyRunning ? '…' : verifyNextId === null ? `✅ Vérifié (${brokenPosters.length} cassée(s))` : `🔍 Vérifier les URLs (lot de 40)`}
          </button>
          <button
            className="btn btn-outline"
            style={{ fontSize: '.78rem' }}
            disabled={frenchPostersRunning}
            onClick={fetchFrenchPostersAuto}
          >
            {frenchPostersRunning ? '⏳ Affiches FR en cours…' : '🇫🇷 Récupérer affiches françaises'}
          </button>
          <button
            className="btn btn-outline"
            style={{ fontSize: '.78rem' }}
            onClick={async () => {
              const r = await adminFetchOverviews()
              if (r.error) addToast(r.error, '⚠️')
              else addToast(`${r.count} synopsis récupéré${r.count > 1 ? 's' : ''} depuis TMDB`, '✅')
              router.refresh()
            }}
          >
            📝 Remplir les synopsis (TMDB)
          </button>
        </div>
        {brokenPosters.length > 0 && (
          <div style={{ background: 'rgba(232,90,90,.07)', border: '1px solid rgba(232,90,90,.3)', borderRadius: 'var(--r)', padding: '.75rem', marginBottom: '.6rem' }}>
            <div style={{ fontSize: '.72rem', color: 'var(--red)', fontWeight: 600, marginBottom: '.4rem' }}>
              ⚠️ {brokenPosters.length} affiche(s) avec URL cassée — utilise 🔄 TMDB pour les corriger
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
              {brokenPosters.map(b => (
                <div key={b.id} style={{ fontSize: '.75rem', color: 'var(--text2)', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--red)' }}>✕</span>
                  <span style={{ flex: 1 }}>{b.titre}</span>
                  <button className="btn btn-outline" style={{ fontSize: '.62rem', padding: '.15rem .4rem' }} onClick={() => fetchPoster(b.id, b.titre)}>🔄 TMDB</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', maxHeight: 400, overflowY: 'auto' }}>
          {films.map(f => {
            const loading = posterLoading[f.id]
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.4rem .7rem', flexWrap: 'wrap' }}>
                {/* Miniature affiche */}
                <div style={{ width: 28, height: 40, flexShrink: 0, borderRadius: 3, overflow: 'hidden', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem' }}>
                  {f.poster
                    ? <img src={f.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '🎬'}
                </div>
                <span style={{ flex: 1, fontSize: '.82rem' }}>{f.titre} <span style={{ color: 'var(--text3)', fontSize: '.7rem' }}>({f.annee})</span></span>
                <span style={{ fontSize: '.68rem', color: f.saison === 2 ? 'var(--red)' : 'var(--text3)', border: '1px solid var(--border)', borderRadius: 99, padding: '1px 6px' }}>S{f.saison}</span>
                <span style={{ fontSize: '.72rem', color: 'var(--text2)' }}>{getWatchPct(f.id)}% vus</span>
                {/* Bouton TMDB */}
                <button
                  className="btn btn-outline"
                  style={{ fontSize: '.65rem', padding: '.18rem .45rem' }}
                  disabled={loading}
                  onClick={() => fetchPoster(f.id, f.titre)}
                  title="Récupérer l'affiche depuis TMDB"
                >
                  {loading ? '…' : '🔄 TMDB'}
                </button>
                {/* Bouton upload PC */}
                <label style={{ cursor: 'pointer', display: 'inline-block' }} title="Uploader une affiche depuis votre PC">
                  <span className="btn btn-outline" style={{ fontSize: '.65rem', padding: '.18rem .45rem', pointerEvents: loading ? 'none' : 'auto', opacity: loading ? .5 : 1 }}>
                    📁 PC
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => uploadPoster(f.id, f.titre, e.target.files?.[0])}
                  />
                </label>
                <button
                  className="btn btn-outline"
                  style={{ fontSize: '.65rem', padding: '.18rem .45rem' }}
                  onClick={() => setEditFilm(f)}
                  title="Modifier ce film"
                >
                  ✏️
                </button>
                <button className="btn btn-red" style={{ fontSize: '.65rem', padding: '.18rem .45rem' }} onClick={() => deleteFilm(f.id, f.titre)}>✕</button>
              </div>
            )
          })}
        </div>
      </Section>

      {/* NEWS */}
      <Section icon="📢" title="News & Annonces">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: '1rem' }}>
          <input
            placeholder="Titre de la news…" value={newsTitle} onChange={e => setNewsTitle(e.target.value)} maxLength={200}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.5rem .75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.83rem' }}
          />
          <textarea
            placeholder="Contenu de la news…" value={newsContent} onChange={e => setNewsContent(e.target.value)} maxLength={5000} rows={4}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.5rem .75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.83rem', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.8rem', color: 'var(--text2)', cursor: 'pointer' }}>
              <input type="checkbox" checked={newsPinned} onChange={e => setNewsPinned(e.target.checked)} /> Épingler
            </label>
            <button
              className="btn btn-gold" style={{ marginLeft: 'auto' }}
              disabled={!newsTitle.trim() || !newsContent.trim()}
              onClick={async () => {
                const res = await adminAddNews(newsTitle.trim(), newsContent.trim(), newsPinned)
                if (res.error) addToast(res.error, '⚠️')
                else { addToast('News publiée !', '📢'); setNewsTitle(''); setNewsContent(''); setNewsPinned(false); router.refresh() }
              }}
            >Publier</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
          {news.map((n: any) => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '.8rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.6rem 1rem' }}>
              {n.pinned && <span style={{ fontSize: '.7rem' }}>📌</span>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '.85rem', fontWeight: 500 }}>{n.title}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--text3)' }}>{new Date(n.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
              <button className="btn btn-red" style={{ fontSize: '.65rem', padding: '.18rem .45rem' }}
                onClick={async () => { await adminDeleteNews(n.id); router.refresh() }}>✕</button>
            </div>
          ))}
          {!news.length && <div style={{ color: 'var(--text3)', fontSize: '.83rem' }}>Aucune news publiée.</div>}
        </div>
      </Section>

      {/* RECOMMENDATIONS */}
      <Section icon="🎓" title="Rattrapage Cinéma">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem', marginBottom: '.6rem' }}>
          <select value={recoNiveau} onChange={e => setRecoNiveau(e.target.value as any)}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.5rem .75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.83rem' }}>
            <option value="debutant">Débutant</option>
            <option value="intermediaire">Intermédiaire</option>
            <option value="confirme">Confirmé</option>
          </select>
          <input placeholder="Titre du film *" value={recoTitre} onChange={e => setRecoTitre(e.target.value)} maxLength={150}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.5rem .75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.83rem' }} />
          <input placeholder="Année (ex: 1972)" value={recoAnnee} onChange={e => setRecoAnnee(e.target.value)} type="number"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.5rem .75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.83rem' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', marginBottom: '.6rem' }}>
          <input placeholder="Réalisateur" value={recoReal} onChange={e => setRecoReal(e.target.value)} maxLength={100}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.5rem .75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.83rem' }} />
          <input placeholder="Description courte (optionnel)" value={recoDesc} onChange={e => setRecoDesc(e.target.value)} maxLength={300}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.5rem .75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.83rem' }} />
        </div>
        <button className="btn btn-gold" disabled={!recoTitre.trim()}
          onClick={async () => {
            const res = await adminAddRecommendation(recoNiveau, recoTitre, recoAnnee ? parseInt(recoAnnee) : null, recoReal, recoDesc, recommendations.filter((r: any) => r.niveau === recoNiveau).length)
            if (res.error) addToast(res.error, '⚠️')
            else { addToast('Film ajouté !', '🎓'); setRecoTitre(''); setRecoAnnee(''); setRecoReal(''); setRecoDesc(''); router.refresh() }
          }}
        >Ajouter à la liste</button>
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
          {(['debutant','intermediaire','confirme'] as const).map(n => (
            <div key={n}>
              <div style={{ fontSize: '.68rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text3)', margin: '.5rem 0 .3rem' }}>
                {n === 'debutant' ? '🎬 Débutant' : n === 'intermediaire' ? '🎭 Intermédiaire' : '🏆 Confirmé'} ({recommendations.filter((r:any) => r.niveau === n).length})
              </div>
              {recommendations.filter((r:any) => r.niveau === n).map((r: any) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '.7rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.5rem .8rem', marginBottom: '.25rem' }}>
                  <span style={{ flex: 1, fontSize: '.83rem' }}>{r.titre}{r.annee ? ` (${r.annee})` : ''}</span>
                  <button className="btn btn-red" style={{ fontSize: '.65rem', padding: '.18rem .45rem' }}
                    onClick={async () => { await adminDeleteRecommendation(r.id); router.refresh() }}>✕</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Section>

      {/* FORUM TOPICS (admin view) */}
      <Section icon="💬" title={`Forum — Topics (${forumTopics.length})`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
          {forumTopics.map((t: any) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '.8rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.55rem 1rem' }}>
              <span style={{ fontSize: '.83rem', flex: 1 }}>{t.is_social ? '💬 ' : '📌 '}{t.title}</span>
              {!t.is_social && (
                <button className="btn btn-red" style={{ fontSize: '.65rem', padding: '.18rem .45rem' }}
                  onClick={async () => {
                    if (!confirm(`Supprimer le topic "${t.title}" et tous ses messages ?`)) return
                    await deleteForumTopic(t.id); router.refresh()
                  }}>✕ Supprimer</button>
              )}
              {t.is_social && <span style={{ fontSize: '.68rem', color: 'var(--text3)' }}>Topic social (non supprimable)</span>}
            </div>
          ))}
          {!forumTopics.length && <div style={{ color: 'var(--text3)', fontSize: '.83rem' }}>Aucun topic.</div>}
        </div>
      </Section>

      {/* TIPIAK (secret) */}
      <Section icon="🏴‍☠️" title="Tipiak — Liens streaming alternatifs (secret)">
        <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Ces liens apparaissent dans l'easter egg secret "tipiak". Non visible dans le tableau des easter eggs officiels.
        </div>
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.8rem' }}>
          <input placeholder="Nom de la plateforme" value={tipiakLabel} onChange={e => setTipiakLabel(e.target.value)} maxLength={60}
            style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.5rem .75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.83rem' }} />
          <input placeholder="https://..." value={tipiakUrl} onChange={e => setTipiakUrl(e.target.value)} maxLength={500} type="url"
            style={{ flex: 2, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.5rem .75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.83rem' }} />
          <button className="btn btn-outline" disabled={!tipiakLabel.trim() || !tipiakUrl.trim()}
            onClick={async () => {
              const newLinks = [...tipiakLinks, { label: tipiakLabel.trim(), url: tipiakUrl.trim() }]
              const res = await adminSetConfig({ TIPIAK_LINKS: JSON.stringify(newLinks) })
              if (res.error) addToast(res.error, '⚠️')
              else { setTipiakLinks(newLinks); setTipiakLabel(''); setTipiakUrl(''); addToast('Lien ajouté !', '🏴‍☠️') }
            }}
          >Ajouter</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
          {tipiakLinks.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.8rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.5rem .8rem' }}>
              <span style={{ flex: 1, fontSize: '.83rem' }}>{l.label}</span>
              <span style={{ fontSize: '.7rem', color: 'var(--text3)', flex: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.url}</span>
              <button className="btn btn-red" style={{ fontSize: '.65rem', padding: '.18rem .45rem' }}
                onClick={async () => {
                  const newLinks = tipiakLinks.filter((_, j) => j !== i)
                  const res = await adminSetConfig({ TIPIAK_LINKS: JSON.stringify(newLinks) })
                  if (!res.error) setTipiakLinks(newLinks)
                }}>✕</button>
            </div>
          ))}
          {!tipiakLinks.length && <div style={{ color: 'var(--text3)', fontSize: '.83rem' }}>Aucun lien configuré.</div>}
        </div>
      </Section>

      {/* CLIPPY — répliques */}
      <Section icon="📎" title="Clippy — Répliques personnalisées">
        <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Ces répliques remplacent les 60 répliques par défaut de Clippy. Si la liste est vide, les répliques par défaut (codées en dur) sont utilisées.
          Trigger : taper <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}>easter egg</code> au clavier.
        </div>

        {/* Compteur */}
        <div style={{ fontSize: '.75rem', color: 'var(--text3)', marginBottom: '.8rem' }}>
          {clippyReplies.length} réplique{clippyReplies.length !== 1 ? 's' : ''} custom{clippyReplies.length === 0 ? ' — répliques par défaut actives' : ''}
        </div>

        {/* Ajouter */}
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
          <input
            placeholder="Nouvelle réplique de Clippy…"
            value={clippyNewReply}
            onChange={e => setClippyNewReply(e.target.value)}
            onKeyDown={async e => {
              if (e.key !== 'Enter' || !clippyNewReply.trim()) return
              const next = [...clippyReplies, clippyNewReply.trim()]
              const res = await adminSetConfig({ CLIPPY_REPLIES: JSON.stringify(next) })
              if (res.error) addToast(res.error, '⚠️')
              else { setClippyReplies(next); setClippyNewReply(''); addToast('Réplique ajoutée !', '📎') }
            }}
            maxLength={300}
            style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.5rem .75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.83rem' }}
          />
          <button
            className="btn btn-outline"
            disabled={!clippyNewReply.trim() || clippySaving}
            onClick={async () => {
              const next = [...clippyReplies, clippyNewReply.trim()]
              setClippySaving(true)
              const res = await adminSetConfig({ CLIPPY_REPLIES: JSON.stringify(next) })
              setClippySaving(false)
              if (res.error) addToast(res.error, '⚠️')
              else { setClippyReplies(next); setClippyNewReply(''); addToast('Réplique ajoutée !', '📎') }
            }}
          >Ajouter</button>
        </div>

        {/* Reset vers défaut */}
        {clippyReplies.length > 0 && (
          <button
            className="btn btn-red"
            style={{ fontSize: '.72rem', padding: '.3rem .7rem', marginBottom: '1rem' }}
            onClick={async () => {
              if (!confirm('Supprimer toutes les répliques custom ? Clippy utilisera à nouveau ses répliques par défaut.')) return
              const res = await adminSetConfig({ CLIPPY_REPLIES: '[]' })
              if (!res.error) { setClippyReplies([]); addToast('Répliques remises par défaut', '📎') }
            }}
          >Tout supprimer (retour aux défauts)</button>
        )}

        {/* Liste */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', maxHeight: 420, overflowY: 'auto' }}>
          {clippyReplies.map((reply, i) => (
            <div key={i} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.5rem .8rem' }}>
              {clippyEditIdx === i ? (
                <div style={{ display: 'flex', gap: '.4rem', alignItems: 'flex-start' }}>
                  <textarea
                    value={clippyEditVal}
                    onChange={e => setClippyEditVal(e.target.value.slice(0, 300))}
                    autoFocus
                    rows={2}
                    style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.4rem .6rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.82rem', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                    <button className="btn btn-gold" style={{ fontSize: '.65rem', padding: '.2rem .5rem' }}
                      onClick={async () => {
                        const next = clippyReplies.map((r, j) => j === i ? clippyEditVal.trim() : r)
                        const res = await adminSetConfig({ CLIPPY_REPLIES: JSON.stringify(next) })
                        if (!res.error) { setClippyReplies(next); setClippyEditIdx(null); addToast('Réplique mise à jour', '📎') }
                        else addToast(res.error, '⚠️')
                      }}>✓</button>
                    <button className="btn btn-outline" style={{ fontSize: '.65rem', padding: '.2rem .5rem' }}
                      onClick={() => setClippyEditIdx(null)}>✕</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.7rem' }}>
                  <span style={{ fontSize: '.6rem', color: 'var(--text3)', flexShrink: 0, marginTop: '.15rem', minWidth: 22, textAlign: 'right' }}>#{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '.82rem', color: 'var(--text2)', lineHeight: 1.45 }}>{reply}</span>
                  <div style={{ display: 'flex', gap: '.25rem', flexShrink: 0 }}>
                    <button className="btn btn-outline" style={{ fontSize: '.65rem', padding: '.18rem .45rem' }}
                      onClick={() => { setClippyEditIdx(i); setClippyEditVal(reply) }}>✏️</button>
                    <button className="btn btn-red" style={{ fontSize: '.65rem', padding: '.18rem .45rem' }}
                      onClick={async () => {
                        const next = clippyReplies.filter((_, j) => j !== i)
                        const res = await adminSetConfig({ CLIPPY_REPLIES: JSON.stringify(next) })
                        if (!res.error) setClippyReplies(next)
                        else addToast(res.error, '⚠️')
                      }}>✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!clippyReplies.length && (
            <div style={{ color: 'var(--text3)', fontSize: '.83rem', fontStyle: 'italic' }}>
              Aucune réplique custom — les 60 répliques codées en dur sont utilisées.
            </div>
          )}
        </div>
      </Section>

      {/* Configuration */}
      <ConfigSection serverConfig={serverConfig} siteConfig={siteConfig} onSave={saveConfig} saving={savingConfig} />

      {/* Clôture de saison */}
      <Section icon="📚" title={`Clôture — Saison ${serverConfig.SAISON_NUMERO}`}>
        <div style={{ fontSize: '.82rem', color: 'var(--text2)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Cette action <strong style={{ color: 'var(--text)' }}>archive le classement actuel</strong> de la Saison {serverConfig.SAISON_NUMERO} dans les archives permanentes,
          puis <strong style={{ color: 'var(--text)' }}>remet à zéro l'EXP de saison</strong> de tous les joueurs (l'EXP total cumulé est conservé).
        </div>
        <div style={{ background: 'rgba(232,90,90,.08)', border: '1px solid rgba(232,90,90,.25)', borderRadius: 'var(--r)', padding: '.75rem 1rem', marginBottom: '1rem', fontSize: '.78rem', color: '#ff9999' }}>
          ⚠️ Action irréversible. Lance uniquement à la fin de la saison. Une nouvelle saison peut ensuite démarrer avec un nouveau <code>marathon_start</code>.
        </div>
        <button
          className="btn"
          style={{ background: 'var(--red)', color: '#fff', border: 'none', opacity: endingseason ? .5 : 1 }}
          disabled={endingseason}
          onClick={async () => {
            if (!confirm(`Clôturer définitivement la Saison ${serverConfig.SAISON_NUMERO} et archiver le classement ?`)) return
            setEndingSeason(true)
            const res = await adminEndSeason(serverConfig.SAISON_NUMERO)
            setEndingSeason(false)
            if (res.error) addToast(res.error, '⚠️')
            else { addToast(`Saison ${serverConfig.SAISON_NUMERO} archivée ! EXP saison remis à zéro.`, '📚'); router.refresh() }
          }}
        >
          {endingseason ? '…archivage en cours' : `📚 Clôturer la Saison ${serverConfig.SAISON_NUMERO}`}
        </button>
      </Section>

      {/* Edit film modal */}
      {editFilm && (
        <EditFilmModal
          film={editFilm}
          onClose={() => setEditFilm(null)}
          onSave={async (updates) => {
            const result = await updateFilm(editFilm.id, updates)
            if (result.error) { addToast(result.error, '⚠️'); return false }
            addToast(`"${editFilm.titre}" mis à jour`, '✅')
            setEditFilm(null)
            router.refresh()
            return true
          }}
        />
      )}
    </div>
  )
}

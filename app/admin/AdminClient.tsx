'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { adminCreateDuel, adminCloseDuel, adminSetWeekFilm, adminDeleteFilm, adminDeleteUser, adminGrantExp, adminCleanDuels, adminApproveFlaggedFilm, adminFetchFilmPoster, adminUploadFilmPoster, adminRefreshMissingPosters, adminForceRefreshAllPosters, updateFilm, adminResolveReport, adminSetConfig, adminVerifyPosters } from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'
import { CONFIG } from '@/lib/config'
import type { Film, Profile } from '@/lib/supabase/types'
import type { ServerConfig } from '@/lib/serverConfig'

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

interface Props {
  profile: Profile
  films: Film[]
  users: any[]
  duels: any[]
  weekFilm: any
  totalUsers: number
  watchCountMap: Record<number, number>
  flaggedFilms: Film[]
  reports: any[]
  siteConfig: Record<string, string>
  serverConfig: ServerConfig
}

export default function AdminClient({ profile, films, users, duels, weekFilm, totalUsers, watchCountMap, flaggedFilms, reports, siteConfig, serverConfig }: Props) {
  const { addToast } = useToast()
  const router = useRouter()
  const [posterLoading, setPosterLoading] = useState<Record<number, boolean>>({})
  const [editFilm, setEditFilm] = useState<Film | null>(null)
  const [allPostersNextId, setAllPostersNextId] = useState<number | null>(0)
  const [allPostersRunning, setAllPostersRunning] = useState(false)
  const [brokenPosters, setBrokenPosters] = useState<{ id: number; titre: string; poster: string }[]>([])
  const [verifyNextId, setVerifyNextId] = useState<number | null>(0)
  const [verifyRunning, setVerifyRunning] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)

  function getWatchPct(filmId: number) {
    if (!totalUsers) return 0
    return Math.round(((watchCountMap[filmId] ?? 0) / totalUsers) * 100)
  }

  async function createDuel() {
    const eligible = films.filter(f => f.saison === 1 && getWatchPct(f.id) < CONFIG.SEUIL_MAJORITY)
    if (eligible.length < 2) { addToast('Pas assez de films éligibles', '⚠️'); return }
    const sorted = [...eligible].sort((a, b) => getWatchPct(a.id) - getWatchPct(b.id)).slice(0, Math.min(10, eligible.length))
    let f1 = sorted[0], f2 = sorted[1]
    let tries = 0
    while (f1.id === f2.id && tries < 20) {
      f1 = sorted[Math.floor(Math.random() * sorted.length)]
      f2 = sorted[Math.floor(Math.random() * sorted.length)]
      tries++
    }
    const weekNum = duels.length + 1
    const result = await adminCreateDuel(f1.id, f2.id, weekNum)
    if (result.error) addToast(result.error, '⚠️')
    else { addToast(`Duel S${weekNum} créé : ${f1.titre} VS ${f2.titre}`, '⚔️'); router.refresh() }
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

  async function approveFilm(filmId: number, titre: string) {
    const result = await adminApproveFlaggedFilm(filmId)
    if (result.error) addToast(result.error, '⚠️')
    else { addToast(`"${titre}" approuvé`, '✅'); router.refresh() }
  }

  async function rejectFilm(filmId: number, titre: string) {
    if (!confirm(`Retirer "${titre}" de la liste (film -18 ans refusé) ?`)) return
    await adminDeleteFilm(filmId)
    addToast(`"${titre}" retiré`, '🗑️')
    router.refresh()
  }

  const Section = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
    <div style={{ background: 'rgba(232,90,90,.04)', border: '1px solid rgba(232,90,90,.18)', borderRadius: 'var(--rl)', padding: '1.3rem', marginBottom: '1.2rem' }}>
      <div style={{ fontSize: '.68rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '1rem' }}>
        {icon} {title}
      </div>
      {children}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Administration</div>
        <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>Accès restreint · {CONFIG.SAISON_LABEL}</div>
      </div>

      {/* 18+ alert banner */}
      {flaggedFilms.length > 0 && (
        <div style={{ background: 'rgba(232,90,90,.12)', border: '2px solid var(--red)', borderRadius: 'var(--rl)', padding: '1rem 1.3rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '.8rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🔞</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: '.9rem' }}>
              {flaggedFilms.length} film{flaggedFilms.length > 1 ? 's' : ''} interdit{flaggedFilms.length > 1 ? 's' : ''} aux moins de 18 ans en attente de validation
            </div>
            <div style={{ fontSize: '.76rem', color: 'var(--text2)', marginTop: '.2rem' }}>
              Voir la section « Films 18+ » ci-dessous pour approuver ou refuser.
            </div>
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
            Générer un duel aléatoire (films les moins vus)
          </button>
          <button className="btn btn-red" onClick={cleanDuels} style={{ fontSize: '.8rem' }}>
            🗑️ Nettoyer tous les duels
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
              <span style={{ flex: 1, fontSize: '.85rem', fontWeight: 500 }}>{u.pseudo}</span>
              <span style={{ fontSize: '.72rem', color: 'var(--text3)' }}>S{u.saison}</span>
              <span style={{ fontSize: '.8rem', color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{u.exp} EXP</span>
              <span style={{ fontSize: '.72rem', color: 'var(--text2)' }}>🎬 {u.watched?.length ?? 0}</span>
              <button className="btn btn-green" style={{ fontSize: '.7rem', padding: '.22rem .55rem' }} onClick={() => grantExp(u.id, u.pseudo, 10)}>+10 EXP</button>
              {!u.is_admin && (
                <button className="btn btn-red" style={{ fontSize: '.7rem', padding: '.22rem .55rem' }} onClick={() => deleteUser(u.id, u.pseudo)}>✕</button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* 18+ flagged films */}
      {flaggedFilms.length > 0 && (
        <Section icon="🔞" title={`Films +18 ans à valider (${flaggedFilms.length})`}>
          <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginBottom: '.8rem' }}>
            Ces films ont une certification 18+ (FR) ou R/NC-17 (US) détectée par TMDB. Approuve-les s'ils conviennent au groupe, ou rejette-les.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            {flaggedFilms.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '.7rem', background: 'rgba(232,90,90,.07)', border: '1px solid rgba(232,90,90,.3)', borderRadius: 'var(--r)', padding: '.6rem 1rem', flexWrap: 'wrap' }}>
                <span style={{ flex: 1, fontSize: '.85rem', fontWeight: 500 }}>{f.titre} <span style={{ color: 'var(--text3)', fontSize: '.72rem' }}>({f.annee}) · {f.realisateur}</span></span>
                <button className="btn btn-green" style={{ fontSize: '.73rem', padding: '.28rem .65rem' }} onClick={() => approveFilm(f.id, f.titre)}>✓ Approuver</button>
                <button className="btn btn-red" style={{ fontSize: '.73rem', padding: '.28rem .65rem' }} onClick={() => rejectFilm(f.id, f.titre)}>✕ Refuser</button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Films */}
      <Section icon="🎥" title={`Films (${films.length})`}>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginBottom: '.8rem' }}>
          <button className="btn btn-outline" style={{ fontSize: '.78rem' }} onClick={refreshAllPosters}>
            🔄 Affiches manquantes (lot de 30)
          </button>
          <button
            className="btn btn-outline"
            style={{ fontSize: '.78rem' }}
            disabled={allPostersRunning || allPostersNextId === null}
            onClick={forceRefreshAll}
          >
            {allPostersRunning ? '…' : allPostersNextId === null ? '✅ Tout traité' : '🔄 Tout rafraîchir depuis TMDB (lot de 50)'}
          </button>
          <button
            className="btn btn-outline"
            style={{ fontSize: '.78rem' }}
            disabled={verifyRunning || verifyNextId === null}
            onClick={verifyPostersBatch}
          >
            {verifyRunning ? '…' : verifyNextId === null ? `✅ Vérifié (${brokenPosters.length} cassée(s))` : `🔍 Vérifier les URLs (lot de 40)`}
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

      {/* Configuration */}
      <ConfigSection serverConfig={serverConfig} siteConfig={siteConfig} onSave={saveConfig} saving={savingConfig} />

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

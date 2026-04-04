'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { adminCreateDuel, adminCloseDuel, adminSetWeekFilm, adminDeleteFilm, adminDeleteUser, adminGrantExp, adminCleanDuels, adminApproveFlaggedFilm, adminBatchFlaggedDecisions, adminSet18Flag, adminApproveAllPending, adminFetchFilmPoster, adminUploadFilmPoster, adminRefreshMissingPosters, adminForceRefreshAllPosters, adminFetchFrenchPosters, adminScanAgeRestrictions, updateFilm, adminResolveReport, adminSetConfig, adminVerifyPosters, adminSetAdmin, adminAddNews, adminDeleteNews, adminAddRecommendation, adminDeleteRecommendation, deleteForumTopic, adminEndSeason } from '@/lib/actions'
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

      <Sub label="Règles du marathon (texte affiché sur l'accueil)" />
      <textarea
        value={vals['MARATHON_RULES'] ?? ''}
        onChange={e => setVals(v => ({ ...v, MARATHON_RULES: e.target.value }))}
        rows={8}
        placeholder="Décris ici les règles du marathon. Ce texte s'affiche sur la page d'accueil."
        style={{ ...inputStyle, resize: 'vertical' }}
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
  reports: any[]
  siteConfig: Record<string, string>
  serverConfig: ServerConfig
  news: any[]
  recommendations: any[]
  forumTopics: any[]
}

export default function AdminClient({ profile, films, users, duels, weekFilm, totalUsers, watchCountMap, flaggedFilms, pendingFilms18, reports, siteConfig, serverConfig, news, recommendations, forumTopics }: Props) {
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
  const [flag18Overrides, setFlag18Overrides] = useState<Record<number, boolean>>({})
  const [flag18Saving, setFlag18Saving] = useState<Record<number, boolean>>({})
  const [flag18Filter, setFlag18Filter] = useState<'all' | '18' | 'normal'>('all')
  const [localPending, setLocalPending] = useState<Film[]>(pendingFilms18)
  const [approveAllLoading, setApproveAllLoading] = useState(false)
  const [showAllFilms18, setShowAllFilms18] = useState(false)
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
    let nextId: number | null = 0
    let total = 0
    let totalPending = 0
    const allDetails: typeof ageScanDetails = []
    while (nextId !== null) {
      const result = await adminScanAgeRestrictions(nextId)
      if (result.error) { addToast(result.error, '⚠️'); break }
      total += result.count ?? 0
      totalPending += result.pendingCount ?? 0
      if (result.details) allDetails.push(...result.details)
      nextId = result.nextId ?? null
      if (nextId !== null) await new Promise(r => setTimeout(r, 600))
    }
    setAgeScanNextId(null)
    setAgeScanRunning(false)
    setAgeScanDetails(allDetails)
    addToast(`✅ ${total} film(s) scannés — ${totalPending} détecté(s) 18+`, '🔞')
    router.refresh()
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
      setFlag18Overrides(prev => ({ ...prev, [film.id]: is18 }))
      setLocalPending(prev => prev.filter(f => f.id !== film.id))
      addToast(is18 ? `🔞 "${film.titre}" confirmé 18+` : `✓ "${film.titre}" — pas 18+, film conservé`, '✅')
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

      {/* Section 18+ — Films en attente de confirmation CNC + liste complète optionnelle */}
      <Section icon="🔞" title={`Vérification 18+ CNC${localPending.length > 0 ? ` — ${localPending.length} à confirmer` : ' — à jour'}`}>

        {/* Films détectés 18+ par le scan → confirmation requise */}
        {localPending.length > 0 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '.9rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '.78rem', color: 'var(--text2)', lineHeight: 1.5 }}>
                Ces films ont été détectés <strong style={{ color: 'var(--red)' }}>18+ par TMDB/CNC</strong>. Confirme ou refuse — le film n'est <em>jamais</em> supprimé.
              </div>
              <button
                type="button"
                disabled={approveAllLoading}
                onClick={approveAllPending}
                style={{ flexShrink: 0, padding: '.4rem 1rem', borderRadius: 'var(--r)', border: '1px solid rgba(232,90,90,.5)', background: 'rgba(232,90,90,.15)', color: 'var(--red)', fontSize: '.78rem', fontWeight: 700, cursor: approveAllLoading ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}
              >
                {approveAllLoading ? '⏳ En cours…' : `🔞 Valider tous (${localPending.length})`}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: '.5rem', padding: '0 .5rem', marginBottom: '.3rem' }}>
              <div style={{ fontSize: '.65rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text3)' }}>Film détecté 18+ (CNC)</div>
              <div style={{ fontSize: '.65rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--red)', textAlign: 'center' }}>🔞 Oui</div>
              <div style={{ fontSize: '.65rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--green)', textAlign: 'center' }}>✓ Non</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', marginBottom: '1rem' }}>
              {localPending.map(f => {
                const saving = !!flag18Saving[f.id]
                return (
                  <div key={f.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: '.5rem', alignItems: 'center',
                    background: 'rgba(232,90,90,.07)', border: '1px solid rgba(232,90,90,.25)',
                    borderRadius: 'var(--r)', padding: '.5rem .8rem', opacity: saving ? 0.6 : 1,
                  }}>
                    <span style={{ fontSize: '.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.titre}
                      <span style={{ color: 'var(--text3)', fontSize: '.7rem', marginLeft: '.35rem' }}>({f.annee}) · {f.realisateur}</span>
                    </span>
                    <button type="button" disabled={saving}
                      onClick={() => { lockScrollFor150ms(); setFilm18(f, true) }}
                      style={{ width: '100%', padding: '.38rem 0', borderRadius: 'var(--r)', border: '1px solid rgba(232,90,90,.4)', cursor: saving ? 'default' : 'pointer', fontSize: '.8rem', fontWeight: 700, background: 'transparent', color: 'var(--red)', transition: 'background .12s' }}
                    >{saving ? '…' : 'Oui'}</button>
                    <button type="button" disabled={saving}
                      onClick={() => { lockScrollFor150ms(); setFilm18(f, false) }}
                      style={{ width: '100%', padding: '.38rem 0', borderRadius: 'var(--r)', border: '1px solid rgba(79,217,138,.35)', cursor: saving ? 'default' : 'pointer', fontSize: '.8rem', fontWeight: 700, background: 'transparent', color: 'var(--green)', transition: 'background .12s' }}
                    >{saving ? '…' : 'Non'}</button>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '.82rem', color: 'var(--green)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <span>✅</span> Aucun film en attente — lance le scanner pour détecter les 18+ automatiquement.
          </div>
        )}

        {/* Séparateur + toggle liste complète */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '.8rem' }}>
          <button
            type="button"
            onClick={() => setShowAllFilms18(v => !v)}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '.78rem', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '.4rem' }}
          >
            <span style={{ transition: 'transform .2s', display: 'inline-block', transform: showAllFilms18 ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
            {showAllFilms18 ? 'Masquer' : 'Afficher'} la liste complète ({films.length} films) — ajustement manuel
          </button>

          {showAllFilms18 && (() => {
            const count18 = films.filter(f => (flag18Overrides[f.id] ?? f.flagged_18plus)).length
            const filtered18 = films.filter(f => {
              const is18 = flag18Overrides[f.id] ?? f.flagged_18plus
              if (flag18Filter === '18') return is18
              if (flag18Filter === 'normal') return !is18
              return true
            })
            return (
              <div style={{ marginTop: '.8rem' }}>
                <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.7rem', flexWrap: 'wrap' }}>
                  {([['all', `Tous (${films.length})`], ['18', `🔞 18+ (${count18})`], ['normal', `✓ Normal (${films.length - count18})`]] as [typeof flag18Filter, string][]).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setFlag18Filter(val)} style={{
                      padding: '.3rem .7rem', borderRadius: 99, fontSize: '.73rem', cursor: 'pointer',
                      border: `1px solid ${flag18Filter === val ? 'var(--red)' : 'var(--border2)'}`,
                      background: flag18Filter === val ? 'rgba(232,90,90,.15)' : 'var(--bg3)',
                      color: flag18Filter === val ? 'var(--red)' : 'var(--text2)',
                      fontWeight: flag18Filter === val ? 600 : 400,
                    }}>{label}</button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: '.4rem', padding: '0 .5rem', marginBottom: '.3rem' }}>
                  <div style={{ fontSize: '.6rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text3)' }}>Film</div>
                  <div style={{ fontSize: '.6rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--red)', textAlign: 'center' }}>🔞 18+</div>
                  <div style={{ fontSize: '.6rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--green)', textAlign: 'center' }}>✓ Normal</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', maxHeight: 420, overflowY: 'auto' }}>
                  {filtered18.map(f => {
                    const is18 = flag18Overrides[f.id] ?? f.flagged_18plus
                    const saving = !!flag18Saving[f.id]
                    return (
                      <div key={f.id} style={{
                        display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: '.4rem', alignItems: 'center',
                        background: is18 ? 'rgba(232,90,90,.06)' : 'var(--bg3)',
                        border: `1px solid ${is18 ? 'rgba(232,90,90,.25)' : 'var(--border)'}`,
                        borderRadius: 'var(--r)', padding: '.45rem .75rem', opacity: saving ? 0.6 : 1,
                      }}>
                        <span style={{ fontSize: '.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {is18 && <span style={{ marginRight: '.3rem', fontSize: '.68rem' }}>🔞</span>}
                          {f.titre}
                          <span style={{ color: 'var(--text3)', fontSize: '.68rem', marginLeft: '.3rem' }}>({f.annee})</span>
                        </span>
                        <button type="button" disabled={saving} onClick={() => { lockScrollFor150ms(); setFilm18(f, true) }} style={{ width: '100%', padding: '.35rem 0', borderRadius: 'var(--r)', border: '1px solid', cursor: saving ? 'default' : 'pointer', fontSize: '.75rem', fontWeight: 600, transition: 'all .15s', background: is18 ? 'rgba(232,90,90,.22)' : 'transparent', borderColor: is18 ? 'rgba(232,90,90,.5)' : 'var(--border)', color: is18 ? 'var(--red)' : 'var(--text3)' }}>{saving ? '…' : 'Oui'}</button>
                        <button type="button" disabled={saving} onClick={() => { lockScrollFor150ms(); setFilm18(f, false) }} style={{ width: '100%', padding: '.35rem 0', borderRadius: 'var(--r)', border: '1px solid', cursor: saving ? 'default' : 'pointer', fontSize: '.75rem', fontWeight: 600, transition: 'all .15s', background: !is18 ? 'rgba(79,217,138,.12)' : 'transparent', borderColor: !is18 ? 'rgba(79,217,138,.4)' : 'var(--border)', color: !is18 ? 'var(--green)' : 'var(--text3)' }}>{saving ? '…' : 'Non'}</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
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
            disabled={ageScanRunning}
            onClick={scanAgeRestrictionsAuto}
          >
            {ageScanRunning ? '⏳ Scan âge en cours…' : '🔞 Scanner restrictions d\'âge'}
          </button>
        </div>
        {ageScanDetails && ageScanDetails.length > 0 && (
          <div style={{ background: 'rgba(0,0,0,.15)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 'var(--r)', padding: '.75rem', marginBottom: '.6rem', maxHeight: '300px', overflowY: 'auto' }}>
            <div style={{ fontSize: '.72rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '.4rem' }}>
              📋 Résultats du scan — {ageScanDetails.filter(d => d.flagged18).length} film(s) 18+ détecté(s) sur {ageScanDetails.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
              {ageScanDetails.map(d => (
                <div key={d.id} style={{ fontSize: '.68rem', display: 'flex', gap: '.5rem', alignItems: 'center', color: d.flagged18 ? 'var(--red)' : d.status === 'no_tmdb' ? 'var(--text3)' : d.status.startsWith('error') ? 'orange' : 'var(--text2)' }}>
                  <span style={{ minWidth: '14px' }}>{d.flagged18 ? '🔞' : d.status === 'no_tmdb' ? '?' : d.status.startsWith('error') ? '⚠' : '✓'}</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.titre}</span>
                  <span style={{ color: 'var(--text3)', flexShrink: 0 }}>
                    {d.status === 'no_tmdb' ? 'pas de TMDB' : d.status.startsWith('error') ? d.status : Object.entries(d.certs).map(([k, v]) => `${k}:${v}`).join(' ') || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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

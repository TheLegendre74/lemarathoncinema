'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Poster from '@/components/Poster'
import Forum from '@/components/Forum'
import { useToast } from '@/components/ToastProvider'
import { toggleWatched, markWatched, upsertRating, upsertNegativeRating, addFilm, updateFilm, reportFilm, discoverEgg, getFilmWatchProviders, adminSetFilmCategory, setFilmRattrapage, submitMarathonWatchRequest, addFilmToWatchlist, removeFilmFromWatchlist, createWatchlist } from '@/lib/actions'
import type { TMDBSuggestion } from '@/lib/tmdb'
import { CONFIG } from '@/lib/config'
import { useRouter } from 'next/navigation'
import JawsScrollOverlay from '@/components/JawsScrollOverlay'
import type { Film, Profile } from '@/lib/supabase/types'

interface WatchlistInfo {
  id: string
  name: string
  watchlist_items: { film_id: number }[]
}

interface Props {
  films: Film[]
  profile: Profile | null
  watchedIds: number[]
  watchedPreMap: Record<number, boolean>
  myRatings: Record<number, number>
  myNegativeRatings: Record<number, number>
  watchCountMap: Record<number, number>
  ratingMap: Record<number, number[]>
  negativeRatingMap: Record<number, number[]>
  totalUsers: number
  weekFilmId: number | null
  isMarathonLive: boolean
  saisonNumero: number
  age18confirmed: boolean
  hasRageuxEgg: boolean
  rattrapageMap: Record<number, string>
  userWatchlists: WatchlistInfo[]
  preMarathonWindowUntil: string | null
}

function avgRating(scores: number[] | undefined) {
  if (!scores?.length) return null
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
}

// ─── GODFATHER 8-BIT THEME (Web Audio) ──────────────────────────────────────
function playGodfatherTheme() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const notes: [number, number, number][] = [
      [329.6, 0, .5], [246.9, .6, .35], [329.6, 1.0, .4],
      [220, 1.5, .65], [207.6, 2.25, .35], [329.6, 2.7, .5],
      [220, 3.3, .4], [246.9, 3.8, .8],
    ]
    notes.forEach(([f, t, d]) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'triangle'; osc.frequency.value = f
      gain.gain.setValueAtTime(0.12, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d)
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + d + .1)
    })
  } catch {}
}


// ─── FILM MODAL ──────────────────────────────────────────────────────────────
function FilmModal({ film, profile, isWatched, watchedPre, myRating, myNegativeRating, watchPct, ratingScores, negativeRatingScores, isWeekFilm, isMarathonLive, canMarkPre, hasRageuxEgg, watchlists, watchlistFilmMap, onWatchlistToggle, onWatchlistCreate, onClose, onRefresh }: {
  film: Film; profile: Profile | null; isWatched: boolean; watchedPre: boolean | null; myRating: number | undefined; myNegativeRating: number | undefined
  watchPct: number; ratingScores: number[]; negativeRatingScores: number[]; isWeekFilm: boolean
  isMarathonLive: boolean; canMarkPre: boolean; hasRageuxEgg: boolean
  watchlists: WatchlistInfo[]; watchlistFilmMap: Record<number, string[]>
  onWatchlistToggle: (watchlistId: string, filmId: number) => Promise<void>
  onWatchlistCreate: (name: string, filmId: number) => Promise<void>
  onClose: () => void; onRefresh: () => void
}) {
  const [tab, setTab] = useState<'info' | 'streaming' | 'forum'>('info')
  const [hov, setHov] = useState(0)
  const [negHov, setNegHov] = useState(0)
  const [posterErr, setPosterErr] = useState(false)
  const [overview, setOverview] = useState<string | null>(null)
  const [ratePrompt, setRatePrompt] = useState(false)
  const [promptHov, setPromptHov] = useState(0)
  const [promptRating, setPromptRating] = useState(0)
  const [editingGenre, setEditingGenre] = useState(false)
  const [genreVal, setGenreVal] = useState(film.genre)
  const [reporting, setReporting] = useState(false)

  // Lazy-load du synopsis — non inclus dans le chargement initial (450 films)
  useEffect(() => {
    setOverview(null)
    fetch(`/api/films/${film.id}/overview`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.overview) setOverview(d.overview) })
      .catch(() => {})
  }, [film.id])
  const [reportReason, setReportReason] = useState('')
  const [wlDropOpen, setWlDropOpen] = useState(false)
  const [wlModalNewName, setWlModalNewName] = useState('')
  const [wlModalCreating, setWlModalCreating] = useState(false)
  // Limite quotidienne marathon
  const [marathonLimitState, setMarathonLimitState] = useState<null | 'limit_reached' | 'pending' | 'blocked'>(null)
  const [requestMsg, setRequestMsg] = useState('')
  const [requestSending, setRequestSending] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()

  const isAuthor = profile != null && film.added_by === profile.id
  const avg = avgRating(ratingScores)
  type WP = { provider_id: number; provider_name: string; logo_path: string }
  const [providers, setProviders] = useState<{ link?: string; flatrate?: WP[]; rent?: WP[]; buy?: WP[] } | null | 'loading'>('loading')

  useEffect(() => {
    if (tab !== 'streaming') return
    if (providers !== 'loading') return
    getFilmWatchProviders((film as any).tmdb_id ?? null).then(setProviders)
  }, [tab, film, providers])

  // URL directe du film sur JustWatch (fournie par TMDB) ou fallback recherche par titre
  const justWatchUrl = (providers && providers !== 'loading' && providers.link)
    ? providers.link
    : `https://www.justwatch.com/fr/films?q=${encodeURIComponent(film.titre)}`
  const expGain = isWeekFilm ? CONFIG.EXP_FDLS : CONFIG.EXP_FILM

  // ── Easter eggs ─────────────────────────────────────────────
  const isInception       = film.titre.toLowerCase().includes('inception')
  const isGodfather       = film.titre.toLowerCase().includes('parrain') || film.titre.toLowerCase().includes('godfather')
  const [inceptionClicks, setInceptionClicks] = useState(0)
  const [inceptionTilt, setInceptionTilt]     = useState(false)
  const [godfatherOverlay, setGodfatherOverlay] = useState(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Inception: 5 clicks on poster → tilt
  function handlePosterClick() {
    if (!isInception) return
    const n = inceptionClicks + 1
    setInceptionClicks(n)
    if (n >= 5) {
      setInceptionTilt(true)
      setInceptionClicks(0)
      discoverEgg('inception')
      document.documentElement.style.transition = 'transform 1.6s ease'
      document.documentElement.style.transform  = 'rotate(45deg)'
      setTimeout(() => {
        document.documentElement.style.transform = 'rotate(0deg)'
        setTimeout(() => {
          document.documentElement.style.transition = ''
          document.documentElement.style.transform  = ''   // supprime le transform pour ne pas casser position:fixed
          setInceptionTilt(false)
        }, 1600)
      }, 3200)
    }
  }

  // Godfather: idle 30s → hand & theme
  useEffect(() => {
    if (!isGodfather) return
    idleTimerRef.current = setTimeout(() => {
      setGodfatherOverlay(true)
      playGodfatherTheme()
      discoverEgg('godfather')
    }, 30_000)
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current) }
  }, [isGodfather])

  async function handleToggle() {
    await toggleWatched(film.id, film.titre)
    addToast(isWatched ? `"${film.titre}" retiré` : `+${expGain} EXP — "${film.titre}" vu !`, '🎬')
    onRefresh()
  }

  async function handleMarkPre() {
    const res = await markWatched(film.id, true)
    if (res?.error === 'PRE_WINDOW_EXPIRED') {
      addToast('Ta fenêtre pré-marathon de 24h est expirée.', '⚠️')
      return
    }
    if (res?.error) { addToast(res.error, '⚠️'); return }
    addToast(res?.action === 'removed' ? `"${film.titre}" retiré` : `"${film.titre}" marqué vu (pré-marathon)`, '🎬')
    onRefresh()
  }

  async function handleMarkMarathon() {
    const res = await markWatched(film.id, false)
    if (res?.error === 'LIMIT_REACHED') { setMarathonLimitState('limit_reached'); return }
    if (res?.error === 'PENDING_REQUEST') { setMarathonLimitState('pending'); return }
    if (res?.error === 'BLOCKED') { setMarathonLimitState('blocked'); return }
    if (res?.error) { addToast(res.error, '⚠️'); return }
    if (res?.action === 'added') {
      addToast(`+${CONFIG.EXP_FILM} EXP — "${film.titre}" vu pendant le marathon !`, '🎬')
      if (!myRating) setRatePrompt(true)
    } else {
      addToast(`"${film.titre}" retiré`, '🎬')
    }
    onRefresh()
  }

  async function handleSubmitRequest() {
    setRequestSending(true)
    const res = await submitMarathonWatchRequest(requestMsg)
    setRequestSending(false)
    if (res?.error) { addToast(res.error, '⚠️'); return }
    setRequestSent(true)
    setMarathonLimitState('pending')
  }

  async function handlePromptRate(score: number) {
    await upsertRating(film.id, score)
    addToast(`Note ${score}/10 enregistrée !`, '⭐')
    setRatePrompt(false)
    setPromptRating(0)
    onRefresh()
  }

  async function handleRate(score: number) {
    await upsertRating(film.id, score)
    addToast(`Note ${score}/10 enregistrée`, '⭐')
    onRefresh()
  }

  async function handleNegativeRate(score: number) {
    await upsertNegativeRating(film.id, score)
    addToast(`Note négative ${score}/10 enregistrée`, '🔵')
    onRefresh()
  }

  async function handleReport() {
    const result = await reportFilm(film.id, reportReason)
    if (result.error) { addToast(result.error, '⚠️'); return }
    addToast('Signalement envoyé à l\'admin', '✅')
    setReporting(false)
    setReportReason('')
  }

  async function handleSaveGenre() {
    const result = await updateFilm(film.id, { genre: genreVal })
    if (result.error) { addToast(result.error, '⚠️'); return }
    addToast('Genre mis à jour', '✅')
    setEditingGenre(false)
    onRefresh()
  }

  return (
    <div className="modal-wrap" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {/* Hero / Poster */}
        <div
          style={{ position: 'relative', height: 420, overflow: 'hidden', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isInception ? 'pointer' : 'default' }}
          onClick={handlePosterClick}
          title={isInception ? 'Cliquer 5 fois...' : undefined}
        >
          {film.poster && !posterErr
            ? <Image src={film.poster} alt={film.titre} fill style={{ objectFit: 'contain', objectPosition: 'center' }} sizes="500px" unoptimized onError={() => setPosterErr(true)} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>🎬</div>
          }
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, var(--bg2) 100%)' }} />
          <button onClick={e => { e.stopPropagation(); onClose() }} style={{ position: 'absolute', top: '1rem', right: '1rem', width: 34, height: 34, borderRadius: '50%', background: 'rgba(8,8,14,.75)', border: '1px solid var(--border2)', color: 'var(--text2)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          {isInception && inceptionClicks > 0 && inceptionClicks < 5 && (
            <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.7)', color: '#aaa', fontSize: '.65rem', padding: '3px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>
              {inceptionClicks}/5...
            </div>
          )}
        </div>

        <div style={{ padding: '1.5rem' }}>
          {film.flagged_18plus && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '.6rem',
              background: 'rgba(180,0,0,.12)',
              border: '2px solid rgba(220,30,30,.6)',
              borderRadius: 'var(--r)', padding: '.75rem 1rem', marginBottom: '1rem',
              boxShadow: '0 0 16px rgba(220,30,30,.2)',
            }}>
              <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>🔞</span>
              <div>
                <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#ff6b6b', letterSpacing: '.5px', marginBottom: '.15rem' }}>
                  INTERDIT AUX MOINS DE 18 ANS
                </div>
                <div style={{ fontSize: '.7rem', color: 'rgba(255,107,107,.75)', lineHeight: 1.4 }}>
                  Violence extrême, gore ou sexualité explicite. Contenu très choquant pouvant heurter la sensibilité.
                </div>
              </div>
            </div>
          )}
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', lineHeight: 1.1, marginBottom: '.35rem' }}>{film.titre}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.6rem', marginBottom: '1.2rem' }}>
            <span style={{ fontSize: '.75rem', color: 'var(--text2)' }}>{film.annee}</span>
            <span style={{ color: 'var(--text3)' }}>·</span>
            <span style={{ fontSize: '.75rem', color: 'var(--text2)' }}>{film.realisateur}</span>
            <span className="tag">{film.genre}</span>
            {film.sousgenre && <span className="tag" style={{ opacity: .7 }}>{film.sousgenre}</span>}
            {film.saison === 2 && <span className="tag" style={{ color: 'var(--red)', borderColor: 'rgba(232,90,90,.3)' }}>Saison 2</span>}
            {avg && <span className="tag" style={{ color: 'var(--gold)', borderColor: 'rgba(232,196,106,.3)' }}>⭐ {avg}/10 ({ratingScores.length})</span>}
            <span className="tag">{watchPct}% vus</span>
            {isWeekFilm && <span className="tag" style={{ color: 'var(--gold)', borderColor: 'rgba(232,196,106,.4)', fontWeight: 600 }}>⭐ Film de la semaine · +{CONFIG.EXP_FDLS} EXP</span>}
          </div>

          {/* Synopsis — chargé à la demande */}
          {overview && (
            <p style={{ fontSize: '.82rem', color: 'var(--text2)', lineHeight: 1.6, margin: '0 0 1.2rem', fontStyle: 'italic' }}>
              {overview}
            </p>
          )}

          {/* Stars + watched : invité → message de connexion */}
          {!profile ? (
            <div style={{ background: 'rgba(232,196,106,.06)', border: '1px solid rgba(232,196,106,.2)', borderRadius: 'var(--r)', padding: '1rem', marginBottom: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', marginBottom: '.4rem' }}>🔒</div>
              <div style={{ fontSize: '.83rem', color: 'var(--text2)', marginBottom: '.6rem' }}>
                Connecte-toi pour noter ce film et marquer comme vu
              </div>
              <a href="/auth" style={{ display: 'inline-block', background: 'var(--gold)', color: '#0a0a0f', fontWeight: 600, fontSize: '.8rem', padding: '.45rem 1.1rem', borderRadius: 'var(--r)', textDecoration: 'none' }}>
                Se connecter / S'inscrire
              </a>
            </div>
          ) : (
            <>
              {/* Stars positives */}
              <div style={{ marginBottom: '.6rem' }}>
                <div style={{ fontSize: '.7rem', color: 'var(--text3)', marginBottom: '.4rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Ta note positive {avgRating(ratingScores) ? <span style={{ color: 'var(--gold)', textTransform: 'none', letterSpacing: 0 }}>· moy. {avgRating(ratingScores)}/10 ({ratingScores.length})</span> : ''}
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <span key={n} onMouseEnter={() => setHov(n)} onMouseLeave={() => setHov(0)} onClick={() => handleRate(n)}
                      style={{ fontSize: '1.1rem', cursor: 'pointer', color: (hov || (myRating ?? 0)) >= n ? 'var(--gold)' : 'var(--text3)', transition: 'transform .1s', transform: (hov || (myRating ?? 0)) >= n ? 'scale(1.15)' : 'scale(1)' }}>
                      ★
                    </span>
                  ))}
                </div>
              </div>

              {/* Stars négatives (bleues) — visible uniquement pour les rageuxs */}
              {hasRageuxEgg && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '.7rem', color: 'var(--text3)', marginBottom: '.4rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Ta note négative {avgRating(negativeRatingScores) ? <span style={{ color: '#60a5fa', textTransform: 'none', letterSpacing: 0 }}>· moy. {avgRating(negativeRatingScores)}/10 ({negativeRatingScores.length})</span> : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                      <span key={n} onMouseEnter={() => setNegHov(n)} onMouseLeave={() => setNegHov(0)} onClick={() => handleNegativeRate(n)}
                        style={{ fontSize: '1.1rem', cursor: 'pointer', color: (negHov || (myNegativeRating ?? 0)) >= n ? '#60a5fa' : 'var(--text3)', transition: 'transform .1s', transform: (negHov || (myNegativeRating ?? 0)) >= n ? 'scale(1.15)' : 'scale(1)' }}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Watched buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1rem' }}>
                {film.saison === 2 ? (
                  <div style={{ background: 'rgba(232,90,90,.06)', border: '1px solid rgba(232,90,90,.25)', borderRadius: 'var(--r)', padding: '.85rem 1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#ff9999', marginBottom: '.3rem' }}>🔒 Disponible en Saison 2</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text3)', lineHeight: 1.5 }}>Ce film a été ajouté pendant le marathon et sera disponible lors de la prochaine saison. Tu pourras le marquer vu à partir de la Saison 2 !</div>
                  </div>
                ) : <>
                {/* Pré-marathon : grisé si marathon en cours, sauf fenêtre 24h accordée */}
                <button
                  className={`btn ${isWatched && watchedPre === true ? 'btn-green' : 'btn-outline'} btn-full`}
                  onClick={canMarkPre ? handleMarkPre : undefined}
                  disabled={!canMarkPre}
                  style={!canMarkPre ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
                  title={!canMarkPre ? 'Le marathon est en cours — utilise le bouton ci-dessous' : undefined}
                >
                  {isWatched && watchedPre === true ? '✓ Vu avant le marathon — Retirer' : '🎬 J\'ai vu ce film (pré-marathon)'}
                </button>

                {/* Marathon : actif uniquement pendant le marathon */}
                {isMarathonLive && marathonLimitState === 'limit_reached' ? (
                  /* Formulaire de demande */
                  <div style={{ background: 'rgba(232,196,106,.06)', border: '1px solid rgba(232,196,106,.25)', borderRadius: 'var(--r)', padding: '1rem' }}>
                    <div style={{ fontSize: '.8rem', color: 'var(--gold)', fontWeight: 600, marginBottom: '.4rem' }}>⚠️ Limite de 3 films/jour atteinte</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text2)', marginBottom: '.7rem', lineHeight: 1.5 }}>
                      Tu as atteint la limite quotidienne pendant le marathon. Tu peux envoyer une demande à l'admin avec un message explicatif (optionnel).
                    </div>
                    {requestSent ? (
                      <div style={{ fontSize: '.78rem', color: 'var(--green)', textAlign: 'center', padding: '.5rem' }}>✓ Demande envoyée ! L'admin examinera ta requête.</div>
                    ) : (
                      <>
                        <textarea
                          value={requestMsg}
                          onChange={e => setRequestMsg(e.target.value.slice(0, 300))}
                          placeholder="Message pour l'admin (optionnel, 300 caractères max)..."
                          rows={3}
                          style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.5rem .75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.78rem', resize: 'vertical', outline: 'none', marginBottom: '.5rem', boxSizing: 'border-box' }}
                        />
                        <button
                          onClick={handleSubmitRequest}
                          disabled={requestSending}
                          className="btn btn-gold btn-full"
                          style={{ fontSize: '.8rem' }}
                        >
                          {requestSending ? 'Envoi...' : '📨 Envoyer la demande à l\'admin'}
                        </button>
                      </>
                    )}
                  </div>
                ) : isMarathonLive && marathonLimitState === 'pending' ? (
                  <div style={{ background: 'rgba(255,160,60,.07)', border: '1px solid rgba(255,160,60,.3)', borderRadius: 'var(--r)', padding: '.75rem 1rem', fontSize: '.78rem', color: 'var(--orange)', textAlign: 'center' }}>
                    ⏳ Demande en attente d'examen par l'admin
                  </div>
                ) : isMarathonLive && marathonLimitState === 'blocked' ? (
                  <div style={{ background: 'rgba(232,90,90,.07)', border: '1px solid rgba(232,90,90,.3)', borderRadius: 'var(--r)', padding: '.75rem 1rem', fontSize: '.78rem', color: 'var(--red)', textAlign: 'center' }}>
                    🔒 Ajout bloqué temporairement (24h)
                  </div>
                ) : (
                  <button
                    className={`btn ${isWatched && watchedPre === false ? 'btn-green' : 'btn-outline'} btn-full`}
                    onClick={isMarathonLive ? handleMarkMarathon : undefined}
                    disabled={!isMarathonLive}
                    title={!isMarathonLive ? 'Le marathon n\'a pas encore commencé' : undefined}
                    style={!isMarathonLive ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                  >
                    {isWatched && watchedPre === false
                      ? '✓ Vu pendant le marathon — Retirer'
                      : `🏆 J'ai vu ce film pendant le marathon (+${CONFIG.EXP_FILM} EXP)`}
                  </button>
                )}
                </>}
              </div>

              {/* Watchlist button */}
              <div style={{ position: 'relative', marginTop: '.5rem' }}>
                <button
                  onClick={() => { setWlDropOpen(o => !o); setWlModalNewName('') }}
                  className="btn btn-outline btn-full"
                  style={{ fontSize: '.83rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', color: watchlistFilmMap[film.id]?.length ? '#c084fc' : 'var(--text2)', borderColor: watchlistFilmMap[film.id]?.length ? 'rgba(160,90,232,.35)' : undefined, background: watchlistFilmMap[film.id]?.length ? 'rgba(160,90,232,.06)' : undefined }}
                >
                  📋 {watchlistFilmMap[film.id]?.length
                    ? `Dans ${watchlistFilmMap[film.id].length} watchlist${watchlistFilmMap[film.id].length > 1 ? 's' : ''}`
                    : 'Ajouter à une watchlist'}
                </button>
                {wlDropOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.5rem', marginTop: '.3rem', boxShadow: '0 8px 24px rgba(0,0,0,.6)' }}>
                    {watchlists.length === 0 && (
                      <div style={{ fontSize: '.75rem', color: 'var(--text3)', padding: '.3rem .4rem', marginBottom: '.4rem' }}>Aucune watchlist — crée-en une ci-dessous</div>
                    )}
                    {watchlists.map(wl => {
                      const inList = watchlistFilmMap[film.id]?.includes(wl.id)
                      return (
                        <button key={wl.id} onClick={() => onWatchlistToggle(wl.id, film.id)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '.5rem', background: inList ? 'rgba(160,90,232,.1)' : 'transparent', border: 'none', borderRadius: 6, padding: '.4rem .6rem', fontSize: '.8rem', color: inList ? '#c084fc' : 'var(--text2)', cursor: 'pointer', textAlign: 'left', transition: 'background .1s', marginBottom: '.2rem' }}>
                          <span style={{ fontSize: '.9rem', width: 18 }}>{inList ? '✓' : '+'}</span>
                          <span>{wl.name}</span>
                        </button>
                      )
                    })}
                    <div style={{ borderTop: watchlists.length > 0 ? '1px solid var(--border)' : 'none', marginTop: watchlists.length > 0 ? '.4rem' : 0, paddingTop: watchlists.length > 0 ? '.4rem' : 0, display: 'flex', gap: '.4rem' }}>
                      <input
                        value={wlModalNewName}
                        onChange={e => setWlModalNewName(e.target.value.slice(0, 40))}
                        onKeyDown={e => { if (e.key === 'Enter' && wlModalNewName.trim()) { setWlModalCreating(true); onWatchlistCreate(wlModalNewName, film.id).then(() => { setWlModalCreating(false); setWlModalNewName('') }) } }}
                        placeholder="Nouvelle liste…"
                        style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 6, padding: '.4rem .6rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.8rem', outline: 'none' }}
                      />
                      <button
                        onClick={() => { if (!wlModalNewName.trim()) return; setWlModalCreating(true); onWatchlistCreate(wlModalNewName, film.id).then(() => { setWlModalCreating(false); setWlModalNewName('') }) }}
                        disabled={wlModalCreating || !wlModalNewName.trim()}
                        style={{ background: 'var(--gold)', border: 'none', borderRadius: 6, padding: '.4rem .75rem', fontSize: '.8rem', color: '#0a0a0f', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}
                      >
                        {wlModalCreating ? '…' : '+'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.2rem', overflowX: 'auto' }}>
            {[{ k: 'info', l: 'Infos' }, { k: 'streaming', l: '📺 Où regarder' }, { k: 'forum', l: '💬 Forum' }].map(t => (
              <button key={t.k} onClick={() => setTab(t.k as any)}
                style={{ padding: '.55rem 1.1rem', fontSize: '.82rem', color: tab === t.k ? 'var(--gold)' : 'var(--text2)', cursor: 'pointer', background: 'none', border: 'none', borderBottom: tab === t.k ? '2px solid var(--gold)' : '2px solid transparent', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>
                {t.l}
              </button>
            ))}
          </div>

          {tab === 'info' && (
            <div>
              <div className="progress-label"><span>Visionné par</span><span>{watchPct}% des joueurs</span></div>
              <div className="expbar" style={{ height: 6, marginBottom: '1rem' }}>
                <div className="expbar-fill" style={{ width: `${watchPct}%`, height: 6, background: watchPct >= CONFIG.SEUIL_MAJORITY ? 'var(--text3)' : undefined }} />
              </div>
              {watchPct >= CONFIG.SEUIL_MAJORITY && (
                <div style={{ fontSize: '.78rem', color: 'var(--text2)', background: 'rgba(255,255,255,.04)', borderRadius: 'var(--r)', padding: '.6rem .8rem', marginBottom: '.8rem' }}>
                  ⚠️ Plus de {CONFIG.SEUIL_MAJORITY}% des joueurs ont vu ce film — il est grisé et exclu des duels.
                </div>
              )}
              {/* Signaler une erreur */}
              <div style={{ marginTop: '.8rem', borderTop: '1px solid var(--border)', paddingTop: '.8rem' }}>
                {reporting ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    <input
                      value={reportReason}
                      onChange={e => setReportReason(e.target.value)}
                      placeholder="Décris le problème (affiche incorrecte, mauvais titre…)"
                      style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.5rem .75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.83rem' }}
                    />
                    <div style={{ display: 'flex', gap: '.5rem' }}>
                      <button className="btn btn-red" style={{ fontSize: '.78rem', flex: 1 }} onClick={handleReport} disabled={!reportReason.trim()}>Envoyer le signalement</button>
                      <button className="btn btn-outline" style={{ fontSize: '.78rem' }} onClick={() => { setReporting(false); setReportReason('') }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-outline" style={{ fontSize: '.75rem', color: 'var(--text3)' }} onClick={() => setReporting(true)}>
                    ⚠️ Signaler une erreur
                  </button>
                )}
              </div>

              {isAuthor && (
                <div style={{ marginTop: '.8rem', borderTop: '1px solid var(--border)', paddingTop: '.8rem' }}>
                  <div style={{ fontSize: '.68rem', color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '.5rem' }}>
                    Tu as proposé ce film
                  </div>
                  {editingGenre ? (
                    <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                      <select
                        value={genreVal}
                        onChange={e => setGenreVal(e.target.value)}
                        style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.5rem .7rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.85rem' }}
                      >
                        {['Action','Animation','Aventure','Comédie','Crime','Drame','Fantaisie','Guerre','Horreur','Policier','SF','Thriller','Western'].map(g => (
                          <option key={g}>{g}</option>
                        ))}
                      </select>
                      <button className="btn btn-gold" style={{ fontSize: '.78rem', padding: '.4rem .75rem' }} onClick={handleSaveGenre}>Sauvegarder</button>
                      <button className="btn btn-outline" style={{ fontSize: '.78rem', padding: '.4rem .75rem' }} onClick={() => { setEditingGenre(false); setGenreVal(film.genre) }}>Annuler</button>
                    </div>
                  ) : (
                    <button className="btn btn-outline" style={{ fontSize: '.78rem' }} onClick={() => setEditingGenre(true)}>
                      ✏️ Modifier le genre
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'streaming' && (
            <div>
              {providers === 'loading' && (
                <div style={{ fontSize: '.82rem', color: 'var(--text3)', padding: '.5rem 0' }}>Recherche des plateformes…</div>
              )}
              {providers && providers !== 'loading' && (() => {
                const flatrate = providers.flatrate ?? []
                const rentBuy = [...(providers.rent ?? []), ...(providers.buy ?? [])]
                const seen = new Set<number>()
                const deduped = rentBuy.filter(p => { if (seen.has(p.provider_id)) return false; seen.add(p.provider_id); return true })
                return (
                  <>
                    {flatrate.map(p => (
                      <a key={p.provider_id} href={justWatchUrl} target="_blank" rel="noopener noreferrer" className="streaming-platform">
                        <Image src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} alt={p.provider_name} width={32} height={32} style={{ borderRadius: 6, objectFit: 'cover' }} unoptimized />
                        <span style={{ flex: 1, fontSize: '.88rem', fontWeight: 500, color: 'var(--text)' }}>{p.provider_name}</span>
                        <span className="sp-type svod">Abonnement</span>
                        <span style={{ fontSize: '.8rem', color: 'var(--text3)' }}>↗</span>
                      </a>
                    ))}
                    {deduped.map(p => (
                      <a key={p.provider_id} href={justWatchUrl} target="_blank" rel="noopener noreferrer" className="streaming-platform">
                        <Image src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} alt={p.provider_name} width={32} height={32} style={{ borderRadius: 6, objectFit: 'cover' }} unoptimized />
                        <span style={{ flex: 1, fontSize: '.88rem', fontWeight: 500, color: 'var(--text)' }}>{p.provider_name}</span>
                        <span className="sp-type tvod">Location/Achat</span>
                        <span style={{ fontSize: '.8rem', color: 'var(--text3)' }}>↗</span>
                      </a>
                    ))}
                  </>
                )
              })()}
              {/* JustWatch fallback — toujours visible */}
              {providers !== 'loading' && (
                <a href={justWatchUrl} target="_blank" rel="noopener noreferrer" className="streaming-platform" style={{ opacity: .75 }}>
                  <div className="sp-icon" style={{ background: '#1e2030', color: '#fff' }}>🔍</div>
                  <span style={{ flex: 1, fontSize: '.85rem', color: 'var(--text2)' }}>Toutes les plateformes — JustWatch</span>
                  <span style={{ fontSize: '.8rem', color: 'var(--text3)' }}>↗</span>
                </a>
              )}
              {/* IMDB link si tmdb_id dispo */}
              {(film as any).tmdb_id && providers !== 'loading' && (
                <a href={`https://www.imdb.com/find/?q=${encodeURIComponent(film.titre)}&s=tt&ttype=ft`} target="_blank" rel="noopener noreferrer" className="streaming-platform" style={{ opacity: .65 }}>
                  <div className="sp-icon" style={{ background: '#f5c518', color: '#000', fontWeight: 700, fontSize: '.7rem' }}>IMDb</div>
                  <span style={{ flex: 1, fontSize: '.85rem', color: 'var(--text2)' }}>Voir sur IMDb</span>
                  <span style={{ fontSize: '.8rem', color: 'var(--text3)' }}>↗</span>
                </a>
              )}
              <div style={{ fontSize: '.73rem', color: 'var(--text3)', marginTop: '.6rem', lineHeight: 1.5, fontStyle: 'italic', background: 'rgba(255,255,255,.03)', borderRadius: 'var(--r)', padding: '.6rem .8rem' }}>
                ℹ️ Les disponibilités peuvent varier. Les liens JustWatch listent toujours les options légales les plus récentes.
              </div>
            </div>
          )}

          {tab === 'forum' && (
            <Forum topic={`film_${film.id}`} profile={profile} filmTitle={film.titre} />
          )}
        </div>
      </div>

      {/* Inception dream message */}
      {inceptionTilt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.2rem,4vw,2rem)', color: '#fff', textShadow: '0 2px 20px rgba(0,0,0,.9)', animation: 'ee-dream-msg .8s ease', transform: 'rotate(-45deg)', textAlign: 'center', padding: '0 2rem' }}>
            Tu es encore en train de rêver.
          </div>
        </div>
      )}

      {/* Godfather rose overlay */}
      {godfatherOverlay && (
        <div onClick={() => setGodfatherOverlay(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', cursor: 'pointer', paddingBottom: '6rem' }}>
          <div style={{ textAlign: 'center', animation: 'ee-hand-rise 2s ease' }}>
            <div style={{ fontSize: '5rem', lineHeight: 1 }}>🤌🌹</div>
            <div style={{ fontFamily: 'var(--font-display)', color: '#d4a256', fontSize: 'clamp(1rem,3vw,1.4rem)', marginTop: '1rem', textShadow: '0 2px 12px rgba(0,0,0,.9)' }}>
              "Je vais lui faire une offre qu'il ne pourra pas refuser."
            </div>
            <div style={{ color: 'var(--text3)', fontSize: '.72rem', marginTop: '1rem' }}>— Cliquer pour fermer —</div>
          </div>
        </div>
      )}

      {/* Rate after marathon watch prompt */}
      {ratePrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,8,14,.88)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--rxl)', padding: '2rem 1.5rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⭐</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '.5rem' }}>Note ce film !</div>
            <div style={{ fontSize: '.83rem', color: 'var(--text2)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Tu viens de marquer <strong style={{ color: 'var(--text)' }}>{film.titre}</strong> comme vu pendant le marathon.<br />Quelle note lui donnes-tu ?
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '.25rem', marginBottom: '.5rem' }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <span
                  key={n}
                  onMouseEnter={() => setPromptHov(n)}
                  onMouseLeave={() => setPromptHov(0)}
                  onClick={() => setPromptRating(n)}
                  style={{ fontSize: '1.4rem', cursor: 'pointer', color: (promptHov || promptRating) >= n ? 'var(--gold)' : 'var(--text3)', transition: 'transform .1s', transform: (promptHov || promptRating) >= n ? 'scale(1.2)' : 'scale(1)', lineHeight: 1 }}
                >
                  ★
                </span>
              ))}
            </div>
            {promptRating > 0 && (
              <div style={{ fontSize: '.78rem', color: 'var(--gold)', marginBottom: '1rem' }}>{promptRating}/10</div>
            )}
            <div style={{ display: 'flex', gap: '.7rem', justifyContent: 'center', marginTop: '1.2rem' }}>
              <button className="btn btn-ghost" onClick={() => { setRatePrompt(false); setPromptRating(0) }}>Plus tard</button>
              <button className="btn btn-gold" disabled={!promptRating} onClick={() => handlePromptRate(promptRating)}>Enregistrer ma note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ADD FILM MODAL ──────────────────────────────────────────────────────────
const GENRES_LIST = ['Action','Animation','Aventure','Comédie','Crime','Drame','Fantaisie','Guerre','Horreur','Policier','SF','Thriller','Western']

function AddFilmModal({ profile, isMarathonLive, saisonNumero, films, onClose, onRefresh }: {
  profile: Profile; isMarathonLive: boolean; saisonNumero: number
  films: Film[]; onClose: () => void; onRefresh: () => void
}) {
  const { addToast } = useToast()
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [watchedStatus, setWatchedStatus] = useState<'none' | 'pre' | 'marathon'>('none')
  const [titre, setTitre] = useState('')
  const [annee, setAnnee] = useState('')
  const [realisateur, setRealisateur] = useState('')
  const [genre, setGenre] = useState('')
  const [sousgenre, setSousgenre] = useState('')
  const [selectedTmdb, setSelectedTmdb] = useState<TMDBSuggestion | null>(null)
  const [tmdbSuggestions, setTmdbSuggestions] = useState<TMDBSuggestion[]>([])
  const [existingMatches, setExistingMatches] = useState<Film[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const skipRef = useRef(false)

  // Un seul effet — déclenché par tout changement de titre, réalisateur, année ou genre
  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return }

    const titreQ = titre.trim()
    const realQ = realisateur.trim()
    const anneeQ = annee.trim()
    const genreQ = genre

    // Filtre immédiat des films déjà dans la liste (pas d'appel réseau)
    const anneeN = anneeQ.length >= 4 ? parseInt(anneeQ) : null
    if (titreQ.length >= 2 || realQ.length >= 2) {
      setExistingMatches(
        films.filter(f => {
          const matchT = !titreQ || f.titre.toLowerCase().includes(titreQ.toLowerCase())
          const matchR = !realQ || f.realisateur.toLowerCase().includes(realQ.toLowerCase())
          const matchA = !anneeN || Math.abs(f.annee - anneeN) <= 1
          const matchG = !genreQ || f.genre === genreQ || f.sousgenre === genreQ
          return matchT && matchR && matchA && matchG
        }).slice(0, 4)
      )
    } else {
      setExistingMatches([])
    }

    // Pas assez de données pour chercher sur TMDB
    if (titreQ.length < 2 && realQ.length < 2) {
      setTmdbSuggestions([])
      setSearching(false)
      clearTimeout(debounceRef.current)
      return
    }

    // Appel TMDB débounce 500ms via API route (fetch classique, pas de server action)
    clearTimeout(debounceRef.current)
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ titre: titreQ, realisateur: realQ, annee: anneeQ, genre: genreQ })
        const res = await fetch(`/api/search-film?${params}`)
        if (!res.ok) { setTmdbSuggestions([]); return }
        const results: TMDBSuggestion[] = await res.json()
        setTmdbSuggestions(Array.isArray(results) ? results : [])
      } catch (e) {
        console.error('[SEARCH] fetch error:', e)
        setTmdbSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 500)

    return () => clearTimeout(debounceRef.current)
  }, [titre, realisateur, annee, genre])

  function selectTmdb(s: TMDBSuggestion) {
    skipRef.current = true
    setSelectedTmdb(s)
    setTitre(s.titre)
    if (s.annee) setAnnee(String(s.annee))
    if (s.realisateur) setRealisateur(s.realisateur)
    if (s.genre && GENRES_LIST.includes(s.genre)) setGenre(s.genre)
    else setGenre('Drame')
    setSousgenre(s.sousgenre && GENRES_LIST.includes(s.sousgenre) ? s.sousgenre : '')
    setTmdbSuggestions([])
    setExistingMatches([])
  }

  function clearSelection() {
    setSelectedTmdb(null)
    setTmdbSuggestions([])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(''); setLoading(true)
    const fd = new FormData()
    fd.set('titre', titre.trim())
    fd.set('annee', annee)
    fd.set('realisateur', realisateur.trim())
    fd.set('genre', genre || 'Drame')
    fd.set('sousgenre', sousgenre)
    if (selectedTmdb) {
      fd.set('tmdb_id', String(selectedTmdb.tmdb_id))
    } else {
      fd.set('is_pending', 'true')
    }
    const result = await addFilm(fd)
    if (result.error) { setErr(result.error); setLoading(false); return }

    if (result.isPending) {
      addToast('Film soumis pour validation admin 📋 — sera visible après approbation', '✅')
    } else if (result.flagged18) {
      addToast('Film ajouté — détecté 18+ par TMDB, en attente de validation admin 🔞', '⚠️')
    } else {
      const s = result.saison
      addToast(s && s > saisonNumero ? `Film réservé pour la Saison ${s} 🔴` : 'Film ajouté à la liste ! 🎬', '✅')
    }

    // Marquer comme vu si l'utilisateur l'a indiqué
    if (!result.isPending && watchedStatus !== 'none' && result.filmId) {
      const pre = watchedStatus === 'pre'
      await markWatched(result.filmId, pre)
      addToast(pre ? 'Marqué vu avant le marathon 👁️' : 'Marqué vu pendant le marathon 🎬', '✅')
    }

    onRefresh(); onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)',
    borderRadius: 'var(--r)', padding: '.5rem .75rem', color: 'var(--text)',
    fontFamily: 'var(--font-body)', fontSize: '.85rem', boxSizing: 'border-box',
  }

  const hasInput = titre.trim().length >= 2 || realisateur.trim().length >= 2
  const hasSuggestions = !selectedTmdb && hasInput && (existingMatches.length > 0 || tmdbSuggestions.length > 0 || searching)
  const canSubmitPending = !selectedTmdb && titre.trim().length >= 2 && realisateur.trim().length >= 2 && annee.length >= 4

  return (
    <div className="modal-wrap" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div style={{ padding: '2rem 1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '1.2rem' }}>Ajouter un film</div>

          {isMarathonLive && (
            <div style={{ background: 'rgba(232,90,90,.07)', border: '1px solid rgba(232,90,90,.22)', borderRadius: 'var(--r)', padding: '.85rem', marginBottom: '1rem', fontSize: '.8rem', color: 'var(--red)', lineHeight: 1.6 }}>
              🔴 Le marathon est en cours. Ce film sera réservé pour la <strong>Saison {saisonNumero + 1}</strong>.
            </div>
          )}

          {/* Selected film banner */}
          {selectedTmdb && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 'var(--r)', padding: '.7rem .9rem', marginBottom: '1rem' }}>
              {selectedTmdb.poster
                ? <img src={selectedTmdb.poster} alt="" style={{ width: 28, height: 42, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                : <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🎬</span>
              }
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'rgba(52,211,153,1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  ✅ {selectedTmdb.titre} {selectedTmdb.annee ? `(${selectedTmdb.annee})` : ''}
                </div>
                <div style={{ fontSize: '.68rem', color: 'rgba(52,211,153,.7)' }}>{selectedTmdb.realisateur} · Identifié sur TMDB</div>
              </div>
              <button type="button" onClick={clearSelection} style={{ background: 'none', border: 'none', color: 'rgba(52,211,153,.6)', cursor: 'pointer', fontSize: '.72rem', flexShrink: 0, padding: '2px 6px' }}>✕ Changer</button>
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* Titre + suggestions dropdown */}
            <div className="field" style={{ position: 'relative', marginBottom: hasSuggestions ? 0 : undefined }}>
              <label>Titre *</label>
              <input
                style={inputStyle}
                value={titre}
                onChange={e => { setTitre(e.target.value); if (selectedTmdb) setSelectedTmdb(null) }}
                placeholder="Ex: The Godfather, Inception…"
                required
                autoComplete="off"
              />
              {searching && (
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(4px)', fontSize: '.7rem', color: 'var(--text3)' }}>⏳</span>
              )}
            </div>

            {/* Suggestions dropdown */}
            {hasSuggestions && (
              <div style={{ border: '1px solid var(--border2)', borderTop: 'none', borderRadius: '0 0 var(--r) var(--r)', background: 'var(--bg2)', marginBottom: '.9rem', maxHeight: 300, overflowY: 'auto' }}>
                {existingMatches.length > 0 && (
                  <div>
                    <div style={{ fontSize: '.6rem', letterSpacing: '1.5px', color: 'var(--text3)', textTransform: 'uppercase', padding: '.4rem .75rem .2rem', borderBottom: '1px solid var(--border)' }}>
                      Déjà dans la liste
                    </div>
                    {existingMatches.map(f => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.5rem .75rem', opacity: .65, cursor: 'default', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '.8rem' }}>🚫</span>
                        <div>
                          <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text2)' }}>{f.titre}</div>
                          <div style={{ fontSize: '.68rem', color: 'var(--text3)' }}>{f.annee} · {f.realisateur} · {f.genre}</div>
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: '.62rem', background: 'rgba(232,90,90,.15)', color: 'var(--red)', borderRadius: 99, padding: '2px 7px', flexShrink: 0 }}>Présent</span>
                      </div>
                    ))}
                  </div>
                )}

                {tmdbSuggestions.length > 0 && (
                  <div>
                    <div style={{ fontSize: '.6rem', letterSpacing: '1.5px', color: 'var(--text3)', textTransform: 'uppercase', padding: '.4rem .75rem .2rem', borderBottom: '1px solid var(--border)' }}>
                      Suggestions TMDB — cliquez pour sélectionner
                    </div>
                    {tmdbSuggestions.map(s => (
                      <div
                        key={s.tmdb_id}
                        onClick={() => selectTmdb(s)}
                        style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.5rem .75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background .15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {s.poster
                          ? <img src={s.poster} alt="" style={{ width: 32, height: 48, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                          : <div style={{ width: 32, height: 48, background: 'var(--bg3)', borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem' }}>🎬</div>
                        }
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '.83rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.titre}
                            {s.titreOriginal && s.titreOriginal !== s.titre && (
                              <span style={{ fontSize: '.7rem', color: 'var(--text3)', marginLeft: '.4rem' }}>({s.titreOriginal})</span>
                            )}
                          </div>
                          <div style={{ fontSize: '.68rem', color: 'var(--text3)', marginTop: 1 }}>
                            {s.annee ?? '?'}{s.realisateur ? ` · ${s.realisateur}` : ''}{s.genre ? ` · ${s.genre}` : ''}
                          </div>
                          {s.overview && <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.35)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.overview}…</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searching && !tmdbSuggestions.length && (
                  <div style={{ padding: '.6rem .75rem', fontSize: '.75rem', color: 'var(--text3)', textAlign: 'center' }}>Recherche TMDB en cours…</div>
                )}
              </div>
            )}

            {/* Réalisateur — triggers search too */}
            <div className="field">
              <label>Réalisateur *</label>
              <input
                style={inputStyle}
                value={realisateur}
                onChange={e => { setRealisateur(e.target.value); if (selectedTmdb) setSelectedTmdb(null) }}
                placeholder="Ex: Francis Ford Coppola"
                required
                autoComplete="off"
              />
            </div>

            {/* Année + Genre */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.7rem' }}>
              <div className="field">
                <label>Année *</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={annee}
                  onChange={e => { setAnnee(e.target.value); if (selectedTmdb) setSelectedTmdb(null) }}
                  placeholder="1972"
                  min="1888"
                  max="2030"
                  required
                />
              </div>
              <div className="field">
                <label>Genre</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={genre} onChange={e => { setGenre(e.target.value); if (selectedTmdb) setSelectedTmdb(null) }}>
                  <option value="">— tous —</option>
                  {GENRES_LIST.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* Sous-genre */}
            <div className="field">
              <label>Sous-genre</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={sousgenre} onChange={e => setSousgenre(e.target.value)}>
                <option value="">— aucun —</option>
                {GENRES_LIST.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>

            {/* Status indicator */}
            {!selectedTmdb && hasInput && !searching && (
              <div style={{ fontSize: '.72rem', color: 'var(--text3)', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.55rem .75rem', marginBottom: '.8rem', lineHeight: 1.5 }}>
                💡 Sélectionnez un film dans les suggestions TMDB pour l'ajouter directement.<br />
                {canSubmitPending && <span style={{ color: '#f5a623' }}>Si le film est introuvable, vous pouvez le <strong>soumettre à l'admin</strong> pour validation manuelle.</span>}
              </div>
            )}

            {/* J'ai vu ce film */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginBottom: '.5rem', fontWeight: 500 }}>J'ai vu ce film…</div>
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                {(['none', 'pre', 'marathon'] as const).map(opt => {
                  const labels: Record<typeof opt, string> = { none: '🚫 Pas encore vu', pre: '⏮️ Avant le marathon', marathon: '🎬 Pendant le marathon' }
                  const active = watchedStatus === opt
                  const disabled = opt === 'marathon' && !isMarathonLive
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={disabled}
                      onClick={() => setWatchedStatus(opt)}
                      style={{
                        fontSize: '.76rem', padding: '.4rem .85rem',
                        borderRadius: 'var(--r)', border: `1px solid ${active ? 'var(--gold)' : 'var(--border2)'}`,
                        background: active ? 'rgba(232,196,106,.15)' : 'var(--bg3)',
                        color: active ? 'var(--gold)' : disabled ? 'var(--text3)' : 'var(--text2)',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? .45 : 1,
                        transition: 'all .15s',
                      }}
                    >
                      {labels[opt]}
                    </button>
                  )
                })}
              </div>
              {watchedStatus === 'marathon' && !isMarathonLive && (
                <div style={{ fontSize: '.68rem', color: 'var(--text3)', marginTop: '.35rem' }}>Le marathon n'est pas en cours.</div>
              )}
            </div>

            {err && <div style={{ color: 'var(--red)', fontSize: '.78rem', marginBottom: '.8rem' }}>{err}</div>}

            <div style={{ display: 'flex', gap: '.7rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Annuler</button>
              {selectedTmdb ? (
                <button type="submit" className="btn btn-gold" disabled={loading} style={{ flex: 1 }}>
                  {loading ? '⏳ Ajout…' : '🎬 Ajouter'}
                </button>
              ) : (
                <button type="submit" className="btn btn-outline" disabled={loading || !canSubmitPending} style={{ flex: 1, borderColor: canSubmitPending ? '#f5a623' : undefined, color: canSubmitPending ? '#f5a623' : undefined }}>
                  {loading ? '⏳ Envoi…' : '📋 Soumettre à l\'admin'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


// ─── MAIN FILMS CLIENT ───────────────────────────────────────────────────────
export default function FilmsClient({ films, profile, watchedIds, watchedPreMap, myRatings, myNegativeRatings, watchCountMap, ratingMap, negativeRatingMap, totalUsers, weekFilmId, isMarathonLive, saisonNumero, age18confirmed, hasRageuxEgg, rattrapageMap: initialRattrapageMap, userWatchlists: initialWatchlists, preMarathonWindowUntil }: Props) {
  const router = useRouter()
  const { addToast } = useToast()
  // Joueurs acceptés en cours de saison : bouton pré-marathon actif pendant 24h
  const canMarkPre = !isMarathonLive || (
    preMarathonWindowUntil != null && new Date(preMarathonWindowUntil) > new Date()
  )
  const [search, setSearch] = useState('')
  const [filterGenre, setFilterGenre] = useState('')
  const [filterDecade, setFilterDecade] = useState('')
  const [filterReal, setFilterReal] = useState('')
  const [modal, setModal] = useState<Film | null>(null)
  const [addModal, setAddModal] = useState(false)
  const [showRestricted18, setShowRestricted18] = useState(age18confirmed)
  const [ageWarnModal, setAgeWarnModal] = useState<18 | null>(null)
  const [adminCategoryOpen, setAdminCategoryOpen] = useState<number | null>(null)
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, 'normal' | '18plus' | 'strange'>>({})
  const [rattrapageOpen, setRattrapageOpen] = useState<number | null>(null)
  const [rattrapageMap, setRattrapageMap] = useState<Record<number, string>>(initialRattrapageMap ?? {})
  const [localWatchedIds, setLocalWatchedIds] = useState<number[]>(watchedIds)
  useEffect(() => { setLocalWatchedIds(watchedIds) }, [watchedIds])
  const watchedSet = useMemo(() => new Set(localWatchedIds), [localWatchedIds])
  // Override optimiste pour la valeur pre (évite l'affichage temporaire "⏳ avant" après un clic marathon)
  const [localPreOverride, setLocalPreOverride] = useState<Record<number, boolean>>({})

  // ── Watchlist state ─────────────────────���──────────────────
  const [watchlists, setWatchlists] = useState<WatchlistInfo[]>(initialWatchlists ?? [])
  const [watchlistDropOpen, setWatchlistDropOpen] = useState<number | null>(null)
  const [wlNewName, setWlNewName] = useState('')
  const [wlCreating, setWlCreating] = useState(false)

  const watchlistFilmMap = useMemo(() => {
    const map: Record<number, string[]> = {}
    watchlists.forEach(wl => {
      wl.watchlist_items.forEach(item => {
        if (!map[item.film_id]) map[item.film_id] = []
        map[item.film_id].push(wl.id)
      })
    })
    return map
  }, [watchlists])

  async function handleWatchlistToggle(e: React.MouseEvent, filmId: number, watchlistId: string) {
    e.stopPropagation()
    const inList = watchlistFilmMap[filmId]?.includes(watchlistId)
    if (inList) {
      await removeFilmFromWatchlist(watchlistId, filmId)
      setWatchlists(prev => prev.map(wl => wl.id === watchlistId
        ? { ...wl, watchlist_items: wl.watchlist_items.filter(i => i.film_id !== filmId) }
        : wl
      ))
    } else {
      await addFilmToWatchlist(watchlistId, filmId)
      setWatchlists(prev => prev.map(wl => wl.id === watchlistId
        ? { ...wl, watchlist_items: [...wl.watchlist_items, { film_id: filmId }] }
        : wl
      ))
    }
  }

  async function handleWlCreate(e: React.MouseEvent, filmId: number) {
    e.stopPropagation()
    if (!wlNewName.trim()) return
    setWlCreating(true)
    const res = await createWatchlist(wlNewName)
    setWlCreating(false)
    if (res.error) { addToast(res.error, 'error'); return }
    const newWl: WatchlistInfo = { id: res.data.id, name: wlNewName.trim(), watchlist_items: [] }
    setWatchlists(prev => [...prev, newWl])
    setWlNewName('')
    await addFilmToWatchlist(res.data.id, filmId)
    setWatchlists(prev => prev.map(wl => wl.id === res.data.id
      ? { ...wl, watchlist_items: [{ film_id: filmId }] }
      : wl
    ))
    addToast(`Ajouté à "${wlNewName.trim()}"`, 'success')
  }

  // Fermer le dropdown watchlist sur clic extérieur
  useEffect(() => {
    if (watchlistDropOpen === null) return
    function handle() { setWatchlistDropOpen(null) }
    document.addEventListener('click', handle)
    return () => document.removeEventListener('click', handle)
  }, [watchlistDropOpen])

  // ── Shark easter egg ───────────────────────────────────────
  const [sharkVisible, setSharkVisible] = useState(false)
  const lastScrollY = useRef(0)
  const sharkTriggered = useRef(false)

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY
      const velocity = y - lastScrollY.current
      lastScrollY.current = y
      const nearBottom = window.innerHeight + y >= document.body.scrollHeight - 80
      if (nearBottom && velocity > 25 && !sharkTriggered.current) {
        sharkTriggered.current = true
        setSharkVisible(true)
        discoverEgg('shark')
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const genres  = useMemo(() => [...new Set(films.map(f => f.genre))].sort(), [films])
  const decades = useMemo(() => [...new Set(films.map(f => Math.floor(f.annee / 10) * 10))].sort(), [films])
  const reals   = useMemo(() => [...new Set(films.map(f => f.realisateur))].sort(), [films])

  const filtered = useMemo(() => films.filter(f => {
    const eff18 = categoryOverrides[f.id] === '18plus' || categoryOverrides[f.id] === 'strange' || (!categoryOverrides[f.id] && f.flagged_18plus)
    if (eff18 && !showRestricted18) return false
    const q = search.toLowerCase()
    return (!q || f.titre.toLowerCase().includes(q) || f.realisateur.toLowerCase().includes(q))
      && (!filterGenre  || f.genre === filterGenre)
      && (!filterDecade || Math.floor(f.annee / 10) * 10 === parseInt(filterDecade))
      && (!filterReal   || f.realisateur === filterReal)
  }), [films, search, filterGenre, filterDecade, filterReal, showRestricted18, categoryOverrides])

  function getWatchPct(filmId: number) {
    if (!totalUsers) return 0
    return Math.round(((watchCountMap[filmId] ?? 0) / totalUsers) * 100)
  }

  function isMajority(filmId: number) { return getWatchPct(filmId) >= CONFIG.SEUIL_MAJORITY }

  async function handleSetCategory(film: Film, category: 'normal' | '18plus' | 'strange') {
    // Optimistic update immédiat
    setCategoryOverrides(prev => ({ ...prev, [film.id]: category }))
    setAdminCategoryOpen(null)
    const result = await adminSetFilmCategory(film.id, category)
    if (result && 'error' in result) {
      // Revert si erreur
      setCategoryOverrides(prev => { const n = { ...prev }; delete n[film.id]; return n })
      addToast(result.error!, '⚠️')
      return
    }
    const label = category === 'normal' ? '✓ Normal' : category === 'strange' ? '🔞 18+ Étrange' : '🔞 18+'
    addToast(`"${film.titre}" → ${label}`, '⚙')
    router.refresh()
  }

  async function handleSetRattrapage(film: Film, niveau: string | null) {
    setRattrapageOpen(null)
    // Optimistic update
    setRattrapageMap(prev => {
      const n = { ...prev }
      if (niveau) n[film.id] = niveau
      else delete n[film.id]
      return n
    })
    const result = await setFilmRattrapage(film.id, niveau)
    if (result && 'error' in result) {
      addToast(result.error!, '⚠️')
      return
    }
    const label = niveau === 'debutant' ? '🎬 Débutant' : niveau === 'intermediaire' ? '🎭 Intermédiaire' : niveau === 'confirme' ? '🏆 Confirmé' : 'retiré du rattrapage'
    addToast(`"${film.titre}" → Rattrapage ${label}`, '📚')
  }

  async function handleQuickToggle(e: React.MouseEvent, filmId: number, filmTitre: string) {
    e.stopPropagation()
    if (!profile) return
    const targetFilm = films.find(f => f.id === filmId)
    if (targetFilm?.saison === 2) return
    const wasWatched = watchedSet.has(filmId)
    if (wasWatched) setLocalWatchedIds(prev => prev.filter(id => id !== filmId))
    else setLocalWatchedIds(prev => [...prev, filmId])
    const res = await toggleWatched(filmId, filmTitre)
    if (res?.error === 'LIMIT_REACHED') {
      setLocalWatchedIds(prev => prev.filter(id => id !== filmId))
      setModal(films.find(f => f.id === filmId) ?? null)
      return
    }
    if (res?.error === 'PENDING_REQUEST' || res?.error === 'BLOCKED') {
      setLocalWatchedIds(prev => prev.filter(id => id !== filmId))
      addToast(res.error === 'BLOCKED' ? '🔒 Ajout bloqué (24h)' : '⏳ Demande en attente d\'examen admin', '⚠️')
      return
    }
    if (res?.error) {
      setLocalWatchedIds(prev => wasWatched ? [...prev, filmId] : prev.filter(id => id !== filmId))
      addToast(res.error, '⚠️')
      return
    }
    addToast(wasWatched ? `"${filmTitre}" retiré` : isMarathonLive ? `+${CONFIG.EXP_FILM} EXP — "${filmTitre}" vu !` : `"${filmTitre}" marqué vu`, '🎬')
    router.refresh()
  }

  // Marquer "vu pendant le marathon" depuis la carte (marathon live uniquement)
  async function handleQuickMarkMarathon(e: React.MouseEvent, filmId: number, filmTitre: string) {
    e.stopPropagation()
    if (!profile) return
    // Optimiste : ajout immédiat + pré=false (marathon)
    setLocalWatchedIds(prev => [...prev, filmId])
    setLocalPreOverride(prev => ({ ...prev, [filmId]: false }))
    const res = await markWatched(filmId, false)
    if (res?.error === 'LIMIT_REACHED') {
      setLocalWatchedIds(prev => prev.filter(id => id !== filmId))
      setLocalPreOverride(prev => { const n = { ...prev }; delete n[filmId]; return n })
      setModal(films.find(f => f.id === filmId) ?? null)
      return
    }
    if (res?.error === 'PENDING_REQUEST' || res?.error === 'BLOCKED') {
      setLocalWatchedIds(prev => prev.filter(id => id !== filmId))
      setLocalPreOverride(prev => { const n = { ...prev }; delete n[filmId]; return n })
      addToast(res.error === 'BLOCKED' ? '🔒 Ajout bloqué (24h)' : '⏳ Demande en attente d\'examen admin', '⚠️')
      return
    }
    if (res?.error) {
      setLocalWatchedIds(prev => prev.filter(id => id !== filmId))
      setLocalPreOverride(prev => { const n = { ...prev }; delete n[filmId]; return n })
      addToast(res.error, '⚠️')
      return
    }
    addToast(`+${CONFIG.EXP_FILM} EXP — "${filmTitre}" vu pendant le marathon !`, '🎬')
    router.refresh()
  }

  function pickRandom() {
    const unwatched = films.filter(f => f.saison === 1 && !watchedSet.has(f.id) && !isMajority(f.id))
    if (!unwatched.length) return
    setModal(unwatched[Math.floor(Math.random() * unwatched.length)])
  }

  const s1Total     = films.filter(f => f.saison === 1).length
  const watchedCount = watchedIds.length
  const pct         = s1Total ? Math.round((watchedCount / s1Total) * 100) : 0

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Films</div>
          <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>{s1Total} films S1 · {watchedCount} vus</div>
        </div>
        {profile && <button className="btn btn-outline" onClick={() => setAddModal(true)}>+ Ajouter un film</button>}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '.8rem', marginBottom: '1.5rem' }}>
        <div className="stat"><div className="stat-l">Films vus</div><div className="stat-v green">{watchedCount}</div></div>
        <div className="stat"><div className="stat-l">Progression S1</div><div className="stat-v gold">{pct}%</div></div>
        <div className="stat"><div className="stat-l">Total films</div><div className="stat-v">{films.length}</div></div>
        <div className="stat"><div className="stat-l">Saison 2</div><div className="stat-v orange">{films.filter(f => f.saison === 2).length}</div></div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '1.3rem' }}>
        <div className="progress-label"><span>Avancement marathon</span><span>{watchedCount}/{s1Total}</span></div>
        <div className="expbar" style={{ height: 10 }}><div className="expbar-fill" style={{ width: `${pct}%`, height: 10 }} /></div>
      </div>

      {/* Random banner */}
      <div onClick={pickRandom} style={{ background: 'linear-gradient(135deg, var(--bg3), var(--bg4))', border: '1px dashed var(--border2)', borderRadius: 'var(--rl)', padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem', cursor: 'pointer', marginBottom: '1.5rem', transition: 'border-color .2s' }}>
        <div style={{ fontSize: '2rem' }}>🎲</div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text)', marginBottom: '.2rem' }}>Film aléatoire</div>
          <div style={{ fontSize: '.78rem', color: 'var(--text2)' }}>Tire un film non vu parmi ceux disponibles</div>
        </div>
        <button className="btn btn-outline" style={{ marginLeft: 'auto' }}>Tirer !</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginBottom: '1.3rem' }}>
        <input style={{ flex: 1, minWidth: 180, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.55rem .9rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.83rem' }}
          placeholder="🔍 Rechercher titre, réalisateur…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.55rem .8rem', color: 'var(--text2)', fontFamily: 'var(--font-body)', fontSize: '.8rem' }} value={filterGenre} onChange={e => setFilterGenre(e.target.value)}>
          <option value="">Genres</option>{genres.map(g => <option key={g}>{g}</option>)}
        </select>
        <select style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.55rem .8rem', color: 'var(--text2)', fontFamily: 'var(--font-body)', fontSize: '.8rem' }} value={filterDecade} onChange={e => setFilterDecade(e.target.value)}>
          <option value="">Décennies</option>{decades.map(d => <option key={d} value={d}>{d}s</option>)}
        </select>
        <select style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.55rem .8rem', color: 'var(--text2)', fontFamily: 'var(--font-body)', fontSize: '.8rem' }} value={filterReal} onChange={e => setFilterReal(e.target.value)}>
          <option value="">Réalisateurs</option>{reals.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Age restriction toggles */}
      <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginBottom: '1.3rem' }}>
        {/* -18 toggle */}
        {(() => {
          const count18 = films.filter(f => {
            const ov = categoryOverrides[f.id]
            return ov === '18plus' || ov === 'strange' || (!ov && f.flagged_18plus)
          }).length
          return count18 > 0 ? (
            <div
              onClick={() => { if (!showRestricted18) setAgeWarnModal(18); else { setShowRestricted18(false); document.cookie = 'age18confirmed=; max-age=0; path=/' } }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '.6rem',
                padding: '.45rem .9rem', borderRadius: 'var(--r)', cursor: 'pointer',
                background: showRestricted18 ? 'rgba(180,0,0,.14)' : 'rgba(255,255,255,.03)',
                border: `1px solid ${showRestricted18 ? 'rgba(220,30,30,.5)' : 'var(--border2)'}`,
                transition: 'all .2s', userSelect: 'none',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                background: showRestricted18 ? 'var(--red)' : 'transparent',
                border: `2px solid ${showRestricted18 ? 'var(--red)' : 'rgba(255,255,255,.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
              }}>
                {showRestricted18 && <span style={{ color: '#fff', fontSize: '.6rem', fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: '.78rem', color: showRestricted18 ? '#ff6b6b' : 'var(--text3)' }}>
                🔞 Films <strong style={{ color: showRestricted18 ? '#ff6b6b' : undefined }}>-18 ans</strong>
              </span>
              <span style={{ fontSize: '.65rem', background: 'rgba(220,30,30,.2)', color: '#ff6b6b', border: '1px solid rgba(220,30,30,.35)', borderRadius: 99, padding: '1px 7px' }}>
                {count18}
              </span>
            </div>
          ) : null
        })()}
      </div>

      {/* Grid */}
      <div className="films-grid" style={{ display: 'grid', gap: '1rem' }}>
        {filtered.map(film => {
          const isWatched = watchedSet.has(film.id)
          const maj    = isMajority(film.id)
          const s2     = film.saison === 2
          const rat    = avgRating(ratingMap[film.id])
          const isWeek = weekFilmId === film.id
          const isAdmin = !!profile?.is_admin
          const catOverride = categoryOverrides[film.id]
          const isStrange  = catOverride === 'strange'  || (!catOverride && (film as any).flagged_18strange)
          const is18       = catOverride === '18plus' || catOverride === 'strange' || (!catOverride && film.flagged_18plus)
          const menuOpen   = adminCategoryOpen === film.id

          const cardGlow = isStrange
            ? { boxShadow: '0 0 0 2px rgba(160,0,220,.85), 0 0 22px rgba(160,0,220,.4)', borderRadius: 'var(--rl)' }
            : is18
            ? { boxShadow: '0 0 0 2px rgba(200,0,0,.8), 0 0 22px rgba(200,0,0,.4)', borderRadius: 'var(--rl)' }
            : undefined

          return (
            <div key={film.id}
              className={`film-card ${isWatched ? 'watched' : ''} ${maj ? 'majority' : ''} ${s2 ? 's2' : ''}`}
              onClick={() => { if (menuOpen) { setAdminCategoryOpen(null); return } if (rattrapageOpen === film.id) { setRattrapageOpen(null); return } setModal(film) }}
              style={cardGlow}
            >
              <div style={{ width: '100%', aspectRatio: '2/3', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--rl) var(--rl) 0 0' }}>
                <Poster film={film} fill style={{ objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,14,.92) 0%, transparent 55%)', opacity: 0, transition: 'opacity .2s', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '.8rem' }} className="poster-hover-overlay">
                  <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, marginBottom: '.15rem' }}>{film.titre}</div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text2)' }}>{film.annee} · {film.realisateur}</div>
                </div>
                {s2 && <div style={{ position: 'absolute', top: 7, left: 7, background: 'rgba(8,8,14,.82)', border: '1px solid rgba(232,90,90,.55)', color: '#ff9999', fontSize: '.58rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, letterSpacing: '.3px', zIndex: 4 }}>🔒 Saison 2</div>}
                {!isWatched && maj && <div style={{ position: 'absolute', top: 7, right: 7, background: 'rgba(255,255,255,.12)', color: '#aaa', fontSize: '.58rem', padding: '2px 7px', borderRadius: 99 }}>60%+</div>}
                {isWeek && <div style={{ position: 'absolute', bottom: 7, left: 7, background: 'var(--gold)', color: '#0a0a0f', fontSize: '.58rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>⭐ SEMAINE</div>}

                {/* Bannière 18+ (rouge) */}
                {is18 && !isStrange && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(180,0,0,1) 0%, rgba(180,0,0,.75) 55%, transparent 100%)', padding: '.5rem .4rem .4rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '.62rem', fontWeight: 900, color: '#fff', letterSpacing: '1px', textTransform: 'uppercase' }}>🔞 18+</div>
                  </div>
                )}

                {/* Bannière 18+ Étrange (violet) */}
                {isStrange && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(120,0,200,1) 0%, rgba(120,0,200,.75) 55%, transparent 100%)', padding: '.5rem .4rem .4rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '.58rem', fontWeight: 900, color: '#f0c0ff', letterSpacing: '1px', textTransform: 'uppercase' }}>🔞 18+ ÉTRANGE</div>
                  </div>
                )}

                {/* Bouton admin catégorie (coin haut gauche) */}
                {isAdmin && (
                  <button
                    onClick={e => { e.stopPropagation(); setAdminCategoryOpen(menuOpen ? null : film.id) }}
                    style={{ position: 'absolute', top: 5, left: 5, background: 'rgba(0,0,0,.7)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 4, padding: '2px 5px', fontSize: '.55rem', color: '#ccc', cursor: 'pointer', zIndex: 10, lineHeight: 1.4 }}
                    title="Catégorie admin"
                  >⚙</button>
                )}

                {/* Bouton admin rattrapage (coin haut droit) */}
                {isAdmin && (
                  <button
                    onClick={e => { e.stopPropagation(); setRattrapageOpen(rattrapageOpen === film.id ? null : film.id); setAdminCategoryOpen(null) }}
                    style={{ position: 'absolute', top: 5, right: 5, background: rattrapageMap[film.id] ? 'rgba(232,196,106,.3)' : 'rgba(0,0,0,.7)', border: `1px solid ${rattrapageMap[film.id] ? 'rgba(232,196,106,.6)' : 'rgba(255,255,255,.25)'}`, borderRadius: 4, padding: '2px 5px', fontSize: '.55rem', color: rattrapageMap[film.id] ? 'var(--gold)' : '#ccc', cursor: 'pointer', zIndex: 10, lineHeight: 1.4 }}
                    title="Rattrapage"
                  >📚</button>
                )}

                {/* Menu admin rattrapage */}
                {isAdmin && rattrapageOpen === film.id && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{ position: 'absolute', top: 24, right: 5, zIndex: 20, background: 'rgba(10,10,20,.97)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 6, padding: '.3rem', display: 'flex', flexDirection: 'column', gap: '.2rem', minWidth: 130 }}
                  >
                    {([
                      { key: 'debutant',     label: '🎬 Débutant',     color: 'var(--green)' },
                      { key: 'intermediaire',label: '🎭 Intermédiaire', color: 'var(--gold)'  },
                      { key: 'confirme',     label: '🏆 Confirmé',      color: 'var(--purple)'},
                      { key: null,           label: '✕ Retirer',        color: '#888'         },
                    ] as const).map(opt => {
                      const active = rattrapageMap[film.id] === opt.key
                      return (
                        <button key={String(opt.key)} onClick={() => handleSetRattrapage(film, opt.key)}
                          style={{ background: active ? 'rgba(255,255,255,.08)' : 'transparent', border: active ? '1px solid rgba(255,255,255,.15)' : '1px solid transparent', borderRadius: 4, padding: '.25rem .4rem', fontSize: '.65rem', color: opt.color, cursor: 'pointer', textAlign: 'left', fontWeight: active ? 700 : 400 }}
                        >{opt.label}</button>
                      )
                    })}
                  </div>
                )}

                {/* Menu admin catégorie */}
                {isAdmin && menuOpen && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{ position: 'absolute', top: 24, left: 5, zIndex: 20, background: 'rgba(10,10,20,.97)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 6, padding: '.3rem', display: 'flex', flexDirection: 'column', gap: '.2rem', minWidth: 110 }}
                  >
                    {([
                      { key: 'normal', label: '✓ Normal', color: '#aaa', bg: 'transparent' },
                      { key: '18plus', label: '🔞 18+', color: '#ff6b6b', bg: 'rgba(180,0,0,.2)' },
                      { key: 'strange', label: '🔞 18+ Étrange', color: '#d0a0ff', bg: 'rgba(120,0,200,.2)' },
                    ] as const).map(opt => {
                      const active = catOverride === opt.key || (!catOverride && (opt.key === 'strange' ? (film as any).flagged_18strange : opt.key === '18plus' ? film.flagged_18plus && !(film as any).flagged_18strange : !film.flagged_18plus))
                      return (
                        <button key={opt.key} onClick={() => handleSetCategory(film, opt.key)}
                          style={{ background: active ? opt.bg : 'transparent', border: active ? `1px solid ${opt.color}40` : '1px solid transparent', borderRadius: 4, padding: '.25rem .4rem', fontSize: '.65rem', color: opt.color, cursor: 'pointer', textAlign: 'left', fontWeight: active ? 700 : 400 }}
                        >{opt.label}</button>
                      )
                    })}
                  </div>
                )}
              </div>
              {/* Badge VU positionné sur la carte (hors du container overflow:hidden) */}
              {isWatched && (() => {
                const ep = film.id in localPreOverride ? localPreOverride[film.id] : watchedPreMap[film.id]
                return (
                  <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', pointerEvents: 'none', zIndex: 5 }}>
                    <div style={{ background: 'var(--green)', color: '#041a0e', fontSize: '.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 99, letterSpacing: '.4px' }}>VU ✓</div>
                    <div style={{ background: ep === false ? 'rgba(249,199,79,.92)' : 'rgba(0,0,0,.78)', color: ep === false ? '#0a0a0f' : 'rgba(255,255,255,.88)', fontSize: '.55rem', fontWeight: 700, padding: '2px 5px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                      {ep === false ? '🏁 marathon' : '⏳ avant'}
                    </div>
                  </div>
                )
              })()}
              <div style={{ padding: '.65rem .75rem .5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '.82rem', fontWeight: 500, lineHeight: 1.3, marginBottom: '.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{film.titre}</div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text3)' }}>
                    {film.annee} · <span className="chip">{film.genre}</span>
                    {film.sousgenre && <span className="chip" style={{ marginLeft: 3, opacity: .7 }}>{film.sousgenre}</span>}
                  </div>
                  <div style={{ minHeight: '1.1rem', marginTop: '.2rem' }}>
                    {rat && <div style={{ fontSize: '.7rem', color: 'var(--gold)' }}>⭐ {rat}/10</div>}
                  </div>
                </div>
                {profile && (
                  <div style={{ marginTop: 'auto', paddingTop: '.35rem' }}>
                  {s2 ? (
                    <div style={{ width: '100%', background: 'rgba(232,90,90,.04)', border: '1px solid rgba(232,90,90,.18)', borderRadius: 6, padding: '.28rem .4rem', fontSize: '.68rem', color: 'rgba(255,120,120,.5)', textAlign: 'center', lineHeight: 1.3, cursor: 'default' }}>
                      🔒 Dispo saison 2
                    </div>
                  ) : (() => {
                    const effectivePre = film.id in localPreOverride ? localPreOverride[film.id] : watchedPreMap[film.id]
                    if (isWatched) {
                      // Film déjà vu — bouton de retrait
                      return (
                        <button
                          onClick={e => handleQuickToggle(e, film.id, film.titre)}
                          style={{ width: '100%', background: 'rgba(79,217,138,.12)', border: '1px solid rgba(79,217,138,.35)', borderRadius: 6, padding: '.28rem .4rem', fontSize: '.68rem', color: 'var(--green)', cursor: 'pointer', fontWeight: 600, transition: 'background .15s', lineHeight: 1.3 }}
                        >
                          {`✓ Vu · ${effectivePre === false ? '🏁 marathon' : '⏳ avant'}`}
                        </button>
                      )
                    }
                    if (isMarathonLive) {
                      // Pendant le marathon : bouton "vu pendant" actif + "vu avant" grisé
                      return (
                        <>
                          <button
                            onClick={e => handleQuickMarkMarathon(e, film.id, film.titre)}
                            style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, padding: '.28rem .4rem', fontSize: '.68rem', color: 'var(--text2)', cursor: 'pointer', lineHeight: 1.3, transition: 'background .15s' }}
                          >
                            🏁 Vu pendant le marathon
                          </button>
                          <button
                            disabled
                            title="Le marathon est en cours — impossible de marquer comme vu avant"
                            style={{ marginTop: '.25rem', width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,.06)', borderRadius: 6, padding: '.22rem .4rem', fontSize: '.62rem', color: 'rgba(255,255,255,.22)', cursor: 'not-allowed', lineHeight: 1.3 }}
                          >
                            ⏳ Vu avant — bloqué
                          </button>
                        </>
                      )
                    }
                    // Avant le marathon
                    return (
                      <button
                        onClick={e => handleQuickToggle(e, film.id, film.titre)}
                        style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, padding: '.28rem .4rem', fontSize: '.68rem', color: 'var(--text2)', cursor: 'pointer', lineHeight: 1.3, transition: 'background .15s' }}
                      >
                        + J&apos;ai vu
                      </button>
                    )
                  })()}

                {/* Bouton watchlist */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={e => { e.stopPropagation(); setWatchlistDropOpen(watchlistDropOpen === film.id ? null : film.id); setWlNewName('') }}
                      style={{
                        marginTop: '.3rem',
                        width: '100%',
                        background: watchlistFilmMap[film.id]?.length ? 'rgba(160,90,232,.12)' : 'rgba(255,255,255,.03)',
                        border: `1px solid ${watchlistFilmMap[film.id]?.length ? 'rgba(160,90,232,.35)' : 'rgba(255,255,255,.08)'}`,
                        borderRadius: 6,
                        padding: '.28rem .4rem',
                        fontSize: '.65rem',
                        color: watchlistFilmMap[film.id]?.length ? '#c084fc' : 'var(--text3)',
                        cursor: 'pointer',
                        transition: 'background .15s, border-color .15s',
                        lineHeight: 1.3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '.3rem',
                      }}
                    >
                      {watchlistFilmMap[film.id]?.length ? `📋 ${watchlistFilmMap[film.id].length} liste${watchlistFilmMap[film.id].length > 1 ? 's' : ''}` : '📋 Watchlist'}
                    </button>

                    {watchlistDropOpen === film.id && (
                      <div
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.6rem', marginBottom: '.4rem', boxShadow: '0 8px 32px rgba(0,0,0,.8)', width: 240 }}
                      >
                        <div style={{ fontSize: '.72rem', color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '.5rem', padding: '0 .3rem' }}>📋 Ajouter à…</div>
                        {watchlists.length === 0 && (
                          <div style={{ fontSize: '.8rem', color: 'var(--text3)', padding: '.3rem .5rem', marginBottom: '.4rem' }}>Aucune watchlist</div>
                        )}
                        {watchlists.map(wl => {
                          const inList = watchlistFilmMap[film.id]?.includes(wl.id)
                          return (
                            <button key={wl.id} onClick={e => handleWatchlistToggle(e, film.id, wl.id)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '.5rem', background: inList ? 'rgba(160,90,232,.15)' : 'rgba(255,255,255,.03)', border: `1px solid ${inList ? 'rgba(160,90,232,.3)' : 'transparent'}`, borderRadius: 6, padding: '.45rem .6rem', fontSize: '.82rem', color: inList ? '#c084fc' : 'var(--text)', cursor: 'pointer', textAlign: 'left', transition: 'background .1s', marginBottom: '.25rem' }}>
                              <span style={{ fontSize: '.9rem', flexShrink: 0 }}>{inList ? '✓' : '○'}</span>
                              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{wl.name}</span>
                            </button>
                          )
                        })}
                        <div style={{ borderTop: '1px solid var(--border)', marginTop: '.4rem', paddingTop: '.5rem' }}>
                          <div style={{ fontSize: '.72rem', color: 'var(--text3)', marginBottom: '.35rem', padding: '0 .2rem' }}>Nouvelle liste</div>
                          <div style={{ display: 'flex', gap: '.4rem' }}>
                            <input
                              value={wlNewName}
                              onChange={e => setWlNewName(e.target.value.slice(0, 40))}
                              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') handleWlCreate(e as any, film.id) }}
                              onClick={e => e.stopPropagation()}
                              placeholder="Nom de la liste…"
                              style={{ flex: 1, minWidth: 0, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 6, padding: '.4rem .6rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.8rem', outline: 'none' }}
                            />
                            <button
                              onMouseDown={e => { e.stopPropagation(); e.preventDefault() }}
                              onClick={e => handleWlCreate(e, film.id)}
                              disabled={wlCreating || !wlNewName.trim()}
                              style={{ background: 'var(--gold)', border: 'none', borderRadius: 6, padding: '.4rem .7rem', fontSize: '.82rem', color: '#0a0a0f', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
                              {wlCreating ? '…' : '+'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty"><div style={{ fontSize: '2.5rem', marginBottom: '.8rem' }}>🔍</div>Aucun film trouvé.</div>
      )}

      {modal && (
        <FilmModal
          film={modal}
          profile={profile}
          isWatched={watchedSet.has(modal.id)}
          watchedPre={watchedSet.has(modal.id) ? (watchedPreMap[modal.id] ?? null) : null}
          myRating={myRatings[modal.id]}
          myNegativeRating={myNegativeRatings[modal.id]}
          watchPct={getWatchPct(modal.id)}
          ratingScores={ratingMap[modal.id] ?? []}
          negativeRatingScores={negativeRatingMap[modal.id] ?? []}
          isWeekFilm={weekFilmId === modal.id}
          isMarathonLive={isMarathonLive}
          canMarkPre={canMarkPre}
          hasRageuxEgg={hasRageuxEgg}
          watchlists={watchlists}
          watchlistFilmMap={watchlistFilmMap}
          onWatchlistToggle={async (wlId, filmId) => {
            const inList = watchlistFilmMap[filmId]?.includes(wlId)
            if (inList) {
              await removeFilmFromWatchlist(wlId, filmId)
              setWatchlists(prev => prev.map(wl => wl.id === wlId ? { ...wl, watchlist_items: wl.watchlist_items.filter(i => i.film_id !== filmId) } : wl))
            } else {
              await addFilmToWatchlist(wlId, filmId)
              setWatchlists(prev => prev.map(wl => wl.id === wlId ? { ...wl, watchlist_items: [...wl.watchlist_items, { film_id: filmId }] } : wl))
            }
          }}
          onWatchlistCreate={async (name, filmId) => {
            const res = await createWatchlist(name)
            if (res.error) { addToast(res.error, 'error'); return }
            const newWl: WatchlistInfo = { id: res.data.id, name: name.trim(), watchlist_items: [] }
            setWatchlists(prev => [...prev, newWl])
            await addFilmToWatchlist(res.data.id, filmId)
            setWatchlists(prev => prev.map(wl => wl.id === res.data.id ? { ...wl, watchlist_items: [{ film_id: filmId }] } : wl))
            addToast(`Ajouté à "${name.trim()}"`, 'success')
          }}
          onClose={() => setModal(null)}
          onRefresh={() => router.refresh()}
        />
      )}

      {addModal && profile && (
        <AddFilmModal
          profile={profile}
          isMarathonLive={isMarathonLive}
          saisonNumero={saisonNumero}
          films={films}
          onClose={() => setAddModal(false)}
          onRefresh={() => router.refresh()}
        />
      )}

      {sharkVisible && <JawsScrollOverlay onDone={() => { setSharkVisible(false); sharkTriggered.current = false }} />}

      {/* Age warning modal */}
      {ageWarnModal !== null && (
        <div className="modal-wrap" onClick={e => e.target === e.currentTarget && setAgeWarnModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div style={{ padding: '2rem 1.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>🔞</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: '#ff6b6b', marginBottom: '.4rem' }}>
                  Films interdits aux -18 ans
                </div>
              </div>
              <div style={{
                background: 'rgba(180,0,0,.1)',
                border: '2px solid rgba(220,30,30,.5)',
                borderRadius: 'var(--r)', padding: '1rem 1.2rem', marginBottom: '1.2rem',
                boxShadow: '0 0 20px rgba(220,30,30,.15)',
              }}>
                <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#ff6b6b', marginBottom: '.5rem', letterSpacing: '.5px' }}>
                  /!\ FILM SOUMIS À UNE RESTRICTION D'ÂGE -18 /!\
                </div>
                <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.75)', lineHeight: 1.7 }}>
                  Ces films contiennent des scènes de <strong style={{ color: '#ffb3b3' }}>violence extrême, gore ou de sexualité explicite</strong> classifiés -18 ans par le CNC. Ils sont déconseillés à tout public sensible.
                </div>
              </div>
              <div style={{ fontSize: '.75rem', color: 'var(--text3)', textAlign: 'center', marginBottom: '1.2rem', lineHeight: 1.5 }}>
                En continuant, tu confirmes avoir 18 ans ou plus<br />et accepter de voir ce contenu.
              </div>
              <div style={{ display: 'flex', gap: '.7rem' }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setAgeWarnModal(null)}>Annuler</button>
                <button
                  className="btn"
                  style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none' }}
                  onClick={() => { setShowRestricted18(true); document.cookie = 'age18confirmed=true; max-age=31536000; path=/; SameSite=Strict'; setAgeWarnModal(null) }}
                >
                  J'ai 18 ans — Afficher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

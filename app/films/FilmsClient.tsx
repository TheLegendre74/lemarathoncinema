'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Poster from '@/components/Poster'
import Forum from '@/components/Forum'
import { useToast } from '@/components/ToastProvider'
import { toggleWatched, markWatched, upsertRating, addFilm, updateFilm, reportFilm, discoverEgg, getFilmWatchProviders, searchFilmTMDB } from '@/lib/actions'
import type { TMDBSuggestion } from '@/lib/actions'
import { CONFIG } from '@/lib/config'
import { useRouter } from 'next/navigation'
import JawsScrollOverlay from '@/components/JawsScrollOverlay'
import type { Film, Profile } from '@/lib/supabase/types'

interface Props {
  films: Film[]
  profile: Profile | null
  watchedIds: number[]
  watchedPreMap: Record<number, boolean>
  myRatings: Record<number, number>
  watchCountMap: Record<number, number>
  ratingMap: Record<number, number[]>
  totalUsers: number
  weekFilmId: number | null
  isMarathonLive: boolean
  saisonNumero: number
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
function FilmModal({ film, profile, isWatched, watchedPre, myRating, watchPct, ratingScores, isWeekFilm, isMarathonLive, onClose, onRefresh }: {
  film: Film; profile: Profile | null; isWatched: boolean; watchedPre: boolean | null; myRating: number | undefined
  watchPct: number; ratingScores: number[]; isWeekFilm: boolean
  isMarathonLive: boolean; onClose: () => void; onRefresh: () => void
}) {
  const [tab, setTab] = useState<'info' | 'streaming' | 'forum'>('info')
  const [hov, setHov] = useState(0)
  const [ratePrompt, setRatePrompt] = useState(false)
  const [promptHov, setPromptHov] = useState(0)
  const [promptRating, setPromptRating] = useState(0)
  const [editingGenre, setEditingGenre] = useState(false)
  const [genreVal, setGenreVal] = useState(film.genre)
  const [reporting, setReporting] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const { addToast } = useToast()
  const router = useRouter()

  const isAuthor = profile != null && film.added_by === profile.id
  const avg = avgRating(ratingScores)
  type WP = { provider_id: number; provider_name: string; logo_path: string }
  const [providers, setProviders] = useState<{ flatrate?: WP[]; rent?: WP[]; buy?: WP[] } | null | 'loading'>('loading')

  useEffect(() => {
    if (tab !== 'streaming') return
    if (providers !== 'loading') return
    getFilmWatchProviders((film as any).tmdb_id ?? null).then(setProviders)
  }, [tab, film, providers])

  const justWatchUrl = `https://www.justwatch.com/fr/films?q=${encodeURIComponent(film.titre)}`
  const expGain = isWeekFilm ? CONFIG.EXP_FDLS : CONFIG.EXP_FILM

  // ── Easter eggs ─────────────────────────────────────────────
  const isInception  = film.titre.toLowerCase().includes('inception')
  const isGodfather  = film.titre.toLowerCase().includes('parrain') || film.titre.toLowerCase().includes('godfather')

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
    if (res?.error) { addToast(res.error, '⚠️'); return }
    addToast(res?.action === 'removed' ? `"${film.titre}" retiré` : `"${film.titre}" marqué vu (pré-marathon)`, '🎬')
    onRefresh()
  }

  async function handleMarkMarathon() {
    const res = await markWatched(film.id, false)
    if (res?.error) { addToast(res.error, '⚠️'); return }
    if (res?.action === 'added') {
      addToast(`+${CONFIG.EXP_FILM} EXP — "${film.titre}" vu pendant le marathon !`, '🎬')
      if (!myRating) setRatePrompt(true)
    } else {
      addToast(`"${film.titre}" retiré`, '🎬')
    }
    onRefresh()
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
          style={{ position: 'relative', height: 280, overflow: 'hidden', cursor: isInception ? 'pointer' : 'default' }}
          onClick={handlePosterClick}
          title={isInception ? 'Cliquer 5 fois...' : undefined}
        >
          {film.poster
            ? <Image src={film.poster} alt={film.titre} fill style={{ objectFit: 'cover' }} sizes="740px" />
            : <div style={{ width: '100%', height: '100%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>🎬</div>
          }
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 25%, var(--bg2) 100%)' }} />
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

          {/* Stars */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '.7rem', color: 'var(--text3)', marginBottom: '.4rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Ta note</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <span key={n} onMouseEnter={() => setHov(n)} onMouseLeave={() => setHov(0)} onClick={() => handleRate(n)}
                  style={{ fontSize: '1.1rem', cursor: 'pointer', color: (hov || (myRating ?? 0)) >= n ? 'var(--gold)' : 'var(--text3)', transition: 'transform .1s', transform: (hov || (myRating ?? 0)) >= n ? 'scale(1.15)' : 'scale(1)' }}>
                  ★
                </span>
              ))}
            </div>
          </div>

          {/* Watched buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1rem' }}>
            {/* Pré-marathon button — always active */}
            <button
              className={`btn ${isWatched && watchedPre === true ? 'btn-green' : 'btn-outline'} btn-full`}
              onClick={handleMarkPre}
            >
              {isWatched && watchedPre === true ? '✓ Vu avant le marathon — Retirer' : '🎬 J\'ai vu ce film (pré-marathon)'}
            </button>
            {/* Marathon button — disabled until marathon is live */}
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
          </div>

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
                        <Image src={`https://image.tmdb.org/t/p/original${p.logo_path}`} alt={p.provider_name} width={32} height={32} style={{ borderRadius: 6, objectFit: 'cover' }} />
                        <span style={{ flex: 1, fontSize: '.88rem', fontWeight: 500, color: 'var(--text)' }}>{p.provider_name}</span>
                        <span className="sp-type svod">Abonnement</span>
                        <span style={{ fontSize: '.8rem', color: 'var(--text3)' }}>↗</span>
                      </a>
                    ))}
                    {deduped.map(p => (
                      <a key={p.provider_id} href={justWatchUrl} target="_blank" rel="noopener noreferrer" className="streaming-platform">
                        <Image src={`https://image.tmdb.org/t/p/original${p.logo_path}`} alt={p.provider_name} width={32} height={32} style={{ borderRadius: 6, objectFit: 'cover' }} />
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
  const [titre, setTitre] = useState('')
  const [annee, setAnnee] = useState('')
  const [realisateur, setRealisateur] = useState('')
  const [genre, setGenre] = useState('Drame')
  const [sousgenre, setSousgenre] = useState('')
  const [tmdbSuggestions, setTmdbSuggestions] = useState<TMDBSuggestion[]>([])
  const [existingMatches, setExistingMatches] = useState<Film[]>([])
  const [searching, setSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const q = titre.trim().toLowerCase()
    if (q.length < 2) {
      setExistingMatches([]); setTmdbSuggestions([]); setShowSuggestions(false); return
    }
    // Immediate: filter existing films
    const matches = films.filter(f =>
      f.titre.toLowerCase().includes(q) ||
      f.realisateur.toLowerCase().includes(q)
    ).slice(0, 4)
    setExistingMatches(matches)
    setShowSuggestions(true)

    // Debounced TMDB search
    clearTimeout(debounceRef.current)
    if (q.length >= 3) {
      setSearching(true)
      debounceRef.current = setTimeout(async () => {
        const results = await searchFilmTMDB(titre.trim())
        setTmdbSuggestions(results)
        setSearching(false)
      }, 420)
    }
    return () => clearTimeout(debounceRef.current)
  }, [titre])

  function applySuggestion(s: TMDBSuggestion) {
    setTitre(s.titre)
    if (s.annee) setAnnee(String(s.annee))
    if (s.realisateur) setRealisateur(s.realisateur)
    if (s.genre && GENRES_LIST.includes(s.genre)) setGenre(s.genre)
    else if (s.genre) setGenre('Drame')
    setSousgenre(s.sousgenre && GENRES_LIST.includes(s.sousgenre) ? s.sousgenre : '')
    setShowSuggestions(false)
    setTmdbSuggestions([])
    setExistingMatches([])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(''); setLoading(true)
    const fd = new FormData()
    fd.set('titre', titre.trim())
    fd.set('annee', annee)
    fd.set('realisateur', realisateur.trim())
    fd.set('genre', genre)
    const result = await addFilm(fd)
    if (result.error) { setErr(result.error); setLoading(false); return }
    const saison = result.saison
    addToast(saison && saison > saisonNumero ? `Film réservé pour la Saison ${saison} 🔴` : 'Film ajouté à la liste ! 🎬', '✅')
    onRefresh(); onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)',
    borderRadius: 'var(--r)', padding: '.5rem .75rem', color: 'var(--text)',
    fontFamily: 'var(--font-body)', fontSize: '.85rem', boxSizing: 'border-box',
  }

  const hasSuggestions = showSuggestions && (existingMatches.length > 0 || tmdbSuggestions.length > 0 || searching)

  return (
    <div className="modal-wrap" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div style={{ padding: '2rem 1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '1.2rem' }}>Ajouter un film</div>
          {isMarathonLive && (
            <div style={{ background: 'rgba(232,90,90,.07)', border: '1px solid rgba(232,90,90,.22)', borderRadius: 'var(--r)', padding: '.85rem', marginBottom: '1rem', fontSize: '.8rem', color: 'var(--red)', lineHeight: 1.6 }}>
              🔴 Le marathon est en cours. Ce film sera réservé pour la <strong>Saison {saisonNumero + 1}</strong>.
            </div>
          )}
          <form onSubmit={handleSubmit}>

            {/* Titre + suggestions */}
            <div className="field" style={{ position: 'relative', marginBottom: hasSuggestions ? 0 : undefined }}>
              <label>Titre *</label>
              <input
                ref={inputRef}
                style={inputStyle}
                value={titre}
                onChange={e => setTitre(e.target.value)}
                onFocus={() => titre.trim().length >= 2 && setShowSuggestions(true)}
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
              <div style={{
                border: '1px solid var(--border2)', borderTop: 'none',
                borderRadius: '0 0 var(--r) var(--r)',
                background: 'var(--bg2)', marginBottom: '.9rem',
                maxHeight: 320, overflowY: 'auto',
              }}>
                {/* Existing films in list */}
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

                {/* TMDB suggestions */}
                {tmdbSuggestions.length > 0 && (
                  <div>
                    <div style={{ fontSize: '.6rem', letterSpacing: '1.5px', color: 'var(--text3)', textTransform: 'uppercase', padding: '.4rem .75rem .2rem', borderBottom: '1px solid var(--border)' }}>
                      Suggestions TMDB
                    </div>
                    {tmdbSuggestions.map(s => (
                      <div
                        key={s.tmdb_id}
                        onClick={() => applySuggestion(s)}
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
                            {s.annee ?? '?'}{s.realisateur ? ` · ${s.realisateur}` : ''}
                            {s.genre ? ` · ${s.genre}` : ''}
                          </div>
                          {s.overview && <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.35)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.overview}…</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searching && !tmdbSuggestions.length && (
                  <div style={{ padding: '.6rem .75rem', fontSize: '.75rem', color: 'var(--text3)', textAlign: 'center' }}>Recherche en cours…</div>
                )}
              </div>
            )}

            {/* Année + Genre */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.7rem', marginTop: '.5rem' }}>
              <div className="field">
                <label>Année *</label>
                <input style={inputStyle} type="number" value={annee} onChange={e => setAnnee(e.target.value)} placeholder="1972" min="1888" max="2030" required />
              </div>
              <div className="field">
                <label>Genre</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={genre} onChange={e => setGenre(e.target.value)}>
                  {GENRES_LIST.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* Réalisateur + Sous-genre */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.7rem' }}>
              <div className="field">
                <label>Réalisateur *</label>
                <input style={inputStyle} value={realisateur} onChange={e => setRealisateur(e.target.value)} placeholder="Ex: Francis Ford Coppola" required />
              </div>
              <div className="field">
                <label>Sous-genre</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={sousgenre} onChange={e => setSousgenre(e.target.value)}>
                  <option value="">— aucun —</option>
                  {GENRES_LIST.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {err && <div style={{ color: 'var(--red)', fontSize: '.78rem', marginBottom: '.8rem' }}>{err}</div>}
            <div style={{ display: 'flex', gap: '.7rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Annuler</button>
              <button type="submit" className="btn btn-gold" disabled={loading} style={{ flex: 1 }}>{loading ? '⏳ Vérification…' : 'Ajouter'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


// ─── MAIN FILMS CLIENT ───────────────────────────────────────────────────────
export default function FilmsClient({ films, profile, watchedIds, watchedPreMap, myRatings, watchCountMap, ratingMap, totalUsers, weekFilmId, isMarathonLive, saisonNumero }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterGenre, setFilterGenre] = useState('')
  const [filterDecade, setFilterDecade] = useState('')
  const [filterReal, setFilterReal] = useState('')
  const [modal, setModal] = useState<Film | null>(null)
  const [addModal, setAddModal] = useState(false)
  const [showRestricted18, setShowRestricted18] = useState(false)
  const [ageWarnModal, setAgeWarnModal] = useState<18 | null>(null)
  const watchedSet = useMemo(() => new Set(watchedIds), [watchedIds])

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
    if (f.flagged_18plus && !showRestricted18) return false
    const q = search.toLowerCase()
    return (!q || f.titre.toLowerCase().includes(q) || f.realisateur.toLowerCase().includes(q))
      && (!filterGenre  || f.genre === filterGenre)
      && (!filterDecade || Math.floor(f.annee / 10) * 10 === parseInt(filterDecade))
      && (!filterReal   || f.realisateur === filterReal)
  }), [films, search, filterGenre, filterDecade, filterReal, showRestricted18])

  function getWatchPct(filmId: number) {
    if (!totalUsers) return 0
    return Math.round(((watchCountMap[filmId] ?? 0) / totalUsers) * 100)
  }

  function isMajority(filmId: number) { return getWatchPct(filmId) >= CONFIG.SEUIL_MAJORITY }

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
        {films.some(f => f.flagged_18plus) && (
          <div
            onClick={() => { if (!showRestricted18) setAgeWarnModal(18); else setShowRestricted18(false) }}
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
              {films.filter(f => f.flagged_18plus).length}
            </span>
          </div>
        )}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 155px))', gap: '1rem', justifyContent: 'center' }}>
        {filtered.map(film => {
          const isWatched = watchedSet.has(film.id)
          const maj   = isMajority(film.id)
          const s2    = film.saison === 2
          const rat   = avgRating(ratingMap[film.id])
          const isWeek = weekFilmId === film.id

          const is18 = film.flagged_18plus
          return (
            <div key={film.id}
              className={`film-card ${isWatched ? 'watched' : ''} ${maj ? 'majority' : ''} ${s2 ? 's2' : ''}`}
              onClick={() => setModal(film)}
              style={is18 ? {
                boxShadow: '0 0 0 2px rgba(200,0,0,.8), 0 0 22px rgba(200,0,0,.4)',
                borderRadius: 'var(--rl)',
              } : undefined}
            >
              <div style={{ width: '100%', aspectRatio: '2/3', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Poster film={film} fill style={{ objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,14,.92) 0%, transparent 55%)', opacity: 0, transition: 'opacity .2s', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '.8rem' }} className="poster-hover-overlay">
                  <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, marginBottom: '.15rem' }}>{film.titre}</div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text2)' }}>{film.annee} · {film.realisateur}</div>
                </div>
                {isWatched && <div style={{ position: 'absolute', top: 7, right: 7, background: 'var(--green)', color: '#041a0e', fontSize: '.58rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, letterSpacing: '.5px' }}>VU ✓</div>}
                {!isWatched && s2 && <div style={{ position: 'absolute', top: 7, left: 7, background: 'var(--red)', color: '#fff', fontSize: '.58rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>S2</div>}
                {!isWatched && maj && <div style={{ position: 'absolute', top: 7, right: 7, background: 'rgba(255,255,255,.12)', color: '#aaa', fontSize: '.58rem', padding: '2px 7px', borderRadius: 99 }}>60%+</div>}
                {isWeek && <div style={{ position: 'absolute', bottom: 7, left: 7, background: 'var(--gold)', color: '#0a0a0f', fontSize: '.58rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>⭐ SEMAINE</div>}
                {is18 && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(to top, rgba(160,0,0,.97) 0%, rgba(160,0,0,.65) 60%, transparent 100%)',
                    padding: '.5rem .4rem .4rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ fontSize: '.6rem', fontWeight: 800, color: '#fff', letterSpacing: '.5px' }}>🔞 -18</div>
                  </div>
                )}
              </div>
              <div style={{ padding: '.65rem .75rem .5rem' }}>
                <div style={{ fontSize: '.82rem', fontWeight: 500, lineHeight: 1.3, marginBottom: '.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{film.titre}</div>
                <div style={{ fontSize: '.68rem', color: 'var(--text3)' }}>
                  {film.annee} · <span className="chip">{film.genre}</span>
                  {film.sousgenre && <span className="chip" style={{ marginLeft: 3, opacity: .7 }}>{film.sousgenre}</span>}
                </div>
                {rat && <div style={{ fontSize: '.7rem', color: 'var(--gold)', marginTop: '.25rem' }}>⭐ {rat}/10</div>}
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
          watchPct={getWatchPct(modal.id)}
          ratingScores={ratingMap[modal.id] ?? []}
          isWeekFilm={weekFilmId === modal.id}
          isMarathonLive={isMarathonLive}
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
                  onClick={() => { setShowRestricted18(true); setAgeWarnModal(null) }}
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

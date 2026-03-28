'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Poster from '@/components/Poster'
import Forum from '@/components/Forum'
import { useToast } from '@/components/ToastProvider'
import { toggleWatched, upsertRating, addFilm, updateFilm, reportFilm, discoverEgg, getFilmWatchProviders } from '@/lib/actions'
import { CONFIG } from '@/lib/config'
import { useRouter } from 'next/navigation'
import type { Film, Profile } from '@/lib/supabase/types'

interface Props {
  films: Film[]
  profile: Profile
  watchedIds: number[]
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

// ─── JAWS THEME (Web Audio) ──────────────────────────────────────────────────
function playJawsTheme() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const seq: [number, number, number][] = [
      [110, 0, .5], [116.5, .62, .5],
      [110, 1.3, .4], [116.5, 1.78, .4],
      [110, 2.25, .28], [116.5, 2.62, .28],
      [110, 2.98, .18], [116.5, 3.24, .18],
      [110, 3.48, .13], [116.5, 3.67, .13],
      [110, 3.86, .1], [116.5, 4.02, .1],
    ]
    seq.forEach(([f, t, d]) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sawtooth'; osc.frequency.value = f
      gain.gain.setValueAtTime(0.18, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d)
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + d + .08)
    })
  } catch {}
}

// ─── FILM MODAL ──────────────────────────────────────────────────────────────
function FilmModal({ film, profile, isWatched, myRating, watchPct, ratingScores, isWeekFilm, isMarathonLive, onClose, onRefresh }: {
  film: Film; profile: Profile; isWatched: boolean; myRating: number | undefined
  watchPct: number; ratingScores: number[]; isWeekFilm: boolean
  isMarathonLive: boolean; onClose: () => void; onRefresh: () => void
}) {
  const [tab, setTab] = useState<'info' | 'streaming' | 'forum'>('info')
  const [hov, setHov] = useState(0)
  const [editingGenre, setEditingGenre] = useState(false)
  const [genreVal, setGenreVal] = useState(film.genre)
  const [reporting, setReporting] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const { addToast } = useToast()
  const router = useRouter()

  const isAuthor = film.added_by === profile.id
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

          <button
            className={`btn ${isWatched ? 'btn-green' : 'btn-outline'} btn-full`}
            onClick={handleToggle}
            style={{ marginBottom: '1rem' }}
          >
            {isWatched ? '✓ Vu — Cliquer pour retirer' : `+ Marquer comme vu${isMarathonLive ? ` (+${expGain} EXP)` : ' (pré-marathon)'}`}
          </button>

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
    </div>
  )
}

// ─── ADD FILM MODAL ──────────────────────────────────────────────────────────
function AddFilmModal({ profile, isMarathonLive, saisonNumero, onClose, onRefresh }: {
  profile: Profile; isMarathonLive: boolean; saisonNumero: number; onClose: () => void; onRefresh: () => void
}) {
  const { addToast } = useToast()
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(''); setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await addFilm(fd)
    if (result.error) { setErr(result.error); setLoading(false); return }
    const saison = result.saison
    addToast(saison && saison > saisonNumero ? `Film réservé pour la Saison ${saison} 🔴` : 'Film ajouté à la liste ! 🎬', '✅')
    onRefresh(); onClose()
  }

  return (
    <div className="modal-wrap" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div style={{ padding: '2rem 1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '1.2rem' }}>Ajouter un film</div>
          {isMarathonLive && (
            <div style={{ background: 'rgba(232,90,90,.07)', border: '1px solid rgba(232,90,90,.22)', borderRadius: 'var(--r)', padding: '.85rem', marginBottom: '1rem', fontSize: '.8rem', color: 'var(--red)', lineHeight: 1.6 }}>
              🔴 Le marathon est en cours. Ce film sera réservé pour la <strong>Saison {saisonNumero + 1}</strong>.
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="field"><label>Titre *</label><input name="titre" placeholder="Ex: The Godfather" required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.7rem' }}>
              <div className="field"><label>Année *</label><input name="annee" type="number" placeholder="1972" min="1888" max="2030" required /></div>
              <div className="field"><label>Genre</label>
                <select name="genre">
                  {['Action','Animation','Aventure','Comédie','Crime','Drame','Fantaisie','Guerre','Horreur','Policier','SF','Thriller','Western'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="field"><label>Réalisateur *</label><input name="realisateur" placeholder="Ex: Francis Ford Coppola" required /></div>
            <div className="field"><label>URL Affiche TMDB (optionnel)</label><input name="poster" placeholder="https://image.tmdb.org/t/p/w300/..." /></div>
            {err && <div style={{ color: 'var(--red)', fontSize: '.78rem', marginBottom: '.8rem' }}>{err}</div>}
            <div style={{ display: 'flex', gap: '.7rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Annuler</button>
              <button type="submit" className="btn btn-gold" disabled={loading} style={{ flex: 1 }}>{loading ? '…' : 'Ajouter'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── SHARK OVERLAY ───────────────────────────────────────────────────────────
function SharkOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div style={{ position: 'fixed', bottom: 0, left: '50%', zIndex: 9000, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Fin */}
      <div style={{ width: 0, height: 0, borderLeft: '45px solid transparent', borderRight: '45px solid transparent', borderBottom: '90px solid #3a5f8a', animation: 'ee-shark-rise .9s ease, ee-shark-sink .8s ease 3.2s forwards' }} />
      {/* Body */}
      <div style={{ width: 220, height: 55, background: '#3a5f8a', borderRadius: '0 0 110px 110px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'ee-shark-rise .9s ease, ee-shark-sink .8s ease 3.2s forwards' }}>
        <span style={{ fontSize: '1.8rem' }}>🦈</span>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: '.7rem', color: '#3a5f8a', marginTop: '.2rem', letterSpacing: '.15em', animation: 'ee-shark-rise .9s ease, ee-shark-sink .8s ease 3.2s forwards' }}>
        dun dun... dun dun...
      </div>
    </div>
  )
}

// ─── MAIN FILMS CLIENT ───────────────────────────────────────────────────────
export default function FilmsClient({ films, profile, watchedIds, myRatings, watchCountMap, ratingMap, totalUsers, weekFilmId, isMarathonLive, saisonNumero }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterGenre, setFilterGenre] = useState('')
  const [filterDecade, setFilterDecade] = useState('')
  const [filterReal, setFilterReal] = useState('')
  const [modal, setModal] = useState<Film | null>(null)
  const [addModal, setAddModal] = useState(false)
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
        playJawsTheme()
        discoverEgg('shark')
        setTimeout(() => { setSharkVisible(false); sharkTriggered.current = false }, 5000)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const genres  = useMemo(() => [...new Set(films.map(f => f.genre))].sort(), [films])
  const decades = useMemo(() => [...new Set(films.map(f => Math.floor(f.annee / 10) * 10))].sort(), [films])
  const reals   = useMemo(() => [...new Set(films.map(f => f.realisateur))].sort(), [films])

  const filtered = useMemo(() => films.filter(f => {
    const q = search.toLowerCase()
    return (!q || f.titre.toLowerCase().includes(q) || f.realisateur.toLowerCase().includes(q))
      && (!filterGenre  || f.genre === filterGenre)
      && (!filterDecade || Math.floor(f.annee / 10) * 10 === parseInt(filterDecade))
      && (!filterReal   || f.realisateur === filterReal)
  }), [films, search, filterGenre, filterDecade, filterReal])

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
        <button className="btn btn-outline" onClick={() => setAddModal(true)}>+ Ajouter un film</button>
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

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '1rem' }}>
        {filtered.map(film => {
          const isWatched = watchedSet.has(film.id)
          const maj   = isMajority(film.id)
          const s2    = film.saison === 2
          const rat   = avgRating(ratingMap[film.id])
          const isWeek = weekFilmId === film.id

          return (
            <div key={film.id}
              className={`film-card ${isWatched ? 'watched' : ''} ${maj ? 'majority' : ''} ${s2 ? 's2' : ''}`}
              onClick={() => setModal(film)}
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
          myRating={myRatings[modal.id]}
          watchPct={getWatchPct(modal.id)}
          ratingScores={ratingMap[modal.id] ?? []}
          isWeekFilm={weekFilmId === modal.id}
          isMarathonLive={isMarathonLive}
          onClose={() => setModal(null)}
          onRefresh={() => router.refresh()}
        />
      )}

      {addModal && (
        <AddFilmModal
          profile={profile}
          isMarathonLive={isMarathonLive}
          saisonNumero={saisonNumero}
          onClose={() => setAddModal(false)}
          onRefresh={() => router.refresh()}
        />
      )}

      {sharkVisible && <SharkOverlay onDone={() => setSharkVisible(false)} />}
    </div>
  )
}

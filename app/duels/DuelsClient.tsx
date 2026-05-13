'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Forum from '@/components/Forum'
import { voteDuel, markWatched, upsertRating } from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'
import { CONFIG } from '@/lib/config'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

type VoteRow = { duel_id: number; film_choice: number }

interface Props {
  profile: Profile | null
  duels: any[]
  myVotes: VoteRow[]
  allVotes: VoteRow[]
  watchCountMap: Record<number, number>
  ratingMap: Record<number, number[]>
  totalUsers: number
  myWatched: Record<number, boolean>
  myRatings: Record<number, number>
}

function avgRating(scores: number[] | undefined) {
  if (!scores?.length) return null
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
}

// ── Mini-modal film enrichi ─────────────────────────────────────────────────
function FilmPreview({ film, watchPct, avg, profile, isWatched, watchedPre, myRating, onClose, onRefresh }: {
  film: any; watchPct: number; avg: string | null; profile: Profile | null
  isWatched: boolean; watchedPre: boolean | null; myRating: number | undefined
  onClose: () => void; onRefresh: () => void
}) {
  const [overview, setOverview] = useState<string | null>(null)
  const [hov, setHov] = useState(0)
  const [localRating, setLocalRating] = useState(myRating ?? 0)
  const [localWatched, setLocalWatched] = useState<{ watched: boolean; pre: boolean | null }>({ watched: isWatched, pre: watchedPre })
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/films/${film.id}/overview`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.overview) setOverview(d.overview) })
      .catch(() => {})
  }, [film.id])

  async function handleRate(score: number) {
    if (!profile) { addToast('Connecte-toi pour noter', '⚠️'); return }
    setLocalRating(score)
    const result = await upsertRating(film.id, score)
    if (result?.error) { addToast(result.error, '⚠️'); setLocalRating(myRating ?? 0) }
    else { addToast(`${film.titre} noté ${score}/10`, '★'); onRefresh() }
  }

  async function handleWatch(pre: boolean) {
    if (!profile) { addToast('Connecte-toi pour marquer vu', '⚠️'); return }
    setSaving(true)
    const alreadySame = localWatched.watched && localWatched.pre === pre
    setLocalWatched(alreadySame ? { watched: false, pre: null } : { watched: true, pre })
    const result = await markWatched(film.id, pre)
    setSaving(false)
    if (result?.error && result.error !== 'LIMIT_REACHED' && result.error !== 'PENDING_REQUEST' && result.error !== 'BLOCKED') {
      addToast(result.error, '⚠️')
      setLocalWatched({ watched: isWatched, pre: watchedPre })
    } else if (result?.error) {
      addToast(result.error === 'LIMIT_REACHED' ? 'Limite quotidienne atteinte' : result.error === 'BLOCKED' ? 'Ajout bloqué (24h)' : 'Demande en attente', '⚠️')
      setLocalWatched({ watched: isWatched, pre: watchedPre })
    } else {
      const removed = result?.action === 'removed'
      addToast(removed ? `"${film.titre}" retiré` : `"${film.titre}" marqué ${pre ? 'vu (avant marathon)' : 'vu (marathon)'}`, '🎬')
      onRefresh()
    }
  }

  const stars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--rxl)', maxWidth: 440, width: '100%', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.5)' }}>
        {/* Header film */}
        <div style={{ display: 'flex', gap: '1rem', padding: '1.2rem' }}>
          <div style={{ width: 100, height: 150, borderRadius: 'var(--r)', overflow: 'hidden', flexShrink: 0, border: '2px solid var(--border2)' }}>
            {film.poster
              ? <Image src={film.poster} alt={film.titre} width={100} height={150} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: 'var(--bg3)' }}>🎬</div>
            }
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', lineHeight: 1.2 }}>{film.titre}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{film.annee} · {film.realisateur}</div>
            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.2rem' }}>
              <span style={{ fontSize: '.65rem', background: 'rgba(232,196,106,.1)', color: 'var(--gold)', padding: '.15rem .5rem', borderRadius: 99 }}>{film.genre}</span>
              {film.sousgenre && <span style={{ fontSize: '.65rem', background: 'rgba(255,255,255,.06)', color: 'var(--text3)', padding: '.15rem .5rem', borderRadius: 99 }}>{film.sousgenre}</span>}
            </div>
            <div style={{ display: 'flex', gap: '.8rem', marginTop: 'auto', paddingTop: '.4rem', alignItems: 'center' }}>
              {avg && <div style={{ fontSize: '.78rem' }}><span style={{ color: 'var(--gold)' }}>★</span> {avg}/10</div>}
              <div style={{ fontSize: '.78rem', color: 'var(--text3)' }}>{watchPct}% vus</div>
              {localWatched.watched && (
                <span style={{ fontSize: '.6rem', background: 'var(--green)', color: '#041a0e', padding: '2px 6px', borderRadius: 99, fontWeight: 700 }}>
                  VU {localWatched.pre ? '(avant)' : '(marathon)'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Synopsis */}
        {overview && (
          <div style={{ padding: '0 1.2rem .8rem', fontSize: '.78rem', color: 'var(--text2)', lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: '.8rem', marginLeft: '1.2rem', marginRight: '1.2rem', maxHeight: 100, overflowY: 'auto' }}>
            {overview}
          </div>
        )}

        {/* Notation */}
        {profile && (
          <div style={{ padding: '.8rem 1.2rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '.72rem', color: 'var(--text3)', marginBottom: '.4rem' }}>Ta note :</div>
            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
              {stars.map(s => (
                <button
                  key={s}
                  onMouseEnter={() => setHov(s)}
                  onMouseLeave={() => setHov(0)}
                  onClick={() => handleRate(s)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                    fontSize: '1.1rem', lineHeight: 1,
                    color: (hov || localRating) >= s ? 'var(--gold)' : 'var(--border2)',
                    transition: 'color .15s, transform .15s',
                    transform: hov === s ? 'scale(1.3)' : 'scale(1)',
                  }}
                >
                  ★
                </button>
              ))}
              {localRating > 0 && <span style={{ fontSize: '.72rem', color: 'var(--text3)', marginLeft: '.4rem' }}>{localRating}/10</span>}
            </div>
          </div>
        )}

        {/* Marquer vu */}
        {profile && (
          <div style={{ padding: '.4rem 1.2rem .8rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-ghost"
              disabled={saving}
              onClick={() => handleWatch(true)}
              style={{
                fontSize: '.72rem', padding: '.3rem .7rem',
                background: localWatched.watched && localWatched.pre === true ? 'rgba(79,217,138,.15)' : undefined,
                border: localWatched.watched && localWatched.pre === true ? '1px solid var(--green)' : undefined,
                color: localWatched.watched && localWatched.pre === true ? 'var(--green)' : undefined,
              }}
            >
              ⏳ Vu avant marathon
            </button>
            <button
              className="btn btn-ghost"
              disabled={saving}
              onClick={() => handleWatch(false)}
              style={{
                fontSize: '.72rem', padding: '.3rem .7rem',
                background: localWatched.watched && localWatched.pre === false ? 'rgba(249,199,79,.15)' : undefined,
                border: localWatched.watched && localWatched.pre === false ? '1px solid var(--gold)' : undefined,
                color: localWatched.watched && localWatched.pre === false ? 'var(--gold)' : undefined,
              }}
            >
              🏁 Vu pendant marathon
            </button>
          </div>
        )}

        <div style={{ padding: '.4rem 1.2rem 1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" style={{ fontSize: '.75rem' }} onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

// ── Affiche interactive (hover zoom + clic + auto-preview) ──────────────────
function DuelPoster({ film, w, h, border, watchPct, avg, profile, isWatched, watchedPre, myRating, onRefresh, onClick }: {
  film: any; w: number; h: number; border: string; watchPct: number; avg: string | null
  profile: Profile | null; isWatched: boolean; watchedPre: boolean | null; myRating: number | undefined
  onRefresh: () => void; onClick?: (e: React.MouseEvent) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoveredByTimer = useRef(false)

  function handleEnter() {
    setHovered(true)
    hoverTimer.current = setTimeout(() => {
      hoveredByTimer.current = true
      setShowPreview(true)
    }, 1500)
  }

  function handleLeave() {
    setHovered(false)
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null }
  }

  useEffect(() => {
    return () => { if (hoverTimer.current) clearTimeout(hoverTimer.current) }
  }, [])

  return (
    <>
      <div
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onClick={e => {
          if (onClick) {
            onClick(e)
          } else {
            e.stopPropagation()
            if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null }
            hoveredByTimer.current = false
            setShowPreview(true)
          }
        }}
        style={{
          width: w, height: h, borderRadius: 'var(--r)', overflow: 'hidden', background: 'var(--bg3)',
          border, transition: 'transform .25s ease, box-shadow .25s ease, border-color .2s',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
          boxShadow: hovered ? '0 8px 32px rgba(0,0,0,.4)' : 'none',
          cursor: 'pointer', position: 'relative', zIndex: hovered ? 5 : 1,
        }}
      >
        {film.poster
          ? <Image src={film.poster} alt={film.titre} width={w} height={h} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: w > 60 ? '2rem' : '1.2rem' }}>🎬</div>
        }
        {hovered && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.85) 0%, transparent 60%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '.5rem', pointerEvents: 'none' }}>
            <div style={{ fontSize: '.6rem', color: 'var(--text2)', textAlign: 'center' }}>Voir les infos</div>
          </div>
        )}
      </div>
      {showPreview && createPortal(
        <FilmPreview
          film={film} watchPct={watchPct} avg={avg}
          profile={profile} isWatched={isWatched} watchedPre={watchedPre} myRating={myRating}
          onClose={() => { setShowPreview(false); hoveredByTimer.current = false }} onRefresh={onRefresh}
        />,
        document.body
      )}
    </>
  )
}

// ── Carte du vainqueur ──────────────────────────────────────────────────────
function WinnerHero({
  duel, v1, v2, compact = false, profile, watchCountMap, ratingMap, totalUsers, myWatched, myRatings, onRefresh,
}: {
  duel: any; v1: number; v2: number; compact?: boolean; profile: Profile | null
  watchCountMap: Record<number, number>; ratingMap: Record<number, number[]>; totalUsers: number
  myWatched: Record<number, boolean>; myRatings: Record<number, number>; onRefresh: () => void
}) {
  const [forumOpen, setForumOpen] = useState(false)
  const winner = duel.winner
  const f1 = duel.film1, f2 = duel.film2
  const tot = v1 + v2 || 1
  const wv = winner?.id === duel.film1_id ? v1 : v2
  const lv = winner?.id === duel.film1_id ? v2 : v1
  const loser = winner?.id === f1.id ? f2 : f1
  const pctW = Math.round((wv / tot) * 100)
  const pctL = Math.round((lv / tot) * 100)

  if (!winner) return null

  const pw = compact ? 150 : 210
  const ph = compact ? 225 : 315

  function getWatchPct(filmId: number) {
    return Math.round(((watchCountMap[filmId] ?? 0) / totalUsers) * 100)
  }

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid rgba(232,196,106,.22)',
      borderRadius: 'var(--rxl)',
      marginBottom: '1.5rem',
      boxShadow: compact ? undefined : '0 0 48px rgba(232,196,106,.07)',
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.68rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text3)' }}>
            Semaine {duel.week_num}
          </span>
          <span style={{
            background: 'rgba(232,196,106,.1)', border: '1px solid rgba(232,196,106,.3)',
            color: 'var(--gold)', fontSize: '.72rem', padding: '.25rem .75rem', borderRadius: 99,
          }}>
            Duel clos
          </span>
        </div>
        <span style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{tot} vote{tot > 1 ? 's' : ''}</span>
      </div>

      {/* Contenu : vainqueur centré + perdant à côté */}
      <div style={{
        padding: compact ? '1.8rem 1.5rem' : '2.8rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: compact ? '1.5rem' : '2.5rem', flexWrap: 'wrap',
      }}>
        {/* Perdant */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem' }}>
          <div style={{ opacity: .55, filter: 'grayscale(.4)' }}>
            <DuelPoster
              film={loser}
              w={compact ? 70 : 90} h={compact ? 105 : 135}
              border="2px solid var(--border)"
              watchPct={getWatchPct(loser.id)} avg={avgRating(ratingMap[loser.id])}
              profile={profile} isWatched={loser.id in myWatched} watchedPre={myWatched[loser.id] ?? null} myRating={myRatings[loser.id]}
              onRefresh={onRefresh}
            />
          </div>
          <div style={{ fontSize: '.68rem', color: 'var(--text3)', textAlign: 'center', maxWidth: 90 }}>
            {loser.titre}
          </div>
          <div style={{ fontSize: '.62rem', color: 'var(--text3)' }}>{lv}v ({pctL}%)</div>
        </div>

        {/* Vainqueur */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.6rem', textAlign: 'center' }}>
          <div style={{
            fontSize: '.7rem', letterSpacing: '4px', textTransform: 'uppercase',
            color: 'var(--gold)', fontWeight: 700,
          }}>
            Vainqueur
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--gold)', color: '#0c0c12', fontSize: '.65rem', fontWeight: 800,
              letterSpacing: '2.5px', padding: '.22rem .9rem', borderRadius: 99,
              textTransform: 'uppercase', whiteSpace: 'nowrap', zIndex: 2,
            }}>
              Winner
            </div>
            <DuelPoster
              film={winner}
              w={pw} h={ph}
              border="3px solid var(--gold)"
              watchPct={getWatchPct(winner.id)} avg={avgRating(ratingMap[winner.id])}
              profile={profile} isWatched={winner.id in myWatched} watchedPre={myWatched[winner.id] ?? null} myRating={myRatings[winner.id]}
              onRefresh={onRefresh}
            />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: compact ? '1.25rem' : '1.6rem', lineHeight: 1.2, marginTop: '.25rem' }}>
            {winner.titre}
          </div>
          <div style={{ fontSize: '.8rem', color: 'var(--text3)' }}>{winner.annee} · {winner.realisateur}</div>
          <div style={{ fontSize: '.82rem', color: 'var(--green)', fontWeight: 500 }}>
            {wv} vote{wv > 1 ? 's' : ''} ({pctW}%)
          </div>
        </div>
      </div>

      {/* Barre résultat */}
      <div style={{ padding: '0 1.5rem .8rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.68rem', marginBottom: '.3rem' }}>
          <span style={{ color: winner?.id === f1.id ? 'var(--gold)' : 'var(--text3)' }}>{f1.titre}</span>
          <span style={{ color: winner?.id === f2.id ? 'var(--gold)' : 'var(--text3)' }}>{f2.titre}</span>
        </div>
        <div style={{ borderRadius: 99, height: 8, overflow: 'hidden', display: 'flex', background: 'var(--bg3)' }}>
          <div style={{ height: '100%', width: `${Math.round(v1 / tot * 100)}%`, minWidth: v1 > 0 ? 4 : 0, background: winner?.id === f1.id ? 'linear-gradient(90deg, #e8c46a, #f0d78a)' : 'rgba(255,255,255,.15)', transition: 'width .6s ease' }} />
          <div style={{ height: '100%', width: `${Math.round(v2 / tot * 100)}%`, minWidth: v2 > 0 ? 4 : 0, background: winner?.id === f2.id ? 'linear-gradient(90deg, #6699ff, #88bbff)' : 'rgba(255,255,255,.15)', transition: 'width .6s ease' }} />
        </div>
      </div>

      {/* Forum */}
      <div style={{ padding: '0 1.5rem .9rem', borderTop: '1px solid var(--border)', paddingTop: '.7rem' }}>
        <button className="btn btn-ghost" style={{ fontSize: '.78rem' }} onClick={() => setForumOpen(!forumOpen)}>
          💬 Débattre du duel {forumOpen ? '▲' : '▼'}
        </button>
        {forumOpen && <div style={{ marginTop: '.8rem' }}><Forum topic={`duel_${duel.id}`} profile={profile} /></div>}
      </div>
    </div>
  )
}

// ── Carte de vote active ─────────────────────────────────────────────────────
function DuelCard({
  duel, profile, myVote, v1, v2, onVote, watchCountMap, ratingMap, totalUsers, myWatched, myRatings, onRefresh,
}: {
  duel: any; profile: Profile | null; myVote: number | null
  v1: number; v2: number; onVote: (duelId: number, filmId: number) => void
  watchCountMap: Record<number, number>; ratingMap: Record<number, number[]>; totalUsers: number
  myWatched: Record<number, boolean>; myRatings: Record<number, number>; onRefresh: () => void
}) {
  const [forumOpen, setForumOpen] = useState(false)
  const f1 = duel.film1, f2 = duel.film2, winner = duel.winner
  const tot = v1 + v2 || 1
  const p1 = Math.round((v1 / tot) * 100)
  const p2 = 100 - p1

  const canVote = !!profile && !duel.closed

  function getWatchPct(filmId: number) {
    return Math.round(((watchCountMap[filmId] ?? 0) / totalUsers) * 100)
  }

  const tied = v1 === v2
  const f1Leads = v1 > v2
  const leader = tied ? null : f1Leads ? f1 : f2
  const trailer = tied ? null : f1Leads ? f2 : f1
  const lv = leader ? (f1Leads ? v1 : v2) : 0
  const tv = trailer ? (f1Leads ? v2 : v1) : 0
  const lp = leader ? (f1Leads ? p1 : p2) : 0
  const tp = trailer ? (f1Leads ? p2 : p1) : 0
  const leaderColor = leader === f1 ? '#e8c46a' : '#6699ff'
  const trailerColor = trailer === f1 ? '#e8c46a' : '#6699ff'

  function renderFilmSide(film: any, votes: number, pct: number, color: string, isLeader: boolean) {
    const pw = tied ? 120 : isLeader ? 156 : 90
    const ph = tied ? 180 : isLeader ? 234 : 135
    return (
      <div
        style={{
          padding: '1.5rem', cursor: canVote ? 'pointer' : 'default',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '.5rem',
          background: myVote === film.id ? `${color}11` : 'transparent', transition: 'background .2s, opacity .3s',
          opacity: !tied && !isLeader ? .65 : 1,
        }}
        onClick={() => canVote && onVote(duel.id, film.id)}
      >
        {isLeader && !tied && <div style={{ fontSize: '.6rem', letterSpacing: '2px', textTransform: 'uppercase', color, fontWeight: 700 }}>En tête</div>}
        <DuelPoster
          film={film} w={pw} h={ph}
          border={`${isLeader && !tied ? '3px' : '2px'} solid ${isLeader && !tied ? color : myVote === film.id ? color : 'var(--border)'}`}
          watchPct={getWatchPct(film.id)} avg={avgRating(ratingMap[film.id])}
          profile={profile} isWatched={film.id in myWatched} watchedPre={myWatched[film.id] ?? null} myRating={myRatings[film.id]}
          onRefresh={onRefresh}
        />
        <div style={{ fontSize: isLeader && !tied ? '1rem' : '.82rem', fontWeight: isLeader ? 600 : 500, lineHeight: 1.3 }}>{film.titre}</div>
        <div style={{ fontSize: '.7rem', color: 'var(--text3)' }}>{film.annee} · {film.realisateur}</div>
        {myVote && <div style={{ fontSize: '.78rem', color: myVote === film.id ? color : 'var(--text3)', fontWeight: myVote === film.id ? 600 : 400 }}>
          {votes} vote{votes > 1 ? 's' : ''} ({pct}%)
        </div>}
      </div>
    )
  }

  const leftFilm = tied || f1Leads ? f1 : f2
  const rightFilm = tied || f1Leads ? f2 : f1
  const leftVotes = leftFilm === f1 ? v1 : v2
  const rightVotes = rightFilm === f1 ? v1 : v2
  const leftPct = leftFilm === f1 ? p1 : p2
  const rightPct = rightFilm === f1 ? p1 : p2
  const leftColor = leftFilm === f1 ? '#e8c46a' : '#6699ff'
  const rightColor = rightFilm === f1 ? '#e8c46a' : '#6699ff'
  const leftIsLeader = !tied && leftFilm === leader
  const rightIsLeader = !tied && rightFilm === leader

  return (
    <div style={{
      background: 'var(--bg2)', borderRadius: 'var(--rxl)', overflow: 'hidden', marginBottom: '1.5rem',
      border: '1px solid rgba(232,196,106,.35)',
      boxShadow: '0 0 24px rgba(232,196,106,.08), 0 0 60px rgba(232,196,106,.04)',
      animation: 'duelGlow 3s ease-in-out infinite',
    }}>
      <style>{`
        @keyframes duelGlow {
          0%, 100% { box-shadow: 0 0 24px rgba(232,196,106,.08), 0 0 60px rgba(232,196,106,.04); }
          50% { box-shadow: 0 0 32px rgba(232,196,106,.18), 0 0 80px rgba(232,196,106,.08); }
        }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.6 } }
      `}</style>

      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.68rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text3)' }}>Semaine {duel.week_num}</span>
          <span style={{
            background: 'rgba(232,196,106,.12)', border: '1px solid rgba(232,196,106,.35)',
            color: 'var(--gold)', fontSize: '.72rem', padding: '.25rem .75rem', borderRadius: 99,
            animation: 'pulse 2s ease-in-out infinite',
          }}>
            Vote ouvert
          </span>
        </div>
        <span style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{v1 + v2} vote{v1 + v2 > 1 ? 's' : ''}</span>
      </div>

      {/* Films : trailer | VS | leader(centré, 30% plus grand) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {renderFilmSide(leftFilm, leftVotes, leftPct, leftColor, leftIsLeader)}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 .5rem' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--gold)',
            background: 'rgba(232,196,106,.08)', border: '2px solid rgba(232,196,106,.25)',
            width: 50, height: 50, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(232,196,106,.1)',
          }}>VS</div>
        </div>
        {renderFilmSide(rightFilm, rightVotes, rightPct, rightColor, rightIsLeader)}
      </div>

      {/* Barre interactive */}
      <div style={{ padding: '.8rem 1.5rem 1.2rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', marginBottom: '.35rem' }}>
          <span style={{ color: '#e8c46a', fontWeight: myVote === f1.id ? 700 : 400 }}>{f1.titre}</span>
          <span style={{ color: '#6699ff', fontWeight: myVote === f2.id ? 700 : 400 }}>{f2.titre}</span>
        </div>
        <div style={{ borderRadius: 99, height: 14, overflow: 'hidden', display: 'flex', cursor: canVote ? 'pointer' : 'default', background: 'var(--bg3)', position: 'relative' }}>
          <div
            onClick={() => canVote && onVote(duel.id, f1.id)}
            title={canVote ? `Voter pour ${f1.titre}` : undefined}
            style={{
              height: '100%', width: `${p1}%`, minWidth: p1 > 0 ? 4 : 0,
              background: myVote === f1.id ? 'linear-gradient(90deg, #e8c46a, #f0d78a)' : 'rgba(232,196,106,.45)',
              transition: 'width .6s cubic-bezier(.4,0,.2,1), background .3s',
              boxShadow: myVote === f1.id ? 'inset 0 0 8px rgba(232,196,106,.3)' : 'none',
            }}
          />
          <div
            onClick={() => canVote && onVote(duel.id, f2.id)}
            title={canVote ? `Voter pour ${f2.titre}` : undefined}
            style={{
              height: '100%', width: `${p2}%`, minWidth: p2 > 0 ? 4 : 0,
              background: myVote === f2.id ? 'linear-gradient(90deg, #6699ff, #88bbff)' : 'rgba(102,153,255,.45)',
              transition: 'width .6s cubic-bezier(.4,0,.2,1), background .3s',
              boxShadow: myVote === f2.id ? 'inset 0 0 8px rgba(102,153,255,.3)' : 'none',
            }}
          />
        </div>
        {myVote && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', marginTop: '.35rem', fontWeight: 600 }}>
            <span style={{ color: '#e8c46a' }}>{p1}%</span>
            <span style={{ color: '#6699ff' }}>{p2}%</span>
          </div>
        )}
      </div>

      {/* Info vote */}
      {profile && !duel.closed && (
        <div style={{ padding: '.2rem 1.5rem .8rem', fontSize: '.78rem', color: 'var(--text3)', textAlign: 'center' }}>
          {myVote
            ? 'Clique sur un autre film ou sur la barre pour changer ton vote'
            : `Clique sur un film pour voter (+${CONFIG.EXP_VOTE} EXP) · Le vainqueur est diffusé ${CONFIG.SEANCE_JOUR} ${CONFIG.SEANCE_HEURE} (+${CONFIG.EXP_DUEL_WIN} EXP)`}
        </div>
      )}
      {!profile && !duel.closed && (
        <div style={{ padding: '.2rem 1.5rem .8rem', fontSize: '.78rem', color: 'var(--text3)', textAlign: 'center' }}>
          <a href="/auth" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Connecte-toi</a> pour voter (+{CONFIG.EXP_VOTE} EXP)
        </div>
      )}

      {/* Forum */}
      <div style={{ padding: '0 1.5rem .8rem', borderTop: '1px solid var(--border)', paddingTop: '.7rem', marginTop: '.3rem' }}>
        <button className="btn btn-ghost" style={{ fontSize: '.78rem' }} onClick={() => setForumOpen(!forumOpen)}>
          💬 Débattre du duel {forumOpen ? '▲' : '▼'}
        </button>
        {forumOpen && <div style={{ marginTop: '.8rem' }}><Forum topic={`duel_${duel.id}`} profile={profile} /></div>}
      </div>
    </div>
  )
}

// ── Archive avec affiches ───────────────────────────────────────────────────
function ArchiveCard({ duel, v1, v2, watchCountMap, ratingMap, totalUsers, profile, myWatched, myRatings, onRefresh }: {
  duel: any; v1: number; v2: number
  watchCountMap: Record<number, number>; ratingMap: Record<number, number[]>; totalUsers: number
  profile: Profile | null; myWatched: Record<number, boolean>; myRatings: Record<number, number>; onRefresh: () => void
}) {
  const winner = duel.winner
  const f1 = duel.film1, f2 = duel.film2
  const tot = v1 + v2 || 1
  const loser = winner?.id === f1?.id ? f2 : f1
  const wv = winner?.id === duel.film1_id ? v1 : v2
  const lv = winner?.id === duel.film1_id ? v2 : v1

  function getWatchPct(filmId: number) {
    return Math.round(((watchCountMap[filmId] ?? 0) / totalUsers) * 100)
  }

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)',
      padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '.6rem',
    }}>
      {/* Affiches miniatures */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexShrink: 0 }}>
        {winner && (
          <DuelPoster
            film={winner} w={40} h={60}
            border="1px solid rgba(232,196,106,.4)"
            watchPct={getWatchPct(winner.id)} avg={avgRating(ratingMap[winner.id])}
            profile={profile} isWatched={winner.id in myWatched} watchedPre={myWatched[winner.id] ?? null} myRating={myRatings[winner.id]}
            onRefresh={onRefresh}
          />
        )}
        {loser && (
          <div style={{ opacity: .4, filter: 'grayscale(.5)' }}>
            <DuelPoster
              film={loser} w={32} h={48}
              border="1px solid var(--border)"
              watchPct={getWatchPct(loser.id)} avg={avgRating(ratingMap[loser.id])}
              profile={profile} isWatched={loser.id in myWatched} watchedPre={myWatched[loser.id] ?? null} myRating={myRatings[loser.id]}
              onRefresh={onRefresh}
            />
          </div>
        )}
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.65rem', color: 'var(--text3)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>S{duel.week_num}</span>
          <span style={{ fontSize: '.72rem', color: 'var(--gold)', fontWeight: 600 }}>🏆 {winner?.titre ?? '—'}</span>
        </div>
        <div style={{ fontSize: '.7rem', color: 'var(--text3)', marginTop: '.2rem' }}>
          vs {loser?.titre}
        </div>
      </div>

      {/* Score avec mini barre */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{ fontSize: '.72rem', color: 'var(--text2)', fontWeight: 500 }}>{wv}–{lv}</div>
        <div style={{ width: 50, height: 4, borderRadius: 99, overflow: 'hidden', display: 'flex', background: 'var(--bg3)', marginTop: '.3rem' }}>
          <div style={{ height: '100%', width: `${Math.round(wv / tot * 100)}%`, background: 'var(--gold)' }} />
          <div style={{ height: '100%', width: `${Math.round(lv / tot * 100)}%`, background: 'rgba(255,255,255,.15)' }} />
        </div>
        <div style={{ fontSize: '.58rem', color: 'var(--text3)', marginTop: '.15rem' }}>{tot} vote{tot > 1 ? 's' : ''}</div>
      </div>
    </div>
  )
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function DuelsClient({ profile, duels, myVotes, allVotes, watchCountMap, ratingMap, totalUsers, myWatched: initialMyWatched, myRatings: initialMyRatings }: Props) {
  const [localVotes, setLocalVotes] = useState<VoteRow[]>(allVotes)
  const [myVoteMap, setMyVoteMap] = useState<Record<number, number>>(
    Object.fromEntries(myVotes.map(v => [v.duel_id, v.film_choice]))
  )
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [myWatched, setMyWatched] = useState(initialMyWatched)
  const [myRatings, setMyRatings] = useState(initialMyRatings)
  const { addToast } = useToast()
  const router = useRouter()

  useEffect(() => { setMyWatched(initialMyWatched) }, [initialMyWatched])
  useEffect(() => { setMyRatings(initialMyRatings) }, [initialMyRatings])

  const handleRefresh = useCallback(() => { router.refresh() }, [router])

  // Realtime — votes
  useEffect(() => {
    const sb = createClient()
    const channel = sb
      .channel('votes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as { duel_id: number; film_choice: number }
            if (duels.some(d => d.id === row.duel_id)) {
              setLocalVotes(prev => [...prev, { duel_id: row.duel_id, film_choice: row.film_choice }])
            }
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as { duel_id: number; film_choice: number }
            setLocalVotes(prev => {
              const idx = prev.findIndex(v => v.duel_id === row.duel_id && v.film_choice === row.film_choice)
              if (idx === -1) return prev
              return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
            })
          }
        }
      )
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [duels])

  const handleVote = useCallback(async (duelId: number, filmId: number) => {
    if (!profile) return
    const prev = myVoteMap[duelId] ?? null
    if (prev === filmId) return

    setMyVoteMap(m => ({ ...m, [duelId]: filmId }))
    setLocalVotes(v => {
      let next = v
      if (prev !== null) {
        const idx = next.findIndex(x => x.duel_id === duelId && x.film_choice === prev)
        if (idx !== -1) next = [...next.slice(0, idx), ...next.slice(idx + 1)]
      }
      return [...next, { duel_id: duelId, film_choice: filmId }]
    })

    const result = await voteDuel(duelId, filmId)
    if (result?.error) {
      setMyVoteMap(m => prev !== null ? { ...m, [duelId]: prev } : (({ [duelId]: _, ...rest }) => rest)(m))
      setLocalVotes(v => {
        let next = v.filter(x => !(x.duel_id === duelId && x.film_choice === filmId))
        if (prev !== null) next = [...next, { duel_id: duelId, film_choice: prev }]
        return next
      })
      addToast(result.error, '⚠️')
    } else if (result?.isNew) {
      addToast(`+${CONFIG.EXP_VOTE} EXP — Vote enregistré !`, '⚔️')
      router.refresh()
    } else {
      addToast('Vote modifié !', '⚔️')
    }
  }, [profile, myVoteMap, addToast, router])

  function getVotes(duelId: number, filmId: number) {
    return localVotes.filter(v => v.duel_id === duelId && v.film_choice === filmId).length
  }

  const openDuel = duels.find(d => !d.closed) ?? null
  const closedDuels = duels.filter(d => d.closed)
  const latestClosed = closedDuels[0] ?? null
  const olderClosed = closedDuels.slice(1)

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Duels</div>
        <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>
          Vote pour le prochain film collectif · Séance {CONFIG.SEANCE_JOUR} {CONFIG.SEANCE_HEURE}
        </div>
      </div>

      {duels.length === 0 && (
        <div className="empty">
          <div style={{ fontSize: '2.5rem', marginBottom: '.8rem' }}>⚔️</div>
          Aucun duel en cours. L&apos;admin en créera un bientôt !
        </div>
      )}

      {openDuel && (
        <DuelCard
          duel={openDuel}
          profile={profile}
          myVote={myVoteMap[openDuel.id] ?? null}
          v1={getVotes(openDuel.id, openDuel.film1_id)}
          v2={getVotes(openDuel.id, openDuel.film2_id)}
          onVote={handleVote}
          watchCountMap={watchCountMap}
          ratingMap={ratingMap}
          totalUsers={totalUsers}
          myWatched={myWatched}
          myRatings={myRatings}
          onRefresh={handleRefresh}
        />
      )}

      {latestClosed && (
        <WinnerHero
          duel={latestClosed}
          v1={getVotes(latestClosed.id, latestClosed.film1_id)}
          v2={getVotes(latestClosed.id, latestClosed.film2_id)}
          compact={!!openDuel}
          profile={profile}
          watchCountMap={watchCountMap}
          ratingMap={ratingMap}
          totalUsers={totalUsers}
          myWatched={myWatched}
          myRatings={myRatings}
          onRefresh={handleRefresh}
        />
      )}

      {olderClosed.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '.8rem', marginBottom: '.8rem', width: '100%' }}
            onClick={() => setArchiveOpen(o => !o)}
          >
            🗂 Archives — {olderClosed.length} duel{olderClosed.length > 1 ? 's' : ''} passé{olderClosed.length > 1 ? 's' : ''} {archiveOpen ? '▲' : '▼'}
          </button>
          {archiveOpen && (
            <div>
              {olderClosed.map(duel => (
                <ArchiveCard
                  key={duel.id}
                  duel={duel}
                  v1={getVotes(duel.id, duel.film1_id)}
                  v2={getVotes(duel.id, duel.film2_id)}
                  watchCountMap={watchCountMap}
                  ratingMap={ratingMap}
                  totalUsers={totalUsers}
                  profile={profile}
                  myWatched={myWatched}
                  myRatings={myRatings}
                  onRefresh={handleRefresh}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

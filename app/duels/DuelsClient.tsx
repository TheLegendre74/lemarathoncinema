'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Forum from '@/components/Forum'
import { voteDuel } from '@/lib/actions'
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
}

// ── Carte du vainqueur — affiche en gros centré ──────────────────────────────
function WinnerHero({
  duel, v1, v2, compact = false, profile,
}: {
  duel: any; v1: number; v2: number; compact?: boolean; profile: Profile | null
}) {
  const [forumOpen, setForumOpen] = useState(false)
  const winner = duel.winner
  const f1 = duel.film1, f2 = duel.film2
  const tot = v1 + v2 || 1
  const wv = winner?.id === duel.film1_id ? v1 : v2
  const lv = winner?.id === duel.film1_id ? v2 : v1
  const pctW = Math.round((wv / tot) * 100)

  if (!winner) return null

  const pw = compact ? 150 : 210
  const ph = compact ? 225 : 315

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid rgba(232,196,106,.22)',
      borderRadius: 'var(--rxl)',
      overflow: 'hidden',
      marginBottom: '1.5rem',
      boxShadow: compact ? undefined : '0 0 48px rgba(232,196,106,.07)',
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.68rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text3)' }}>
            Semaine {duel.week_num}
          </span>
          <span style={{
            background: 'rgba(232,196,106,.1)',
            border: '1px solid rgba(232,196,106,.3)',
            color: 'var(--gold)',
            fontSize: '.72rem',
            padding: '.25rem .75rem',
            borderRadius: 99,
          }}>
            Duel clos
          </span>
        </div>
        <span style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{tot} vote{tot > 1 ? 's' : ''}</span>
      </div>

      {/* Affiche vainqueur */}
      <div style={{
        padding: compact ? '1.8rem 1.5rem' : '2.8rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '.7rem',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          fontWeight: 700,
        }}>
          Vainqueur
        </div>

        {/* Affiche avec badge */}
        <div style={{ position: 'relative', marginTop: '.5rem' }}>
          {/* Badge "Winner" au-dessus */}
          <div style={{
            position: 'absolute',
            top: -14,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--gold)',
            color: '#0c0c12',
            fontSize: '.65rem',
            fontWeight: 800,
            letterSpacing: '2.5px',
            padding: '.22rem .9rem',
            borderRadius: 99,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            zIndex: 2,
          }}>
            Winner
          </div>
          <div style={{
            width: pw,
            height: ph,
            borderRadius: 'var(--r)',
            overflow: 'hidden',
            border: '3px solid var(--gold)',
            boxShadow: compact ? '0 0 20px rgba(232,196,106,.2)' : '0 0 40px rgba(232,196,106,.28)',
          }}>
            {winner.poster
              ? <Image
                  src={winner.poster}
                  alt={winner.titre}
                  width={pw}
                  height={ph}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  unoptimized
                />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', background: 'var(--bg3)' }}>🎬</div>
            }
          </div>
        </div>

        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: compact ? '1.25rem' : '1.6rem',
          lineHeight: 1.2,
          marginTop: '.25rem',
        }}>
          {winner.titre}
        </div>
        <div style={{ fontSize: '.8rem', color: 'var(--text3)' }}>
          {winner.annee} · {winner.realisateur}
        </div>
        <div style={{ fontSize: '.82rem', color: 'var(--green)', fontWeight: 500 }}>
          {wv} vote{wv > 1 ? 's' : ''} ({pctW}%) · Séance {CONFIG.SEANCE_JOUR} {CONFIG.SEANCE_HEURE}
        </div>

        {/* Résumé du duel */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '.75rem',
          marginTop: '.25rem',
          fontSize: '.73rem',
          color: 'var(--text3)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <span style={{ color: winner?.id === f1.id ? 'var(--gold)' : undefined }}>
            {f1.titre} — {v1}v ({Math.round(v1 / tot * 100)}%)
          </span>
          <span style={{ color: 'var(--border2)' }}>vs</span>
          <span style={{ color: winner?.id === f2.id ? 'var(--gold)' : undefined }}>
            {f2.titre} — {v2}v ({Math.round(v2 / tot * 100)}%)
          </span>
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
  duel, profile, myVote, v1, v2, onVote,
}: {
  duel: any
  profile: Profile | null
  myVote: number | null
  v1: number
  v2: number
  onVote: (duelId: number, filmId: number) => void
}) {
  const [forumOpen, setForumOpen] = useState(false)
  const f1 = duel.film1, f2 = duel.film2, winner = duel.winner
  const tot = v1 + v2 || 1
  const p1 = Math.round((v1 / tot) * 100)
  const p2 = 100 - p1

  const canVote = !!profile && !duel.closed

  const SideStyle = (filmId: number): React.CSSProperties => ({
    padding: '1.5rem',
    cursor: canVote ? 'pointer' : 'default',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', gap: '.7rem',
    background: myVote === filmId
      ? 'rgba(232,196,106,.07)'
      : winner?.id === filmId
        ? 'rgba(79,217,138,.06)'
        : 'transparent',
    transition: 'background .2s',
  })

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--rxl)', overflow: 'hidden', marginBottom: '1.5rem' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.68rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text3)' }}>Semaine {duel.week_num}</span>
          {winner && (
            <span style={{ background: 'rgba(79,217,138,.1)', border: '1px solid rgba(79,217,138,.3)', color: 'var(--green)', fontSize: '.72rem', padding: '.25rem .75rem', borderRadius: 99 }}>
              🏆 Vainqueur : {winner.titre} · Séance {CONFIG.SEANCE_JOUR} {CONFIG.SEANCE_HEURE}
            </span>
          )}
        </div>
        <span style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{v1 + v2} vote{v1 + v2 > 1 ? 's' : ''}</span>
      </div>

      {/* Films */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 1fr' }}>
        {[f1, f2].map((f, idx) => {
          const votes = idx === 0 ? v1 : v2
          const pct = Math.round((votes / tot) * 100)
          return (
            <div key={f.id}>
              {idx === 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--border2)', width: 46, height: 46, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>VS</div>
                </div>
              )}
              <div style={SideStyle(f.id)} onClick={() => canVote && onVote(duel.id, f.id)}>
                <div style={{ width: 120, height: 180, borderRadius: 'var(--r)', overflow: 'hidden', background: 'var(--bg3)', border: `2px solid ${myVote === f.id ? 'var(--gold)' : winner?.id === f.id ? 'var(--green)' : 'var(--border)'}`, transition: 'border-color .2s' }}>
                  {f.poster
                    ? <Image src={f.poster} alt={f.titre} width={120} height={180} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🎬</div>
                  }
                </div>
                <div style={{ fontSize: '.9rem', fontWeight: 500, lineHeight: 1.3 }}>{f.titre}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{f.annee} · {f.realisateur}</div>
                {myVote && <div style={{ fontSize: '.78rem', color: myVote === f.id ? 'var(--gold)' : 'var(--text3)', fontWeight: myVote === f.id ? 600 : 400 }}>
                  {votes} vote{votes > 1 ? 's' : ''} ({pct}%)
                </div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Barre interactive */}
      <div style={{ padding: '.8rem 1.5rem 1.2rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', marginBottom: '.35rem' }}>
          <span style={{ color: '#e8c46a', fontWeight: myVote === f1.id ? 700 : 400 }}>{f1.titre}</span>
          <span style={{ color: '#6699ff', fontWeight: myVote === f2.id ? 700 : 400 }}>{f2.titre}</span>
        </div>
        <div style={{ borderRadius: 99, height: 12, overflow: 'hidden', display: 'flex', cursor: canVote ? 'pointer' : 'default', background: 'var(--bg3)' }}>
          <div
            onClick={() => canVote && onVote(duel.id, f1.id)}
            title={canVote ? `Voter pour ${f1.titre}` : undefined}
            style={{ height: '100%', width: `${p1}%`, minWidth: p1 > 0 ? 4 : 0, background: myVote === f1.id ? '#e8c46a' : 'rgba(232,196,106,.55)', transition: 'width .45s ease, background .2s' }}
          />
          <div
            onClick={() => canVote && onVote(duel.id, f2.id)}
            title={canVote ? `Voter pour ${f2.titre}` : undefined}
            style={{ height: '100%', width: `${p2}%`, minWidth: p2 > 0 ? 4 : 0, background: myVote === f2.id ? '#6699ff' : 'rgba(102,153,255,.55)', transition: 'width .45s ease, background .2s' }}
          />
        </div>
        {myVote && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.68rem', color: 'var(--text3)', marginTop: '.3rem' }}>
            <span>{p1}%</span>
            <span>{p2}%</span>
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

// ── Archive compacte ─────────────────────────────────────────────────────────
function ArchiveCard({ duel, v1, v2 }: { duel: any; v1: number; v2: number }) {
  const winner = duel.winner
  const tot = v1 + v2 || 1

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r)',
      padding: '.9rem 1.2rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      marginBottom: '.6rem',
      flexWrap: 'wrap',
    }}>
      {/* Affiche vainqueur miniature */}
      {winner?.poster && (
        <div style={{ width: 36, height: 54, borderRadius: 4, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(232,196,106,.3)' }}>
          <Image src={winner.poster} alt={winner.titre} width={36} height={54} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
        </div>
      )}

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.65rem', color: 'var(--text3)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>S{duel.week_num}</span>
          <span style={{ fontSize: '.72rem', color: 'var(--gold)', fontWeight: 600 }}>🏆 {winner?.titre ?? '—'}</span>
        </div>
        <div style={{ fontSize: '.7rem', color: 'var(--text3)', marginTop: '.2rem' }}>
          {duel.film1?.titre} vs {duel.film2?.titre}
        </div>
      </div>

      {/* Score */}
      <div style={{ fontSize: '.7rem', color: 'var(--text3)', textAlign: 'right', flexShrink: 0 }}>
        {v1}–{v2}
        <div style={{ fontSize: '.62rem', color: 'var(--border2)' }}>{tot} vote{tot > 1 ? 's' : ''}</div>
      </div>
    </div>
  )
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function DuelsClient({ profile, duels, myVotes, allVotes }: Props) {
  const [localVotes, setLocalVotes] = useState<VoteRow[]>(allVotes)
  const [myVoteMap, setMyVoteMap] = useState<Record<number, number>>(
    Object.fromEntries(myVotes.map(v => [v.duel_id, v.film_choice]))
  )
  const [archiveOpen, setArchiveOpen] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()

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

  // Séparation : duel actif / dernier clos / archive
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

      {/* Duel actif — vote ouvert */}
      {openDuel && (
        <DuelCard
          duel={openDuel}
          profile={profile}
          myVote={myVoteMap[openDuel.id] ?? null}
          v1={getVotes(openDuel.id, openDuel.film1_id)}
          v2={getVotes(openDuel.id, openDuel.film2_id)}
          onVote={handleVote}
        />
      )}

      {/* Dernier duel clos — vainqueur en grand */}
      {latestClosed && (
        <WinnerHero
          duel={latestClosed}
          v1={getVotes(latestClosed.id, latestClosed.film1_id)}
          v2={getVotes(latestClosed.id, latestClosed.film2_id)}
          compact={!!openDuel}
          profile={profile}
        />
      )}

      {/* Archive — duels plus anciens */}
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
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

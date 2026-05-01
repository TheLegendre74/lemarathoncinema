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

function DuelCard({
  duel, profile, myVote, v1, v2,
  onVote,
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

      {/* Barre interactive — toujours visible */}
      <div style={{ padding: '.8rem 1.5rem 1.2rem', borderTop: '1px solid var(--border)' }}>
        {/* Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', marginBottom: '.35rem' }}>
          <span style={{ color: '#e8c46a', fontWeight: myVote === f1.id ? 700 : 400 }}>{f1.titre}</span>
          <span style={{ color: '#6699ff', fontWeight: myVote === f2.id ? 700 : 400 }}>{f2.titre}</span>
        </div>
        {/* Barre divisée */}
        <div style={{ borderRadius: 99, height: 12, overflow: 'hidden', display: 'flex', cursor: canVote ? 'pointer' : 'default', background: 'var(--bg3)' }}>
          <div
            onClick={() => canVote && onVote(duel.id, f1.id)}
            title={canVote ? `Voter pour ${f1.titre}` : undefined}
            style={{
              height: '100%',
              width: `${p1}%`,
              minWidth: p1 > 0 ? 4 : 0,
              background: myVote === f1.id ? '#e8c46a' : 'rgba(232,196,106,.55)',
              transition: 'width .45s ease, background .2s',
            }}
          />
          <div
            onClick={() => canVote && onVote(duel.id, f2.id)}
            title={canVote ? `Voter pour ${f2.titre}` : undefined}
            style={{
              height: '100%',
              width: `${p2}%`,
              minWidth: p2 > 0 ? 4 : 0,
              background: myVote === f2.id ? '#6699ff' : 'rgba(102,153,255,.55)',
              transition: 'width .45s ease, background .2s',
            }}
          />
        </div>
        {/* Pourcentages si déjà voté */}
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

export default function DuelsClient({ profile, duels, myVotes, allVotes }: Props) {
  const [localVotes, setLocalVotes] = useState<VoteRow[]>(allVotes)
  const [myVoteMap, setMyVoteMap] = useState<Record<number, number>>(
    Object.fromEntries(myVotes.map(v => [v.duel_id, v.film_choice]))
  )
  const { addToast } = useToast()
  const router = useRouter()

  // Realtime — s'abonner aux INSERT/DELETE sur la table votes
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

    // Mise à jour optimiste
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
      // Rollback
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

      {duels.map(duel => (
        <DuelCard
          key={duel.id}
          duel={duel}
          profile={profile}
          myVote={myVoteMap[duel.id] ?? null}
          v1={getVotes(duel.id, duel.film1_id)}
          v2={getVotes(duel.id, duel.film2_id)}
          onVote={handleVote}
        />
      ))}
    </div>
  )
}

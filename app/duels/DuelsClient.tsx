'use client'

import { useState } from 'react'
import Image from 'next/image'
import Forum from '@/components/Forum'
import { voteDuel } from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'
import { CONFIG } from '@/lib/config'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/supabase/types'

interface Props {
  profile: Profile | null
  duels: any[]
  myVotes: { duel_id: number; film_choice: number }[]
  allVotes: { duel_id: number; film_choice: number }[]
}

function DuelCard({ duel, profile, myVote, v1, v2, allVotes }: {
  duel: any, profile: Profile | null, myVote: number | null, v1: number, v2: number, allVotes: { duel_id: number; film_choice: number }[]
}) {
  const [forumOpen, setForumOpen] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()
  const f1 = duel.film1, f2 = duel.film2, winner = duel.winner
  const tot = v1 + v2 || 1
  const p1 = Math.round((v1 / tot) * 100)

  async function handleVote(filmId: number) {
    if (!profile || myVote || duel.closed) return
    const result = await voteDuel(duel.id, filmId)
    if (result.error) addToast(result.error, '⚠️')
    else { addToast(`+${CONFIG.EXP_VOTE} EXP — Vote enregistré !`, '⚔️'); router.refresh() }
  }

  const SideStyle = (filmId: number) => ({
    padding: '1.5rem', cursor: myVote || duel.closed ? 'default' : 'pointer',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', textAlign: 'center' as const, gap: '.7rem',
    background: myVote === filmId ? 'rgba(232,196,106,.07)' : winner?.id === filmId ? 'rgba(79,217,138,.06)' : 'transparent',
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
        <span style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{(v1 + v2)} vote{v1 + v2 > 1 ? 's' : ''}</span>
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
              <div style={SideStyle(f.id)} onClick={() => handleVote(f.id)}>
                <div style={{ width: 120, height: 180, borderRadius: 'var(--r)', overflow: 'hidden', background: 'var(--bg3)', border: `2px solid ${myVote === f.id ? 'var(--gold)' : winner?.id === f.id ? 'var(--green)' : 'var(--border)'}`, transition: 'border-color .2s' }}>
                  {f.poster
                    ? <Image src={f.poster} alt={f.titre} width={120} height={180} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🎬</div>
                  }
                </div>
                <div style={{ fontSize: '.9rem', fontWeight: 500, lineHeight: 1.3 }}>{f.titre}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{f.annee} · {f.realisateur}</div>
                {myVote && <div style={{ fontSize: '.78rem', color: 'var(--gold)', fontWeight: 500 }}>{votes} vote{votes > 1 ? 's' : ''} ({pct}%)</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bar */}
      {myVote && (
        <div style={{ padding: '.8rem 1.5rem 1.2rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ background: 'var(--bg3)', borderRadius: 99, height: 7, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--gold2), var(--gold))', borderRadius: 99, width: `${p1}%`, transition: 'width .6s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: 'var(--text2)', marginTop: '.4rem' }}>
            <span>{f1.titre}</span>
            <span>{f2.titre}</span>
          </div>
        </div>
      )}
      {profile && !myVote && !duel.closed && (
        <div style={{ padding: '.6rem 1.5rem 1rem', fontSize: '.78rem', color: 'var(--text3)', textAlign: 'center' }}>
          Clique sur un film pour voter (+{CONFIG.EXP_VOTE} EXP) · Le vainqueur est diffusé {CONFIG.SEANCE_JOUR} {CONFIG.SEANCE_HEURE} (+{CONFIG.EXP_DUEL_WIN} EXP)
        </div>
      )}
      {!profile && !duel.closed && (
        <div style={{ padding: '.6rem 1.5rem 1rem', fontSize: '.78rem', color: 'var(--text3)', textAlign: 'center' }}>
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
  const myVoteMap = Object.fromEntries(myVotes.map(v => [v.duel_id, v.film_choice]))

  function getVotes(duelId: number, filmId: number) {
    return allVotes.filter(v => v.duel_id === duelId && v.film_choice === filmId).length
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
          allVotes={allVotes}
        />
      ))}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { getBadge } from '@/lib/config'

interface RankedUser {
  id: string
  pseudo: string
  exp: number
  is_admin: boolean
  avatar_url: string | null
  watch_count?: number
  vote_count?: number
  marathon_films?: number
  avg_score?: number
}

interface Props {
  userId: string | null
  ranked: RankedUser[]
  marathonRanked: RankedUser[]
}

function PlayerRow({ u, i, userId, showMarathon }: { u: RankedUser; i: number; userId: string | null; showMarathon: boolean }) {
  const badge = getBadge(u.exp)
  const isMe = userId === u.id
  const rankDisplay = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
  const rankColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text3)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '.9rem',
      background: isMe ? 'rgba(232,196,106,.03)' : 'var(--bg2)',
      border: `1px solid ${isMe ? 'rgba(232,196,106,.35)' : 'var(--border)'}`,
      borderRadius: 'var(--r)', padding: '.75rem 1rem',
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: rankColor, width: 32, textAlign: 'center', flexShrink: 0 }}>
        {rankDisplay}
      </div>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', fontWeight: 600,
        background: isMe ? 'linear-gradient(135deg, var(--gold2), var(--purple))' : 'var(--bg3)',
        color: isMe ? '#0a0a0f' : 'var(--text2)',
        backgroundImage: u.avatar_url ? `url(${u.avatar_url})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        {!u.avatar_url && u.pseudo.slice(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: '.88rem', fontWeight: 500 }}>{u.pseudo}</span>
        {u.is_admin && <span style={{ fontSize: '.65rem', color: 'var(--red)', marginLeft: '.5rem', border: '1px solid rgba(232,90,90,.3)', borderRadius: 99, padding: '1px 6px' }}>ADMIN</span>}
        {isMe && <span style={{ fontSize: '.65rem', color: 'var(--gold)', marginLeft: '.5rem' }}>(toi)</span>}
        {badge && <span className={`badge-pill ${badge.cls}`} style={{ marginLeft: '.6rem', fontSize: '.63rem', padding: '1px 7px' }}>{badge.icon} {badge.label}</span>}
      </div>
      {showMarathon ? (
        <div style={{ display: 'flex', gap: '1.2rem', fontSize: '.73rem', color: 'var(--text2)' }}>
          <span>🎬 {u.marathon_films ?? 0} films</span>
          {u.avg_score != null && <span>⭐ {u.avg_score}/10 moy.</span>}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1.2rem', fontSize: '.73rem', color: 'var(--text2)' }}>
          <span>🎬 {u.watch_count ?? 0}</span>
          <span>⚔️ {u.vote_count ?? 0}</span>
        </div>
      )}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--gold)', flexShrink: 0 }}>{u.exp}</div>
    </div>
  )
}

export default function ClassementClient({ userId, ranked, marathonRanked }: Props) {
  const [tab, setTab] = useState<'global' | 'marathon'>('global')

  const list = tab === 'marathon' ? marathonRanked : ranked

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '.5rem 1.2rem',
    borderRadius: 99,
    fontSize: '.83rem',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    background: active ? 'var(--gold)' : 'transparent',
    color: active ? '#0a0a0f' : 'var(--text2)',
    transition: 'background .15s, color .15s',
  })

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Classement</div>
        <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>{ranked.length} joueur{ranked.length > 1 ? 's' : ''} inscrits</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '.4rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 99, padding: '.3rem', marginBottom: '1.5rem', width: 'fit-content' }}>
        <button style={tabStyle(tab === 'global')} onClick={() => setTab('global')}>🏆 Global</button>
        <button style={tabStyle(tab === 'marathon')} onClick={() => setTab('marathon')}>🎬 Marathon</button>
      </div>

      {tab === 'marathon' && (
        <div style={{ fontSize: '.78rem', color: 'var(--text3)', marginBottom: '1rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.6rem 1rem' }}>
          Classement des films <strong style={{ color: 'var(--text2)' }}>vus et notés</strong> pendant le marathon — tri par nombre de films, puis moyenne des notes.
        </div>
      )}

      {list.length === 0 && (
        <div className="empty">
          <div style={{ fontSize: '2.5rem', marginBottom: '.8rem' }}>🎬</div>
          {tab === 'marathon' ? 'Aucun film vu et noté pendant le marathon pour l\'instant.' : 'Aucun joueur inscrit.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {list.map((u, i) => (
          <PlayerRow key={u.id} u={u} i={i} userId={userId} showMarathon={tab === 'marathon'} />
        ))}
      </div>
    </div>
  )
}

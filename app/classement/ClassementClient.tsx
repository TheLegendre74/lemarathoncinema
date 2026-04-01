'use client'

import { useState } from 'react'
import { getBadge } from '@/lib/config'

interface RankedUser {
  id: string
  pseudo: string
  exp: number
  saison_exp?: number
  is_admin: boolean
  avatar_url: string | null
  watch_count?: number
  vote_count?: number
  marathon_films?: number
  avg_score?: number
}

interface ArchiveRow {
  id: string
  saison: number
  user_id: string
  pseudo: string
  avatar_url: string | null
  exp_total: number
  exp_saison: number
  films_watched: number
  films_marathon: number
  rank_global: number
}

interface Props {
  userId: string | null
  ranked: RankedUser[]
  marathonRanked: RankedUser[]
  archivesBySaison: Record<number, ArchiveRow[]>
}

function Avatar({ user, isMe, size = 34 }: { user: { pseudo: string; avatar_url?: string | null }; isMe: boolean; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.24, fontWeight: 600,
      background: isMe ? 'linear-gradient(135deg, var(--gold2), var(--purple))' : 'var(--bg3)',
      color: isMe ? '#0a0a0f' : 'var(--text2)',
      backgroundImage: user.avatar_url ? `url(${user.avatar_url})` : undefined,
      backgroundSize: 'cover', backgroundPosition: 'center',
    }}>
      {!user.avatar_url && user.pseudo.slice(0, 2).toUpperCase()}
    </div>
  )
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
      <Avatar user={u} isMe={isMe} />
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.88rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.pseudo}</span>
          {u.is_admin && <span style={{ fontSize: '.63rem', color: 'var(--red)', border: '1px solid rgba(232,90,90,.3)', borderRadius: 99, padding: '1px 6px', flexShrink: 0 }}>ADMIN</span>}
          {isMe && <span style={{ fontSize: '.63rem', color: 'var(--gold)', flexShrink: 0 }}>(toi)</span>}
          {badge && <span className={`badge-pill ${badge.cls}`} style={{ fontSize: '.63rem', padding: '1px 7px', flexShrink: 0 }}>{badge.icon} {badge.label}</span>}
        </div>
        {!showMarathon && u.saison_exp != null && u.saison_exp > 0 && (
          <div style={{ fontSize: '.68rem', color: 'var(--text3)', marginTop: '.1rem' }}>+{u.saison_exp} EXP cette saison</div>
        )}
      </div>
      {showMarathon ? (
        <div style={{ display: 'flex', gap: '1rem', fontSize: '.73rem', color: 'var(--text2)' }}>
          <span>🎬 {u.marathon_films ?? 0}</span>
          {u.avg_score != null && <span>⭐ {u.avg_score}/10</span>}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1rem', fontSize: '.73rem', color: 'var(--text2)' }}>
          <span>🎬 {u.watch_count ?? 0}</span>
          <span>⚔️ {u.vote_count ?? 0}</span>
        </div>
      )}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--gold)', flexShrink: 0 }}>{u.exp}</div>
    </div>
  )
}

function ArchiveSection({ saison, rows, userId }: { saison: number; rows: ArchiveRow[]; userId: string | null }) {
  const [open, setOpen] = useState(saison === Math.max(...rows.map(r => r.saison)))

  return (
    <div style={{ marginBottom: '1rem' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: open ? 'var(--r) var(--r) 0 0' : 'var(--r)',
          padding: '.75rem 1rem', cursor: 'pointer', color: 'var(--text)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>🏆 Saison {saison}</span>
        <span style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{rows.length} joueur{rows.length > 1 ? 's' : ''} {open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ border: '1px solid var(--border2)', borderTop: 'none', borderRadius: '0 0 var(--r) var(--r)', overflow: 'hidden' }}>
          {rows.map((row, i) => {
            const isMe = row.user_id === userId
            const rankDisplay = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${row.rank_global}`
            const rankColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text3)'
            return (
              <div key={row.id} style={{
                display: 'flex', alignItems: 'center', gap: '.8rem',
                background: isMe ? 'rgba(232,196,106,.03)' : i % 2 === 0 ? 'var(--bg2)' : 'var(--bg3)',
                padding: '.6rem 1rem',
                borderTop: i > 0 ? '1px solid var(--border)' : undefined,
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: rankColor, width: 30, textAlign: 'center', flexShrink: 0 }}>{rankDisplay}</div>
                <Avatar user={row} isMe={isMe} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '.85rem', fontWeight: isMe ? 600 : 400, color: isMe ? 'var(--gold)' : 'var(--text)' }}>
                    {row.pseudo}{isMe ? ' (toi)' : ''}
                  </span>
                  <div style={{ fontSize: '.68rem', color: 'var(--text3)', marginTop: '.1rem' }}>
                    🎬 {row.films_watched} vus · 🏆 {row.films_marathon} marathon · +{row.exp_saison} EXP saison
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--gold)', flexShrink: 0 }}>{row.exp_total}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ClassementClient({ userId, ranked, marathonRanked, archivesBySaison }: Props) {
  const [tab, setTab] = useState<'global' | 'marathon' | 'archives'>('global')

  const list = tab === 'marathon' ? marathonRanked : ranked
  const saisonKeys = Object.keys(archivesBySaison).map(Number).sort((a, b) => b - a)

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '.5rem 1.1rem', borderRadius: 99, fontSize: '.82rem', fontWeight: 500,
    cursor: 'pointer', border: 'none',
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
      <div style={{ display: 'flex', gap: '.3rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 99, padding: '.3rem', marginBottom: '1.5rem', width: 'fit-content' }}>
        <button style={tabStyle(tab === 'global')} onClick={() => setTab('global')}>🏆 Global</button>
        <button style={tabStyle(tab === 'marathon')} onClick={() => setTab('marathon')}>🎬 Marathon</button>
        <button style={tabStyle(tab === 'archives')} onClick={() => setTab('archives')}>📚 Archives</button>
      </div>

      {tab === 'marathon' && (
        <div style={{ fontSize: '.78rem', color: 'var(--text3)', marginBottom: '1rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.6rem 1rem' }}>
          Films <strong style={{ color: 'var(--text2)' }}>vus et notés</strong> pendant le marathon — tri par nombre de films puis moyenne des notes.
        </div>
      )}

      {tab === 'archives' && (
        <>
          {saisonKeys.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: '2.5rem', marginBottom: '.8rem' }}>📚</div>
              Aucune saison archivée pour l&apos;instant.<br />Les archives apparaissent quand l&apos;admin clôture une saison.
            </div>
          ) : (
            saisonKeys.map(saison => (
              <ArchiveSection
                key={saison}
                saison={saison}
                rows={archivesBySaison[saison]}
                userId={userId}
              />
            ))
          )}
        </>
      )}

      {tab !== 'archives' && (
        <>
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
        </>
      )}
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getBadge } from '@/lib/config'

export const revalidate = 60

export default async function ClassementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: ranked } = await (supabase as any).rpc('leaderboard', { limit_n: 100 })

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Classement</div>
        <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>{ranked?.length ?? 0} joueur{(ranked?.length ?? 0) > 1 ? 's' : ''} inscrits</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {(ranked ?? []).map((u: any, i: number) => {
          const badge = getBadge(u.exp)
          const isMe = u.id === user.id
          const rankDisplay = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
          const rankColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text3)'

          return (
            <div key={u.id} style={{
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
              }}>
                {u.pseudo.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '.88rem', fontWeight: 500 }}>{u.pseudo}</span>
                {u.is_admin && <span style={{ fontSize: '.65rem', color: 'var(--red)', marginLeft: '.5rem', border: '1px solid rgba(232,90,90,.3)', borderRadius: 99, padding: '1px 6px' }}>ADMIN</span>}
                {isMe && <span style={{ fontSize: '.65rem', color: 'var(--gold)', marginLeft: '.5rem' }}>(toi)</span>}
                {badge && <span className={`badge-pill ${badge.cls}`} style={{ marginLeft: '.6rem', fontSize: '.63rem', padding: '1px 7px' }}>{badge.icon} {badge.label}</span>}
              </div>
              <div style={{ display: 'flex', gap: '1.2rem', fontSize: '.73rem', color: 'var(--text2)' }}>
                <span>🎬 {u.watch_count}</span>
                <span>⚔️ {u.vote_count}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--gold)', flexShrink: 0 }}>{u.exp}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { getBadge, levelFromExp, getActiveBadge, CONFIG } from '@/lib/config'
import Image from 'next/image'

export const revalidate = 60

export default async function MarathoniensPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profiles }, { data: allWatched }, { data: totalFilmsData }] = await Promise.all([
    supabase.from('profiles').select('id, pseudo, exp, avatar_url, active_badge, bio').order('exp', { ascending: false }) as any,
    supabase.from('watched').select('user_id, pre'),
    supabase.from('films').select('id', { count: 'exact' }).eq('saison', CONFIG.SAISON_NUMERO).eq('pending_admin_approval', false),
  ])

  const totalFilms = totalFilmsData?.length ?? 0

  // Watched count per user (marathon only, non-pre)
  const watchedMap: Record<string, number> = {}
  const watchedAllMap: Record<string, number> = {}
  ;(allWatched ?? []).forEach((w: any) => {
    watchedAllMap[w.user_id] = (watchedAllMap[w.user_id] ?? 0) + 1
    if (!w.pre) watchedMap[w.user_id] = (watchedMap[w.user_id] ?? 0) + 1
  })

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>🎖️ Marathoniens</div>
        <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>
          {(profiles ?? []).length} joueurs · {CONFIG.SAISON_LABEL}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {(profiles ?? []).map((p: any, i: number) => {
          const level = levelFromExp(p.exp)
          const badge = getActiveBadge(p.exp, p.active_badge)
          const watched = watchedMap[p.id] ?? 0
          const pct = totalFilms ? Math.round((watched / totalFilms) * 100) : 0
          const isMe = user?.id === p.id

          return (
            <div key={p.id} style={{
              background: isMe ? 'rgba(232,196,106,.05)' : 'var(--bg2)',
              border: `1px solid ${isMe ? 'rgba(232,196,106,.35)' : 'var(--border)'}`,
              borderRadius: 'var(--r)', padding: '1rem',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', gap: '.85rem', alignItems: 'center', marginBottom: '.75rem' }}>
                {/* Avatar */}
                <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: isMe ? '2px solid var(--gold)' : '2px solid var(--border)' }}>
                  {p.avatar_url
                    ? <Image src={p.avatar_url} alt={p.pseudo} width={44} height={44} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    : '👤'
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', lineHeight: 1 }}>{p.pseudo}</span>
                    {isMe && <span style={{ fontSize: '.6rem', background: 'rgba(232,196,106,.15)', color: 'var(--gold)', border: '1px solid rgba(232,196,106,.3)', borderRadius: 99, padding: '1px 6px' }}>Moi</span>}
                    <span style={{ fontSize: '.65rem', color: 'var(--text3)', marginLeft: 'auto' }}>#{i + 1}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.25rem' }}>
                    <span style={{ fontSize: '.65rem', color: 'var(--text3)' }}>Niv. {level}</span>
                    <span style={{ fontSize: '.65rem', color: 'var(--gold)' }}>{p.exp} EXP</span>
                    {badge && <span className={`badge-pill ${badge.cls}`} style={{ fontSize: '.58rem', padding: '1px 6px' }}>{badge.icon} {badge.label}</span>}
                  </div>
                </div>
              </div>

              {/* Bio */}
              {p.bio && (
                <div style={{ fontSize: '.78rem', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '.75rem', fontStyle: 'italic', borderLeft: '2px solid var(--border2)', paddingLeft: '.6rem' }}>
                  {p.bio}
                </div>
              )}

              {/* Progression */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.68rem', color: 'var(--text3)', marginBottom: '.3rem' }}>
                  <span>Progression marathon</span>
                  <span style={{ color: pct >= 100 ? 'var(--gold)' : 'var(--text2)' }}>{watched}/{totalFilms} · {pct}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--gold)' : 'var(--green)', borderRadius: 99, transition: 'width .3s' }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

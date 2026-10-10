import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getBadge, levelFromExp, getActiveBadge } from '@/lib/config'
import { getServerConfig } from '@/lib/serverConfig'
import { withCache } from '@/lib/redis'
import Image from 'next/image'
import Link from 'next/link'
import { getUserCached } from '@/lib/auth'

export const revalidate = 120

export default async function MarathoniensPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const cfg = await getServerConfig()
  const user = await getUserCached()

  const [{ data: profiles }, totalFilmsResult, watchedMaps] = await Promise.all([
    supabase.from('profiles').select('id, pseudo, exp, avatar_url, active_badge, bio').order('exp', { ascending: false }) as any,
    adminClient.from('films').select('id', { count: 'exact', head: true }).lte('saison', cfg.SAISON_NUMERO).eq('pending_admin_approval', false),
    withCache('marathoniens:watched_maps', 120, async () => {
      const allWatched: { user_id: string; pre: boolean }[] = []
      let pageFrom = 0
      while (true) {
        const { data: page } = await adminClient
          .from('watched')
          .select('user_id, pre')
          .range(pageFrom, pageFrom + 999)
        if (!page || page.length === 0) break
        allWatched.push(...(page as any))
        if (page.length < 1000) break
        pageFrom += 1000
      }
      const wMap: Record<string, number> = {}
      const pMap: Record<string, number> = {}
      allWatched.forEach((w: any) => {
        if (w.pre) pMap[w.user_id] = (pMap[w.user_id] ?? 0) + 1
        else wMap[w.user_id] = (wMap[w.user_id] ?? 0) + 1
      })
      return { watchedMap: wMap, preMap: pMap }
    }),
  ])

  const totalFilms = (totalFilmsResult as any).count ?? 0
  const { watchedMap, preMap } = watchedMaps

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--f-display)', fontSize: '2rem', lineHeight: 1 }}>🎖️ Marathoniens</div>
        <div style={{ color: 'var(--ink2)', fontSize: '.83rem', marginTop: '.35rem' }}>
          {(profiles ?? []).length} joueurs · {cfg.SAISON_LABEL}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '1rem' }}>
        {(profiles ?? []).map((p: any, i: number) => {
          const level = levelFromExp(p.exp)
          const badge = getActiveBadge(p.exp, p.active_badge)
          const watched = watchedMap[p.id] ?? 0
          const pre     = preMap[p.id] ?? 0
          const pct = totalFilms ? Math.round((watched / totalFilms) * 100) : 0
          const isMe = user?.id === p.id

          return (
            <div key={p.id} style={{
              background: isMe ? 'rgba(232,196,106,.05)' : 'var(--s1)',
              border: `1px solid ${isMe ? 'rgba(232,196,106,.35)' : 'var(--line)'}`,
              borderRadius: 'var(--radius)', padding: '1rem',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', gap: '.85rem', alignItems: 'center', marginBottom: '.75rem' }}>
                {/* Avatar */}
                <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: isMe ? '2px solid var(--accent-fg)' : '2px solid var(--line)' }}>
                  {p.avatar_url
                    ? <Image src={p.avatar_url} alt={p.pseudo} width={44} height={44} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    : '👤'
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--f-display)', fontSize: '1rem', lineHeight: 1 }}>{p.pseudo}</span>
                    {isMe && <span style={{ fontSize: '.6rem', background: 'rgba(232,196,106,.15)', color: 'var(--accent-fg)', border: '1px solid rgba(232,196,106,.3)', borderRadius: 99, padding: '1px 6px' }}>Moi</span>}
                    <span style={{ fontSize: '.65rem', color: 'var(--ink3)', marginLeft: 'auto' }}>#{i + 1}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.25rem' }}>
                    <span style={{ fontSize: '.65rem', color: 'var(--ink3)' }}>Niv. {level}</span>
                    <span style={{ fontSize: '.65rem', color: 'var(--accent-fg)' }}>{p.exp} EXP</span>
                    {badge && <span className={`badge-pill ${badge.cls}`} style={{ fontSize: '.58rem', padding: '1px 6px' }}>{badge.icon} {badge.label}</span>}
                  </div>
                </div>
              </div>

              {/* Stats films — 3 cases */}
              <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.7rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 72, background: 'var(--s2)', borderRadius: 'var(--radius)', padding: '.45rem .6rem', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.1rem', color: 'var(--ok)', lineHeight: 1 }}>{watched}</div>
                  <div style={{ fontSize: '.58rem', color: 'var(--ink3)', marginTop: '.15rem', textTransform: 'uppercase', letterSpacing: '.5px', lineHeight: 1.3 }}>Films vus<br/>pendant</div>
                </div>
                <div style={{ flex: 1, minWidth: 72, background: 'var(--s2)', borderRadius: 'var(--radius)', padding: '.45rem .6rem', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.1rem', color: 'var(--info)', lineHeight: 1 }}>{pre}</div>
                  <div style={{ fontSize: '.58rem', color: 'var(--ink3)', marginTop: '.15rem', textTransform: 'uppercase', letterSpacing: '.5px', lineHeight: 1.3 }}>Films vus<br/>pré-marathon</div>
                </div>
                <div style={{ flex: 1, minWidth: 72, background: 'var(--s2)', borderRadius: 'var(--radius)', padding: '.45rem .6rem', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.1rem', color: 'var(--accent-fg)', lineHeight: 1 }}>{pct}%</div>
                  <div style={{ fontSize: '.58rem', color: 'var(--ink3)', marginTop: '.15rem', textTransform: 'uppercase', letterSpacing: '.5px', lineHeight: 1.3 }}>Progression<br/>marathon</div>
                </div>
              </div>

              {/* Bio */}
              {p.bio && (
                <div style={{ fontSize: '.78rem', color: 'var(--ink2)', lineHeight: 1.5, marginBottom: '.75rem', fontStyle: 'italic', borderLeft: '2px solid var(--line2)', paddingLeft: '.6rem' }}>
                  {p.bio}
                </div>
              )}

              {/* Barre de progression */}
              <div style={{ marginBottom: '.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.65rem', color: 'var(--ink3)', marginBottom: '.25rem' }}>
                  <span>Marathon</span>
                  <span style={{ color: pct >= 100 ? 'var(--accent-fg)' : 'var(--ink2)' }}>{watched}/{totalFilms}</span>
                </div>
                <div style={{ height: 5, background: 'var(--s2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--accent-fg)' : 'var(--ok)', borderRadius: 99, transition: 'width .3s' }} />
                </div>
              </div>

              {/* Message button (only if logged in and not own card) */}
              {user && !isMe && (
                <Link
                  href={`/profil?with=${p.id}`}
                  style={{ display: 'block', textAlign: 'center', fontSize: '.72rem', padding: '.35rem', background: 'var(--s2)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', color: 'var(--ink2)', textDecoration: 'none' }}
                >
                  ✉️ Message
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ForumTopicModal from './ForumTopicModal'

export const revalidate = 30

export default async function ForumPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: topics } = await (supabase as any)
    .from('forum_topics')
    .select('*, profiles(pseudo)')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  // Get last post per topic
  const topicIds = (topics ?? []).map((t: any) => t.id)
  const { data: lastPosts } = topicIds.length
    ? await (supabase as any)
        .from('forum_posts')
        .select('topic_id, created_at, profiles(pseudo)')
        .in('topic_id', topicIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const lastPostMap: Record<string, any> = {}
  ;(lastPosts ?? []).forEach((p: any) => {
    if (!lastPostMap[p.topic_id]) lastPostMap[p.topic_id] = p
  })

  // Post count per topic
  const { data: postCounts } = topicIds.length
    ? await (supabase as any)
        .from('forum_posts')
        .select('topic_id')
        .in('topic_id', topicIds)
    : { data: [] }

  const countMap: Record<string, number> = {}
  ;(postCounts ?? []).forEach((p: any) => {
    countMap[p.topic_id] = (countMap[p.topic_id] ?? 0) + 1
  })

  const socialTopic = (topics ?? []).find((t: any) => t.is_social)
  const otherTopics = (topics ?? []).filter((t: any) => !t.is_social)

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Forum</div>
          <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>{(topics ?? []).length} topics · discussions libres</div>
        </div>
        {user && <ForumTopicModal />}
      </div>

      {/* Social wall */}
      {socialTopic && (
        <Link href={`/forum/${socialTopic.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: '1.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(100,60,200,.15), rgba(60,120,200,.1))',
            border: '1px solid rgba(130,80,220,.4)',
            borderRadius: 'var(--rl)', padding: '1.5rem',
            transition: 'border-color .2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2.2rem' }}>💬</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text)' }}>Le Salon</div>
                <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginTop: '.2rem' }}>{socialTopic.description}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--gold)' }}>{countMap[socialTopic.id] ?? 0}</div>
                <div style={{ fontSize: '.65rem', color: 'var(--text3)' }}>messages</div>
              </div>
            </div>
            {lastPostMap[socialTopic.id] && (
              <div style={{ marginTop: '.8rem', fontSize: '.72rem', color: 'var(--text3)', borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: '.6rem' }}>
                Dernier message de <strong>{lastPostMap[socialTopic.id].profiles?.pseudo}</strong> · {new Date(lastPostMap[socialTopic.id].created_at).toLocaleDateString('fr-FR')}
              </div>
            )}
          </div>
        </Link>
      )}

      {/* Other topics */}
      <div className="section-title">Topics</div>
      {!otherTopics.length ? (
        <div className="empty">
          <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>💬</div>
          {user ? 'Aucun topic pour l\'instant. Crée le premier !' : 'Aucun topic pour l\'instant.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {otherTopics.map((t: any) => (
            <Link key={t.id} href={`/forum/${t.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: 'var(--bg2)', border: `1px solid ${t.pinned ? 'rgba(232,196,106,.3)' : 'var(--border)'}`,
                borderRadius: 'var(--r)', padding: '.9rem 1.1rem',
                transition: 'border-color .2s',
              }}>
                <div style={{ fontSize: '1.3rem' }}>{t.pinned ? '📌' : '💬'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.88rem', fontWeight: 500, marginBottom: '.15rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    {t.title}
                    {t.pinned && <span style={{ fontSize: '.6rem', color: 'var(--gold)', border: '1px solid rgba(232,196,106,.3)', borderRadius: 99, padding: '1px 6px' }}>ÉPINGLÉ</span>}
                  </div>
                  {t.description && <div style={{ fontSize: '.73rem', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>}
                  {lastPostMap[t.id] && (
                    <div style={{ fontSize: '.68rem', color: 'var(--text3)', marginTop: '.2rem' }}>
                      Dernier message de <strong>{lastPostMap[t.id].profiles?.pseudo}</strong> · {new Date(lastPostMap[t.id].created_at).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text2)' }}>{countMap[t.id] ?? 0}</div>
                  <div style={{ fontSize: '.63rem', color: 'var(--text3)' }}>messages</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!user && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '.83rem', color: 'var(--text3)' }}>
          <Link href="/auth" style={{ color: 'var(--gold)' }}>Connecte-toi</Link> pour créer des topics et participer aux discussions.
        </div>
      )}
    </div>
  )
}

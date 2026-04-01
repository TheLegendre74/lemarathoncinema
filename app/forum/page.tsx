import { createClient } from '@/lib/supabase/server'
import ForumPageClient from './ForumPageClient'

export const revalidate = 0

export default async function ForumPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profile = user
    ? (await supabase.from('profiles').select('*').eq('id', user.id).single()).data
    : null

  const { data: topics } = await (supabase as any)
    .from('forum_topics')
    .select('*, profiles(pseudo)')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  const socialTopic = (topics ?? []).find((t: any) => t.is_social) ?? null
  const otherTopics = (topics ?? []).filter((t: any) => !t.is_social)

  // Last post per non-social topic
  const otherIds = otherTopics.map((t: any) => t.id)
  const { data: lastPosts } = otherIds.length
    ? await (supabase as any)
        .from('forum_posts')
        .select('topic_id, created_at, profiles(pseudo)')
        .in('topic_id', otherIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const lastPostMap: Record<string, any> = {}
  ;(lastPosts ?? []).forEach((p: any) => {
    if (!lastPostMap[p.topic_id]) lastPostMap[p.topic_id] = p
  })

  // Post count per non-social topic
  const { data: postCounts } = otherIds.length
    ? await (supabase as any)
        .from('forum_posts')
        .select('topic_id')
        .in('topic_id', otherIds)
    : { data: [] }

  const countMap: Record<string, number> = {}
  ;(postCounts ?? []).forEach((p: any) => {
    countMap[p.topic_id] = (countMap[p.topic_id] ?? 0) + 1
  })

  // Le Salon: fetch last 60 messages (returned desc, client will display asc)
  const { data: salonMessages } = socialTopic
    ? await (supabase as any)
        .from('forum_posts')
        .select('*, profiles(pseudo, avatar_url)')
        .eq('topic_id', socialTopic.id)
        .order('created_at', { ascending: false })
        .limit(60)
    : { data: [] }

  const initialMessages = (salonMessages ?? []).slice().reverse()

  return (
    <ForumPageClient
      profile={profile}
      socialTopic={socialTopic}
      initialMessages={initialMessages}
      otherTopics={otherTopics}
      lastPostMap={lastPostMap}
      countMap={countMap}
      totalTopics={(topics ?? []).length}
    />
  )
}

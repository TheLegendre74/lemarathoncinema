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

  const otherTopics = (topics ?? []).filter((t: any) => !t.is_social)

  const otherIds = otherTopics.map((t: any) => t.id)

  const [{ data: lastPosts }, { data: postCounts }] = await Promise.all([
    otherIds.length
      ? (supabase as any)
          .from('forum_posts')
          .select('topic_id, created_at, profiles(pseudo)')
          .in('topic_id', otherIds)
          .order('created_at', { ascending: false })
      : { data: [] },
    otherIds.length
      ? (supabase as any).from('forum_posts').select('topic_id').in('topic_id', otherIds)
      : { data: [] },
  ])

  const lastPostMap: Record<string, any> = {}
  ;(lastPosts ?? []).forEach((p: any) => {
    if (!lastPostMap[p.topic_id]) lastPostMap[p.topic_id] = p
  })

  const countMap: Record<string, number> = {}
  ;(postCounts ?? []).forEach((p: any) => {
    countMap[p.topic_id] = (countMap[p.topic_id] ?? 0) + 1
  })

  return (
    <ForumPageClient
      profile={profile}
      otherTopics={otherTopics}
      lastPostMap={lastPostMap}
      countMap={countMap}
      totalTopics={(topics ?? []).length}
    />
  )
}

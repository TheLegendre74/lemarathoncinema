import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ForumTopicClient from './ForumTopicClient'
import { getUserCached } from '@/lib/auth'

export const revalidate = 30

interface Props { params: Promise<{ topicId: string }> }

export default async function ForumTopicPage({ params }: Props) {
  const { topicId } = await params
  const supabase = await createClient()
  const user = await getUserCached()

  const [{ data: topic }, { data: posts }, profileResult] = await Promise.all([
    (supabase as any).from('forum_topics').select('id, title, pinned, is_social, created_at, author_id').eq('id', topicId).single(),
    (supabase as any)
      .from('forum_posts')
      .select('*, profiles(id, pseudo, avatar_url, exp, active_badge)')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true }),
    user
      ? supabase.from('profiles').select('id, pseudo, is_admin, avatar_url, exp, active_badge').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  if (!topic) redirect('/forum')

  const profile = profileResult.data

  return (
    <ForumTopicClient
      topic={topic}
      posts={posts ?? []}
      profile={profile as any}
    />
  )
}

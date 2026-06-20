import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ForumTopicClient from './ForumTopicClient'

export const revalidate = 20

interface Props { params: Promise<{ topicId: string }> }

export default async function ForumTopicPage({ params }: Props) {
  const { topicId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: topic }, { data: posts }, profileResult] = await Promise.all([
    (supabase as any).from('forum_topics').select('*').eq('id', topicId).single(),
    (supabase as any)
      .from('forum_posts')
      .select('*, profiles(id, pseudo, avatar_url, exp, active_badge)')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true }),
    user
      ? supabase.from('profiles').select('*').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  if (!topic) redirect('/forum')

  const profile = profileResult.data

  return (
    <ForumTopicClient
      topic={topic}
      posts={posts ?? []}
      profile={profile}
    />
  )
}

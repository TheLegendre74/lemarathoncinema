import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ForumTopicClient from './ForumTopicClient'

export const revalidate = 0

interface Props { params: { topicId: string } }

export default async function ForumTopicPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: topic }, { data: posts }] = await Promise.all([
    (supabase as any).from('forum_topics').select('*').eq('id', params.topicId).single(),
    (supabase as any)
      .from('forum_posts')
      .select('*, profiles(id, pseudo, avatar_url)')
      .eq('topic_id', params.topicId)
      .order('created_at', { ascending: true }),
  ])

  if (!topic) redirect('/forum')

  const profile = user
    ? (await supabase.from('profiles').select('*').eq('id', user.id).single()).data
    : null

  return (
    <ForumTopicClient
      topic={topic}
      posts={posts ?? []}
      profile={profile}
    />
  )
}

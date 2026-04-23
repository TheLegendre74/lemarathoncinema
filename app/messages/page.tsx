import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getMyConversations, getConversationMessages } from '@/lib/actions'
import MessagesSection from '@/components/MessagesSection'

export const revalidate = 0

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { with: withUserId } = await searchParams

  const [conversations, threadMessages] = await Promise.all([
    getMyConversations(),
    withUserId ? getConversationMessages(withUserId) : Promise.resolve([]),
  ])

  let initialOtherProfile: { id: string; pseudo: string; avatar_url: string | null } | null = null
  if (withUserId) {
    const conv = conversations.find((c: any) => c.otherId === withUserId)
    if (conv?.profile) {
      initialOtherProfile = conv.profile
    } else {
      const { data: op } = await supabase.from('profiles').select('id, pseudo, avatar_url').eq('id', withUserId).single()
      initialOtherProfile = op ?? null
    }
  }

  const { data: blockedData } = await (supabase as any)
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', user.id)
  const blockedIds: string[] = (blockedData ?? []).map((b: any) => b.blocked_id)

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Messages privés</div>
        <div style={{ fontSize: '.8rem', color: 'var(--text3)', marginTop: '.4rem' }}>
          Tes conversations avec les autres marathoniens
        </div>
      </div>

      <MessagesSection
        myId={user.id}
        conversations={conversations as any}
        initialWithId={withUserId ?? null}
        initialMessages={threadMessages as any}
        initialOtherProfile={initialOtherProfile as any}
        blockedIds={blockedIds}
      />
    </div>
  )
}

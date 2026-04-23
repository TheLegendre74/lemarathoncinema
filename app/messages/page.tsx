import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MessagesSection from '@/components/MessagesSection'

export const revalidate = 0

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { with: withUserId } = await searchParams

  // RPC + blocked + thread — tout en parallèle, 1 seule requête pour les conversations
  const [rpcData, blockedData, threadData] = await Promise.all([
    (supabase as any).rpc('get_my_conversations'),
    (supabase as any).from('blocked_users').select('blocked_id').eq('blocker_id', user.id),
    withUserId
      ? (supabase as any)
          .from('private_messages')
          .select('id, sender_id, recipient_id, content, read_at, created_at, deleted_by_sender, deleted_by_recipient')
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${withUserId}),and(sender_id.eq.${withUserId},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: true })
          .limit(60)
      : Promise.resolve({ data: [] }),
  ])

  // Mapper le résultat RPC vers le format attendu par MessagesSection
  const conversations = (rpcData.data ?? []).map((row: any) => ({
    otherId: row.other_id,
    unread: Number(row.unread_count),
    lastMessage: {
      id: row.last_message_id,
      sender_id: row.last_sender_id,
      recipient_id: row.last_recipient_id,
      content: row.last_content,
      read_at: row.last_read_at,
      created_at: row.last_created_at,
    },
    profile: row.pseudo ? { id: row.other_id, pseudo: row.pseudo, avatar_url: row.avatar_url ?? null } : null,
  }))

  const threadMessages = withUserId
    ? ((threadData.data ?? []) as any[]).filter((m: any) =>
        m.sender_id === user.id ? !m.deleted_by_sender : !m.deleted_by_recipient
      )
    : []

  // Profil interlocuteur initial (déjà dans le RPC si la conv existe)
  let initialOtherProfile: { id: string; pseudo: string; avatar_url: string | null } | null = null
  if (withUserId) {
    const fromConv = conversations.find((c: any) => c.otherId === withUserId)
    initialOtherProfile = fromConv?.profile ?? null
    if (!initialOtherProfile) {
      const { data: op } = await supabase.from('profiles').select('id, pseudo, avatar_url').eq('id', withUserId).single()
      initialOtherProfile = op ?? null
    }
  }

  const blockedIds: string[] = (blockedData.data ?? []).map((b: any) => b.blocked_id)

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
        basePath="/messages"
      />
    </div>
  )
}

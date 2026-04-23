import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MessagesSection from '@/components/MessagesSection'

export const revalidate = 0

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { with: withUserId } = await searchParams

  // Tout en parallèle avec le même client — évite 4x getUser() séparés
  const [messagesData, blockedData, threadData] = await Promise.all([
    (supabase as any)
      .from('private_messages')
      .select('id, sender_id, recipient_id, content, read_at, created_at, deleted_by_sender, deleted_by_recipient')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(100),
    (supabase as any)
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', user.id),
    withUserId
      ? (supabase as any)
          .from('private_messages')
          .select('id, sender_id, recipient_id, content, read_at, created_at, deleted_by_sender, deleted_by_recipient')
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${withUserId}),and(sender_id.eq.${withUserId},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: true })
          .limit(60)
      : Promise.resolve({ data: [] }),
  ])

  // Grouper les conversations
  const rawMessages: any[] = messagesData.data ?? []
  const convMap: Record<string, any> = {}
  for (const msg of rawMessages) {
    if (msg.sender_id === user.id && msg.deleted_by_sender) continue
    if (msg.recipient_id === user.id && msg.deleted_by_recipient) continue
    const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id
    if (!convMap[otherId]) convMap[otherId] = { otherId, lastMessage: msg, unread: 0 }
    if (msg.recipient_id === user.id && !msg.read_at) convMap[otherId].unread++
  }

  // Profils en une seule requête
  const otherIds = Object.keys(convMap)
  const profileMap: Record<string, any> = {}
  if (otherIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, pseudo, avatar_url')
      .in('id', otherIds)
    for (const p of (profiles ?? [])) profileMap[p.id] = p
  }

  const conversations = Object.values(convMap)
    .map((c: any) => ({ ...c, profile: profileMap[c.otherId] ?? null }))
    .sort((a: any, b: any) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime())

  // Filtrer les messages du thread actif
  const threadMessages = withUserId
    ? ((threadData.data ?? []) as any[]).filter((m: any) =>
        m.sender_id === user.id ? !m.deleted_by_sender : !m.deleted_by_recipient
      )
    : []

  // Profil de l'interlocuteur initial
  let initialOtherProfile: { id: string; pseudo: string; avatar_url: string | null } | null = null
  if (withUserId) {
    initialOtherProfile = profileMap[withUserId] ?? null
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

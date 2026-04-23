'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MessagesSection from '@/components/MessagesSection'

interface Profile { id: string; pseudo: string; avatar_url: string | null }

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 64, borderRadius: 'var(--r)',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          animation: 'pulse 1.4s ease-in-out infinite',
          opacity: 1 - i * 0.15,
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }`}</style>
    </div>
  )
}

export default function MessagesLoader({ myId, initialWithId }: { myId: string; initialWithId: string | null }) {
  const [ready, setReady] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  const [threadMessages, setThreadMessages] = useState<any[]>([])
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null)
  const [blockedIds, setBlockedIds] = useState<string[]>([])
  const searchParams = useSearchParams()
  const withUserId = searchParams.get('with') ?? initialWithId

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      // Tout en direct vers Supabase — pas de server action, pas de hop Vercel
      const [rpcRes, blockedRes, threadRes] = await Promise.all([
        (supabase as any).rpc('get_my_conversations'),
        (supabase as any).from('blocked_users').select('blocked_id').eq('blocker_id', myId),
        withUserId
          ? (supabase as any)
              .from('private_messages')
              .select('id, sender_id, recipient_id, content, read_at, created_at, deleted_by_sender, deleted_by_recipient')
              .or(`and(sender_id.eq.${myId},recipient_id.eq.${withUserId}),and(sender_id.eq.${withUserId},recipient_id.eq.${myId})`)
              .order('created_at', { ascending: true })
              .limit(60)
          : Promise.resolve({ data: [] }),
      ])

      const convs = (rpcRes.data ?? []).map((row: any) => ({
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

      setConversations(convs)
      setBlockedIds((blockedRes.data ?? []).map((b: any) => b.blocked_id))

      const thread = (threadRes.data ?? []).filter((m: any) =>
        m.sender_id === myId ? !m.deleted_by_sender : !m.deleted_by_recipient
      )
      setThreadMessages(thread)

      if (withUserId) {
        const fromConv = convs.find((c: any) => c.otherId === withUserId)
        if (fromConv?.profile) {
          setOtherProfile(fromConv.profile)
        } else {
          const { data } = await (supabase as any).from('profiles').select('id, pseudo, avatar_url').eq('id', withUserId).single()
          if (data) setOtherProfile(data)
        }
      }

      setReady(true)
    }

    load()
  }, []) // eslint-disable-line

  if (!ready) return <Skeleton />

  return (
    <MessagesSection
      myId={myId}
      conversations={conversations}
      initialWithId={withUserId}
      initialMessages={threadMessages}
      initialOtherProfile={otherProfile}
      blockedIds={blockedIds}
      basePath="/messages"
    />
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  getMyConversations, getConversationMessages,
} from '@/lib/actions'
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
    async function load() {
      const supabase = createClient()

      const [convs, blocked, thread] = await Promise.all([
        getMyConversations(),
        (supabase as any).from('blocked_users').select('blocked_id').eq('blocker_id', myId),
        withUserId ? getConversationMessages(withUserId) : Promise.resolve([]),
      ])

      setConversations(convs)
      setBlockedIds((blocked.data ?? []).map((b: any) => b.blocked_id))
      setThreadMessages(Array.isArray(thread) ? thread : [])

      if (withUserId) {
        const fromConv = convs.find((c: any) => c.otherId === withUserId)
        if (fromConv?.profile) {
          setOtherProfile(fromConv.profile)
        } else {
          const { data } = await supabase.from('profiles').select('id, pseudo, avatar_url').eq('id', withUserId).single()
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

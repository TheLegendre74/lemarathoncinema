'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  sendMessage, deleteMessage, blockUser, unblockUser,
  markMessagesAsRead, getConversationMessages,
} from '@/lib/actions'

interface Profile {
  id: string
  pseudo: string
  avatar_url: string | null
}

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read_at: string | null
  created_at: string
}

interface Conversation {
  otherId: string
  lastMessage: Message
  unread: number
  profile: Profile | null
}

interface Props {
  myId: string
  conversations: Conversation[]
  initialWithId?: string | null
  initialMessages?: Message[]
  initialOtherProfile?: Profile | null
  blockedIds: string[]
  basePath?: string
}

function Avatar({ profile, size = 32 }: { profile: Profile | null; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4 }}>
      {profile?.avatar_url
        ? <Image src={profile.avatar_url} alt={profile.pseudo ?? ''} width={size} height={size} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
        : '👤'
      }
    </div>
  )
}

export default function MessagesSection({
  myId, conversations: initialConvs, initialWithId,
  initialMessages, initialOtherProfile, blockedIds: initialBlockedIds,
  basePath = '/profil',
}: Props) {
  const router = useRouter()
  const [convs, setConvs] = useState<Conversation[]>(initialConvs)
  const [activeId, setActiveId] = useState<string | null>(initialWithId ?? null)
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? [])
  const [otherProfile, setOtherProfile] = useState<Profile | null>(initialOtherProfile ?? null)
  const [draft, setDraft] = useState('')
  const [pending, startTransition] = useTransition()
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set(initialBlockedIds))
  const [confirmBlock, setConfirmBlock] = useState(false)
  // Mobile: 'list' = show conversation list, 'thread' = show open conversation
  const [mobileView, setMobileView] = useState<'list' | 'thread'>(initialWithId ? 'thread' : 'list')
  const [isMobile, setIsMobile] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Scroll to bottom when messages change or thread opens
  useEffect(() => {
    if (activeId && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, activeId])

  // Mark as read when opening a conversation
  useEffect(() => {
    if (!activeId) return
    markMessagesAsRead(activeId).then(() => {
      setConvs(prev => prev.map(c => c.otherId === activeId ? { ...c, unread: 0 } : c))
    })
  }, [activeId])

  // Polling : rafraîchit les messages toutes les 5s pour afficher les messages reçus
  useEffect(() => {
    if (!activeId) return
    const interval = setInterval(async () => {
      const fresh = await getConversationMessages(activeId)
      setMessages(prev => {
        // Pas de re-render inutile si rien de nouveau
        if (fresh.length === prev.length) return prev
        return fresh
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [activeId])

  function openConversation(otherId: string, profile: Profile | null) {
    setActiveId(otherId)
    setOtherProfile(profile)
    setConfirmBlock(false)
    setMobileView('thread')
    router.push(`${basePath}?with=${otherId}`, { scroll: false })
  }

  function goBackToList() {
    setActiveId(null)
    setMessages([])
    setMobileView('list')
    router.push(basePath, { scroll: false })
  }

  function handleSend() {
    if (!activeId || !draft.trim()) return
    const content = draft.trim()
    setDraft('')
    startTransition(async () => {
      const res = await sendMessage(activeId, content)
      if (res?.error) { alert(res.error); return }
      const newMsg: Message = {
        id: Date.now().toString(),
        sender_id: myId,
        recipient_id: activeId,
        content,
        read_at: null,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, newMsg])
      setConvs(prev => {
        const existing = prev.find(c => c.otherId === activeId)
        if (existing) return [{ ...existing, lastMessage: newMsg }, ...prev.filter(c => c.otherId !== activeId)]
        return [{ otherId: activeId, lastMessage: newMsg, unread: 0, profile: otherProfile }, ...prev]
      })
    })
  }

  function handleDelete(msgId: string) {
    startTransition(async () => {
      await deleteMessage(msgId)
      setMessages(prev => prev.filter(m => m.id !== msgId))
    })
  }

  function handleBlock() {
    if (!activeId) return
    startTransition(async () => {
      await blockUser(activeId)
      setBlockedIds(prev => new Set([...prev, activeId]))
      setConfirmBlock(false)
      goBackToList()
    })
  }

  function handleUnblock(targetId: string) {
    startTransition(async () => {
      await unblockUser(targetId)
      setBlockedIds(prev => { const s = new Set(prev); s.delete(targetId); return s })
    })
  }

  const isBlocked = activeId ? blockedIds.has(activeId) : false

  // ── CONVERSATION LIST ───────────────────────────────────────
  const ConvList = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
      {convs.length === 0 ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '2rem', textAlign: 'center', color: 'var(--text3)', fontSize: '.83rem' }}>
          Aucun message. Va sur la page <strong>Marathoniens</strong> pour envoyer un message à quelqu'un !
        </div>
      ) : (
        convs.map(c => (
          <button
            key={c.otherId}
            onClick={() => openConversation(c.otherId, c.profile)}
            style={{
              display: 'flex', alignItems: 'center', gap: '.75rem',
              background: activeId === c.otherId ? 'rgba(232,196,106,.08)' : 'var(--bg2)',
              border: `1px solid ${activeId === c.otherId ? 'rgba(232,196,106,.35)' : 'var(--border)'}`,
              borderRadius: 'var(--r)', padding: '.75rem 1rem', cursor: 'pointer', textAlign: 'left', width: '100%',
            }}
          >
            <Avatar profile={c.profile} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.profile?.pseudo ?? '?'}
              </div>
              <div style={{ fontSize: '.72rem', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '.15rem' }}>
                {c.lastMessage.content}
              </div>
            </div>
            {c.unread > 0 && (
              <span style={{ background: 'var(--red, #e55)', color: '#fff', borderRadius: 99, fontSize: '.6rem', fontWeight: 700, padding: '2px 7px', flexShrink: 0 }}>
                {c.unread}
              </span>
            )}
            <span style={{ color: 'var(--text3)', fontSize: '1rem', flexShrink: 0 }}>›</span>
          </button>
        ))
      )}
    </div>
  )

  // ── THREAD VIEW ─────────────────────────────────────────────
  const ThreadView = activeId ? (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)',
      display: 'flex', flexDirection: 'column',
      // On mobile: fill remaining screen space; on desktop: fixed height
      height: isMobile ? 'calc(100dvh - 13rem)' : 420,
      minHeight: 320,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.75rem 1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {/* Back button (mobile only) */}
        {isMobile && (
          <button
            onClick={goBackToList}
            style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: '1.3rem', cursor: 'pointer', padding: '0 .25rem', lineHeight: 1, flexShrink: 0 }}
          >
            ‹
          </button>
        )}
        <Avatar profile={otherProfile} size={30} />
        <span style={{ fontWeight: 600, fontSize: '.9rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {otherProfile?.pseudo ?? '?'}
        </span>
        {/* Block button */}
        {!confirmBlock ? (
          <button
            onClick={() => setConfirmBlock(true)}
            style={{ fontSize: '.62rem', color: 'var(--text3)', background: 'none', border: '1px solid var(--border)', borderRadius: 99, padding: '3px 9px', cursor: 'pointer', flexShrink: 0 }}
          >
            {isBlocked ? '✓ Bloqué' : 'Bloquer'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '.35rem', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '.62rem', color: 'var(--text3)' }}>Bloquer ?</span>
            <button onClick={handleBlock} style={{ fontSize: '.62rem', padding: '3px 8px', background: 'none', border: '1px solid var(--red, #e55)', borderRadius: 99, color: 'var(--red, #e55)', cursor: 'pointer' }}>Oui</button>
            <button onClick={() => setConfirmBlock(false)} style={{ fontSize: '.62rem', padding: '3px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: 99, color: 'var(--text3)', cursor: 'pointer' }}>Non</button>
          </div>
        )}
      </div>

      {/* Messages scroll area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '.5rem', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '.78rem', marginTop: '2rem' }}>
            Début de la conversation
          </div>
        )}
        {messages.map(m => {
          const isMe = m.sender_id === myId
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '.4rem', alignItems: 'flex-end' }}>
              <div style={{
                maxWidth: '78%',
                background: isMe ? 'rgba(232,196,106,.13)' : 'var(--bg3)',
                border: `1px solid ${isMe ? 'rgba(232,196,106,.28)' : 'var(--border)'}`,
                borderRadius: isMe ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                padding: '.5rem .8rem', fontSize: '.85rem', lineHeight: 1.5,
                wordBreak: 'break-word',
              }}>
                {m.content}
                <div style={{ fontSize: '.58rem', color: 'var(--text3)', marginTop: '.2rem', textAlign: isMe ? 'right' : 'left', display: 'flex', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '.3rem' }}>
                  <span>{new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && (
                    <button
                      onClick={() => handleDelete(m.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '.62rem', padding: 0, lineHeight: 1 }}
                    >🗑</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      {isBlocked ? (
        <div style={{ padding: '.75rem 1rem', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '.78rem', color: 'var(--text3)', flexShrink: 0 }}>
          Tu as bloqué cet utilisateur.
          <button onClick={() => handleUnblock(activeId)} style={{ marginLeft: '.5rem', background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '.78rem' }}>Débloquer</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '.5rem', padding: '.6rem .75rem', borderTop: '1px solid var(--border)', flexShrink: 0, alignItems: 'center' }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value.slice(0, 1000))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Écris un message..."
            style={{
              flex: 1, background: 'var(--bg3)', border: '1px solid var(--border2)',
              borderRadius: 99, padding: '.55rem 1rem',
              color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.85rem',
              outline: 'none', minWidth: 0,
            }}
          />
          <button
            onClick={handleSend}
            disabled={pending || !draft.trim()}
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: draft.trim() ? 'var(--gold)' : 'var(--bg3)',
              border: 'none', cursor: draft.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', transition: 'background .15s',
            }}
          >
            ↑
          </button>
        </div>
      )}
    </div>
  ) : null

  // ── EMPTY STATE ─────────────────────────────────────────────
  const EmptyThread = (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '3rem 2rem', textAlign: 'center', color: 'var(--text3)', fontSize: '.83rem' }}>
      Sélectionne une conversation
    </div>
  )

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div className="section-title">Messages privés</div>

      {/* ── MOBILE: single-view navigation ── */}
      {isMobile ? (
        <div>
          {mobileView === 'list' || !activeId ? ConvList : ThreadView}
        </div>
      ) : (
        /* ── DESKTOP: 2-column layout ── */
        <div style={{
          display: 'grid',
          gridTemplateColumns: convs.length ? '240px 1fr' : '1fr',
          gap: '1rem',
          alignItems: 'start',
        }}>
          {convs.length > 0 && ConvList}
          {activeId ? ThreadView : EmptyThread}
        </div>
      )}
    </div>
  )
}

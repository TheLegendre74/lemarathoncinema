'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  sendMessage, deleteMessage, blockUser, unblockUser,
  markMessagesAsRead,
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

export default function MessagesSection({ myId, conversations: initialConvs, initialWithId, initialMessages, initialOtherProfile, blockedIds: initialBlockedIds }: Props) {
  const router = useRouter()
  const [convs, setConvs] = useState<Conversation[]>(initialConvs)
  const [activeId, setActiveId] = useState<string | null>(initialWithId ?? null)
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? [])
  const [otherProfile, setOtherProfile] = useState<Profile | null>(initialOtherProfile ?? null)
  const [draft, setDraft] = useState('')
  const [pending, startTransition] = useTransition()
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set(initialBlockedIds))
  const [confirmBlock, setConfirmBlock] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mark as read when opening a conversation
  useEffect(() => {
    if (!activeId) return
    markMessagesAsRead(activeId).then(() => {
      // Update unread count locally
      setConvs(prev => prev.map(c => c.otherId === activeId ? { ...c, unread: 0 } : c))
    })
  }, [activeId])

  function openConversation(otherId: string, profile: Profile | null) {
    setActiveId(otherId)
    setOtherProfile(profile)
    setConfirmBlock(false)
    // Navigate with ?with= to load messages server-side on next render
    router.push(`/profil?with=${otherId}`, { scroll: false })
  }

  function handleSend() {
    if (!activeId || !draft.trim()) return
    const content = draft.trim()
    setDraft('')
    startTransition(async () => {
      const res = await sendMessage(activeId, content)
      if (res?.error) {
        alert(res.error)
        return
      }
      // Optimistically add message
      const newMsg: Message = {
        id: Date.now().toString(),
        sender_id: myId,
        recipient_id: activeId,
        content,
        read_at: null,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, newMsg])
      // Update conversation list
      setConvs(prev => {
        const existing = prev.find(c => c.otherId === activeId)
        if (existing) {
          return [{ ...existing, lastMessage: newMsg }, ...prev.filter(c => c.otherId !== activeId)]
        }
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
      setActiveId(null)
      setMessages([])
      router.push('/profil', { scroll: false })
    })
  }

  function handleUnblock(targetId: string) {
    startTransition(async () => {
      await unblockUser(targetId)
      setBlockedIds(prev => { const s = new Set(prev); s.delete(targetId); return s })
    })
  }

  const isBlocked = activeId ? blockedIds.has(activeId) : false

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div className="section-title">Messages privés</div>

      <div style={{ display: 'grid', gridTemplateColumns: convs.length ? '220px 1fr' : '1fr', gap: '1rem', minHeight: 300 }}>

        {/* Liste des conversations */}
        {convs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            {convs.map(c => (
              <button
                key={c.otherId}
                onClick={() => openConversation(c.otherId, c.profile)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '.6rem',
                  background: activeId === c.otherId ? 'rgba(232,196,106,.08)' : 'var(--bg2)',
                  border: `1px solid ${activeId === c.otherId ? 'rgba(232,196,106,.35)' : 'var(--border)'}`,
                  borderRadius: 'var(--r)', padding: '.6rem .8rem', cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <Avatar profile={c.profile} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.82rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.profile?.pseudo ?? '?'}
                  </div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.lastMessage.content}
                  </div>
                </div>
                {c.unread > 0 && (
                  <span style={{ background: 'var(--red, #e55)', color: '#fff', borderRadius: 99, fontSize: '.55rem', fontWeight: 700, padding: '1px 6px', flexShrink: 0 }}>
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Zone de conversation */}
        <div>
          {!activeId ? (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '2rem', textAlign: 'center', color: 'var(--text3)', fontSize: '.83rem' }}>
              {convs.length === 0
                ? 'Aucun message. Va sur la page Marathoniens pour envoyer un message à quelqu\'un !'
                : 'Sélectionne une conversation'
              }
            </div>
          ) : (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', display: 'flex', flexDirection: 'column', height: 420 }}>
              {/* Header conversation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.8rem 1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <Avatar profile={otherProfile} size={32} />
                <span style={{ fontWeight: 500, fontSize: '.9rem', flex: 1 }}>{otherProfile?.pseudo ?? '?'}</span>
                {!confirmBlock ? (
                  <button
                    onClick={() => setConfirmBlock(true)}
                    style={{ fontSize: '.65rem', color: 'var(--text3)', background: 'none', border: '1px solid var(--border)', borderRadius: 99, padding: '2px 8px', cursor: 'pointer' }}
                  >
                    {isBlocked ? '✓ Bloqué' : 'Bloquer'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '.65rem', color: 'var(--text3)' }}>Bloquer {otherProfile?.pseudo} ?</span>
                    <button onClick={handleBlock} className="btn btn-outline" style={{ fontSize: '.65rem', padding: '2px 8px', color: 'var(--red, #e55)', borderColor: 'var(--red, #e55)' }}>Oui</button>
                    <button onClick={() => setConfirmBlock(false)} className="btn btn-outline" style={{ fontSize: '.65rem', padding: '2px 8px' }}>Non</button>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '.8rem 1rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '.78rem', marginTop: '2rem' }}>
                    Début de la conversation
                  </div>
                )}
                {messages.map(m => {
                  const isMe = m.sender_id === myId
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '.5rem', alignItems: 'flex-end' }}>
                      <div style={{
                        maxWidth: '70%', background: isMe ? 'rgba(232,196,106,.12)' : 'var(--bg3)',
                        border: `1px solid ${isMe ? 'rgba(232,196,106,.25)' : 'var(--border)'}`,
                        borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        padding: '.5rem .75rem', fontSize: '.83rem', lineHeight: 1.5,
                      }}>
                        {m.content}
                        <div style={{ fontSize: '.6rem', color: 'var(--text3)', marginTop: '.2rem', textAlign: isMe ? 'right' : 'left' }}>
                          {new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          {isMe && (
                            <button
                              onClick={() => handleDelete(m.id)}
                              style={{ marginLeft: '.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '.6rem', padding: 0 }}
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              {isBlocked ? (
                <div style={{ padding: '.75rem 1rem', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '.78rem', color: 'var(--text3)' }}>
                  Tu as bloqué cet utilisateur.
                  <button onClick={() => handleUnblock(activeId)} style={{ marginLeft: '.5rem', background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '.78rem' }}>Débloquer</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '.5rem', padding: '.6rem .8rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                  <input
                    value={draft}
                    onChange={e => setDraft(e.target.value.slice(0, 1000))}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder="Écris un message..."
                    style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.5rem .8rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.85rem', outline: 'none' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={pending || !draft.trim()}
                    className="btn btn-gold"
                    style={{ fontSize: '.8rem', padding: '.5rem .9rem', flexShrink: 0 }}
                  >
                    Envoyer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

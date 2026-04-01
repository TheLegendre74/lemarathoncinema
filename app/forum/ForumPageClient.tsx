'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addForumPost } from '@/lib/actions'
import Link from 'next/link'
import ForumTopicModal from './ForumTopicModal'
import { useToast } from '@/components/ToastProvider'
import type { Profile } from '@/lib/supabase/types'

interface Props {
  profile: Profile | null
  socialTopic: any | null
  initialMessages: any[]
  otherTopics: any[]
  lastPostMap: Record<string, any>
  countMap: Record<string, number>
  totalTopics: number
}

export default function ForumPageClient({
  profile, socialTopic, initialMessages, otherTopics, lastPostMap, countMap, totalTopics
}: Props) {
  const [messages, setMessages] = useState<any[]>(initialMessages)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  // Realtime subscription for Le Salon
  useEffect(() => {
    if (!socialTopic) return
    const supabase = createClient()
    const channel = supabase
      .channel('le-salon-chat')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'forum_posts',
        filter: `topic_id=eq.${socialTopic.id}`,
      }, async (payload) => {
        const { data: prof } = await supabase
          .from('profiles')
          .select('pseudo, avatar_url')
          .eq('id', payload.new.user_id)
          .single()
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev
          // Replace matching optimistic
          const optIdx = prev.findIndex(m =>
            String(m.id).startsWith('opt-') &&
            m.user_id === payload.new.user_id &&
            m.content === payload.new.content
          )
          if (optIdx >= 0) {
            const updated = [...prev]
            updated[optIdx] = { ...payload.new, profiles: prof }
            return updated
          }
          return [...prev, { ...payload.new, profiles: prof }]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [socialTopic?.id])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !profile || loading || !socialTopic) return
    const text = content.trim()
    setLoading(true)

    // Optimistic update
    const tempId = `opt-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      topic_id: socialTopic.id,
      user_id: profile.id,
      content: text,
      created_at: new Date().toISOString(),
      profiles: { pseudo: profile.pseudo, avatar_url: (profile as any).avatar_url ?? null },
    }])
    setContent('')

    const res = await addForumPost(socialTopic.id, text)
    setLoading(false)
    if (res.error) {
      addToast(res.error, 'error')
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } else if (res.data) {
      setMessages(prev => prev.map(m =>
        m.id === tempId
          ? { ...res.data, profiles: { pseudo: profile.pseudo, avatar_url: (profile as any).avatar_url ?? null } }
          : m
      ))
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSend(e as any)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Forum</div>
          <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>
            {totalTopics} topic{totalTopics !== 1 ? 's' : ''} · chat en direct
          </div>
        </div>
        {profile && <ForumTopicModal />}
      </div>

      {/* ─── LE SALON (embedded real-time chat) ─── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(100,60,200,.08), rgba(60,120,200,.06))',
        border: '1px solid rgba(130,80,220,.35)',
        borderRadius: 'var(--rl)',
        marginBottom: '2rem',
        overflow: 'hidden',
      }}>
        {/* Chat header */}
        <div style={{
          padding: '1rem 1.4rem',
          borderBottom: '1px solid rgba(130,80,220,.2)',
          display: 'flex', alignItems: 'center', gap: '.85rem',
        }}>
          <div style={{ fontSize: '1.6rem', lineHeight: 1 }}>💬</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Le Salon</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text3)', marginTop: '.1rem' }}>
              Chat en temps réel · {messages.length} message{messages.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{
            marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%',
            background: '#22cc66', boxShadow: '0 0 6px #22cc66',
          }} title="En direct" />
        </div>

        {/* Messages */}
        <div
          ref={chatRef}
          style={{
            height: 380,
            overflowY: 'auto',
            padding: '1rem 1.2rem',
            display: 'flex', flexDirection: 'column', gap: '.6rem',
          }}
        >
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '.83rem', margin: 'auto' }}>
              Aucun message — sois le premier à écrire !
            </div>
          )}
          {messages.map((m: any) => {
            const isMe = profile?.id === m.user_id
            const avatar = m.profiles?.avatar_url
            const initials = (m.profiles?.pseudo ?? '?').slice(0, 2).toUpperCase()
            return (
              <div key={m.id} style={{
                display: 'flex',
                flexDirection: isMe ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: '.55rem',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: isMe ? 'linear-gradient(135deg, var(--gold2), var(--purple))' : 'var(--bg3)',
                  color: isMe ? '#0a0a0f' : 'var(--text2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '.65rem', fontWeight: 600,
                  backgroundImage: avatar ? `url(${avatar})` : undefined,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }}>
                  {!avatar && initials}
                </div>
                {/* Bubble */}
                <div style={{ maxWidth: '70%' }}>
                  {!isMe && (
                    <div style={{ fontSize: '.65rem', color: 'var(--text3)', marginBottom: '.2rem', paddingLeft: '.1rem' }}>
                      {m.profiles?.pseudo ?? 'Inconnu'}
                    </div>
                  )}
                  <div style={{
                    background: isMe ? 'rgba(130,80,220,.25)' : 'var(--bg2)',
                    border: `1px solid ${isMe ? 'rgba(130,80,220,.4)' : 'var(--border)'}`,
                    borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    padding: '.45rem .8rem',
                    fontSize: '.83rem', color: 'var(--text)', lineHeight: 1.5,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {m.content}
                  </div>
                  <div style={{
                    fontSize: '.6rem', color: 'var(--text3)', marginTop: '.18rem',
                    textAlign: isMe ? 'right' : 'left', paddingLeft: '.1rem', paddingRight: '.1rem',
                  }}>
                    {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '1rem 1.2rem', borderTop: '1px solid rgba(130,80,220,.15)' }}>
          {profile ? (
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-end' }}>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écris quelque chose… (Ctrl+Entrée pour envoyer)"
                maxLength={2000}
                rows={2}
                style={{
                  flex: 1, background: 'var(--bg2)', border: '1px solid var(--border2)',
                  borderRadius: 'var(--r)', padding: '.55rem .85rem', color: 'var(--text)',
                  fontFamily: 'var(--font-body)', fontSize: '.83rem', resize: 'none', outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(130,80,220,.6)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border2)' }}
              />
              <button
                type="submit"
                className="btn btn-gold"
                disabled={loading || !content.trim()}
                style={{ flexShrink: 0, alignSelf: 'flex-end' }}
              >
                {loading ? '⏳' : 'Envoyer'}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', fontSize: '.83rem', color: 'var(--text3)', padding: '.5rem' }}>
              <Link href="/auth" style={{ color: 'var(--gold)' }}>Connecte-toi</Link> pour participer au chat.
            </div>
          )}
        </div>
      </div>

      {/* ─── TOPICS ─── */}
      <div className="section-title" style={{ marginBottom: '1rem' }}>Topics</div>
      {otherTopics.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>📝</div>
          {profile ? 'Aucun topic pour l\'instant. Crée le premier !' : 'Aucun topic pour l\'instant.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {otherTopics.map((t: any) => (
            <Link key={t.id} href={`/forum/${t.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: 'var(--bg2)',
                border: `1px solid ${t.pinned ? 'rgba(232,196,106,.3)' : 'var(--border)'}`,
                borderRadius: 'var(--r)', padding: '.9rem 1.1rem',
                transition: 'border-color .2s',
              }}>
                <div style={{ fontSize: '1.3rem' }}>{t.pinned ? '📌' : '💬'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.88rem', fontWeight: 500, marginBottom: '.15rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    {t.title}
                    {t.pinned && (
                      <span style={{ fontSize: '.6rem', color: 'var(--gold)', border: '1px solid rgba(232,196,106,.3)', borderRadius: 99, padding: '1px 6px' }}>
                        ÉPINGLÉ
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <div style={{ fontSize: '.73rem', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description}
                    </div>
                  )}
                  {lastPostMap[t.id] && (
                    <div style={{ fontSize: '.68rem', color: 'var(--text3)', marginTop: '.2rem' }}>
                      Dernier message de <strong>{lastPostMap[t.id].profiles?.pseudo}</strong> · {new Date(lastPostMap[t.id].created_at).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text2)' }}>
                    {countMap[t.id] ?? 0}
                  </div>
                  <div style={{ fontSize: '.63rem', color: 'var(--text3)' }}>messages</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!profile && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '.83rem', color: 'var(--text3)' }}>
          <Link href="/auth" style={{ color: 'var(--gold)' }}>Connecte-toi</Link> pour créer des topics et participer aux discussions.
        </div>
      )}
    </div>
  )
}

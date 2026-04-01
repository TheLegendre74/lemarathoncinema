'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { addForumPost, deleteForumPost } from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'
import type { Profile } from '@/lib/supabase/types'

interface Props {
  topic: any
  posts: any[]
  profile: Profile | null
}

export default function ForumTopicClient({ topic, posts: initialPosts, profile }: Props) {
  const [posts, setPosts] = useState(initialPosts)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [posts])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !profile) return
    const text = content.trim()
    setLoading(true)

    // Optimistic update
    const tempId = `opt-${Date.now()}`
    setPosts(prev => [...prev, {
      id: tempId, topic_id: topic.id, user_id: profile.id,
      content: text, created_at: new Date().toISOString(),
      profiles: { pseudo: profile.pseudo, avatar_url: (profile as any).avatar_url ?? null },
    }])
    setContent('')

    const res = await addForumPost(topic.id, text)
    setLoading(false)
    if (res.error) {
      addToast(res.error, 'error')
      setPosts(prev => prev.filter(p => p.id !== tempId))
    } else if (res.data) {
      setPosts(prev => prev.map(p => p.id === tempId
        ? { ...res.data, profiles: { pseudo: profile.pseudo, avatar_url: (profile as any).avatar_url ?? null } }
        : p
      ))
    }
  }

  async function handleDelete(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    const res = await deleteForumPost(postId)
    if (res.error) {
      addToast(res.error, 'error')
      // Could restore but keeping it simple
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/forum" style={{ fontSize: '.78rem', color: 'var(--text3)', textDecoration: 'none' }}>← Forum</Link>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, marginTop: '.5rem' }}>{topic.title}</div>
        {topic.description && <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>{topic.description}</div>}
        <div style={{ fontSize: '.73rem', color: 'var(--text3)', marginTop: '.3rem' }}>{posts.length} message{posts.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem', marginBottom: '1.5rem' }}>
        {posts.length === 0 && (
          <div className="empty">
            <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>💬</div>
            Aucun message pour l'instant. {profile ? 'Sois le premier !' : ''}
          </div>
        )}
        {posts.map((p: any) => {
          const isMe = profile?.id === p.user_id
          const isAdmin = profile?.is_admin
          return (
            <div key={p.id} style={{
              background: isMe ? 'rgba(232,196,106,.04)' : 'var(--bg2)',
              border: `1px solid ${isMe ? 'rgba(232,196,106,.25)' : 'var(--border)'}`,
              borderRadius: 'var(--r)', padding: '1rem 1.2rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.6rem' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: isMe ? 'linear-gradient(135deg, var(--gold2), var(--purple))' : 'var(--bg3)',
                  color: isMe ? '#0a0a0f' : 'var(--text2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '.72rem', fontWeight: 600,
                  backgroundImage: p.profiles?.avatar_url ? `url(${p.profiles.avatar_url})` : undefined,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }}>
                  {!p.profiles?.avatar_url && (p.profiles?.pseudo ?? '?').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '.83rem', fontWeight: 500 }}>{p.profiles?.pseudo ?? 'Inconnu'}</span>
                  {isMe && <span style={{ fontSize: '.63rem', color: 'var(--gold)', marginLeft: '.4rem' }}>(toi)</span>}
                </div>
                <span style={{ fontSize: '.68rem', color: 'var(--text3)' }}>
                  {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                {(isMe || isAdmin) && (
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '.75rem', padding: '2px 6px' }}
                    title="Supprimer"
                  >✕</button>
                )}
              </div>
              <div style={{ fontSize: '.85rem', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {p.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      {profile ? (
        <form onSubmit={handlePost} style={{ display: 'flex', gap: '.7rem', alignItems: 'flex-end' }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Écrire un message…"
            maxLength={2000}
            rows={3}
            style={{
              flex: 1, background: 'var(--bg2)', border: '1px solid var(--border2)',
              borderRadius: 'var(--r)', padding: '.65rem .9rem', color: 'var(--text)',
              fontFamily: 'var(--font-body)', fontSize: '.85rem', resize: 'vertical',
            }}
          />
          <button type="submit" className="btn btn-gold" disabled={loading || !content.trim()} style={{ flexShrink: 0 }}>
            {loading ? '⏳' : 'Envoyer'}
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: '.83rem', color: 'var(--text2)' }}>
          <Link href="/auth" style={{ color: 'var(--gold)' }}>Connecte-toi</Link> pour participer à la discussion.
        </div>
      )}
    </div>
  )
}

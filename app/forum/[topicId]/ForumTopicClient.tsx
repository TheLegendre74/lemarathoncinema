'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { addForumPost, deleteForumPost, deleteForumTopic, updateForumTopic } from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'
import { getActiveBadge } from '@/lib/config'
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

  // Edit topic state
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(topic.title)
  const [editDesc, setEditDesc] = useState(topic.description ?? '')
  const [editLoading, setEditLoading] = useState(false)

  const { addToast } = useToast()
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const isCreator = profile?.id === topic.created_by
  const isAdmin = profile?.is_admin

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [posts])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !profile) return
    const text = content.trim()
    setLoading(true)

    const tempId = `opt-${Date.now()}`
    setPosts(prev => [...prev, {
      id: tempId, topic_id: topic.id, user_id: profile.id,
      content: text, created_at: new Date().toISOString(),
      profiles: { pseudo: profile.pseudo, avatar_url: (profile as any).avatar_url ?? null, exp: profile.exp, active_badge: (profile as any).active_badge ?? null },
    }])
    setContent('')

    const res = await addForumPost(topic.id, text)
    setLoading(false)
    if (res.error) {
      addToast(res.error, 'error')
      setPosts(prev => prev.filter(p => p.id !== tempId))
    } else if (res.data) {
      setPosts(prev => prev.map(p => p.id === tempId
        ? { ...res.data, profiles: { pseudo: profile.pseudo, avatar_url: (profile as any).avatar_url ?? null, exp: profile.exp, active_badge: (profile as any).active_badge ?? null } }
        : p
      ))
    }
  }

  async function handleDeletePost(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    const res = await deleteForumPost(postId)
    if (res.error) addToast(res.error, 'error')
  }

  async function handleDeleteTopic() {
    if (!confirm('Supprimer ce topic ? Tous les messages seront perdus.')) return
    const res = await deleteForumTopic(topic.id)
    if (res.error) { addToast(res.error, 'error'); return }
    router.push('/forum')
  }

  async function handleEditSave() {
    if (!editTitle.trim()) return
    setEditLoading(true)
    const res = await updateForumTopic(topic.id, editTitle, editDesc)
    setEditLoading(false)
    if (res.error) { addToast(res.error, 'error'); return }
    setEditing(false)
    addToast('Topic mis à jour', 'success')
    router.refresh()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/forum" style={{ fontSize: '.78rem', color: 'var(--text3)', textDecoration: 'none' }}>← Forum</Link>

        {editing ? (
          <div style={{ marginTop: '.5rem', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              maxLength={100}
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border2)',
                borderRadius: 'var(--r)', padding: '.55rem .9rem',
                color: 'var(--text)', fontFamily: 'var(--font-display)', fontSize: '1.5rem',
              }}
            />
            <textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              maxLength={300}
              placeholder="Description (optionnelle)…"
              rows={2}
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border2)',
                borderRadius: 'var(--r)', padding: '.55rem .9rem',
                color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.85rem', resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn btn-gold" onClick={handleEditSave} disabled={editLoading || !editTitle.trim()}>
                {editLoading ? '⏳' : 'Sauvegarder'}
              </button>
              <button className="btn btn-outline" onClick={() => { setEditing(false); setEditTitle(topic.title); setEditDesc(topic.description ?? '') }}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginTop: '.5rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>{topic.title}</div>
              {topic.description && <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>{topic.description}</div>}
              <div style={{ fontSize: '.73rem', color: 'var(--text3)', marginTop: '.3rem' }}>{posts.length} message{posts.length !== 1 ? 's' : ''}</div>
            </div>
            {(isCreator || isAdmin) && (
              <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0, marginTop: '.3rem' }}>
                <button
                  onClick={() => setEditing(true)}
                  className="btn btn-outline"
                  style={{ fontSize: '.75rem', padding: '.35rem .7rem' }}
                  title="Modifier le topic"
                >✏️ Modifier</button>
                <button
                  onClick={handleDeleteTopic}
                  className="btn btn-outline"
                  style={{ fontSize: '.75rem', padding: '.35rem .7rem', borderColor: 'rgba(232,90,90,.4)', color: 'var(--red)' }}
                  title="Supprimer le topic"
                >🗑️ Supprimer</button>
              </div>
            )}
          </div>
        )}
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
          const canDelete = isMe || isAdmin
          const badge = getActiveBadge(p.profiles?.exp ?? 0, p.profiles?.active_badge ?? null)
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
                  {badge && <span style={{ marginLeft: '.4rem', fontSize: '.75rem' }}>{badge.icon}</span>}
                  {isMe && <span style={{ fontSize: '.63rem', color: 'var(--gold)', marginLeft: '.4rem' }}>(toi)</span>}
                </div>
                <span style={{ fontSize: '.68rem', color: 'var(--text3)' }}>
                  {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                {canDelete && (
                  <button
                    onClick={() => handleDeletePost(p.id)}
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

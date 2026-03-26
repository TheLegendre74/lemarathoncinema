'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addPost } from '@/lib/actions'
import { useToast } from './ToastProvider'
import type { Post, Profile } from '@/lib/supabase/types'

interface ForumProps {
  topic: string
  profile: Profile
  initialPosts?: (Post & { profiles: Pick<Profile, 'pseudo'> })[]
}

export default function Forum({ topic, profile, initialPosts = [] }: ForumProps) {
  const [posts, setPosts] = useState(initialPosts)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { addToast } = useToast()

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`forum:${topic}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `topic=eq.${topic}` },
        async (payload) => {
          // Fetch the profile for the new post
          const { data: prof } = await supabase
            .from('profiles')
            .select('pseudo')
            .eq('id', payload.new.user_id)
            .single()
          const newPost = { ...payload.new, profiles: prof } as unknown as Post & { profiles: Pick<Profile, 'pseudo'> }
          setPosts(prev => [...prev, newPost])
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [topic])

  async function submit() {
    if (!text.trim() || loading) return
    setLoading(true)
    const result = await addPost(topic, text)
    if (result.error) addToast(result.error, '⚠️')
    else setText('')
    setLoading(false)
  }

  return (
    <div>
      {posts.length === 0 && (
        <div style={{ color: 'var(--text3)', fontSize: '.82rem', textAlign: 'center', padding: '1.5rem', background: 'var(--bg3)', borderRadius: 'var(--r)' }}>
          Aucun message — sois le premier à donner ton avis !
        </div>
      )}

      <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 4 }}>
        {posts.map(p => (
          <div key={p.id} className="forum-post">
            <div className="forum-post-head">
              <div className="forum-ava">{p.profiles?.pseudo?.slice(0, 2).toUpperCase()}</div>
              <span style={{ fontSize: '.8rem', fontWeight: 500 }}>{p.profiles?.pseudo}</span>
              <span style={{ fontSize: '.67rem', color: 'var(--text3)', marginLeft: 'auto' }}>
                {new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div style={{ fontSize: '.83rem', color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-end', marginTop: '1rem' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit() }}
          placeholder="Ton commentaire… (Ctrl+Entrée pour envoyer)"
          style={{
            flex: 1, background: 'var(--bg3)', border: '1px solid var(--border2)',
            borderRadius: 'var(--r)', padding: '.6rem .8rem', color: 'var(--text)',
            fontFamily: 'var(--font-body)', fontSize: '.83rem', resize: 'vertical', minHeight: 65,
            outline: 'none',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--gold)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border2)' }}
        />
        <button className="btn btn-gold" onClick={submit} disabled={loading} style={{ alignSelf: 'flex-end' }}>
          {loading ? '…' : 'Poster'}
        </button>
      </div>
    </div>
  )
}

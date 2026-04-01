'use client'

import { useState } from 'react'
import { createForumTopic } from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'
import { useRouter } from 'next/navigation'

export default function ForumTopicModal() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    const res = await createForumTopic(title.trim(), description.trim())
    setLoading(false)
    if (res.error) { addToast(res.error, 'error'); return }
    addToast('Topic créé !', 'success')
    setOpen(false)
    setTitle('')
    setDescription('')
    router.refresh()
  }

  return (
    <>
      <button className="btn btn-outline" onClick={() => setOpen(true)}>+ Nouveau topic</button>
      {open && (
        <div className="modal-wrap" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: '1.2rem' }}>Créer un topic</div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '.8rem' }}>
                  <label style={{ fontSize: '.78rem', color: 'var(--text2)', marginBottom: '.3rem', display: 'block' }}>Titre *</label>
                  <input
                    value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
                    placeholder="Titre du topic…"
                    style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.55rem .9rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.83rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ fontSize: '.78rem', color: 'var(--text2)', marginBottom: '.3rem', display: 'block' }}>Description (optionnel)</label>
                  <textarea
                    value={description} onChange={e => setDescription(e.target.value)} maxLength={300} rows={3}
                    placeholder="Décris le sujet du topic…"
                    style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.55rem .9rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.83rem', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '.7rem' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setOpen(false)}>Annuler</button>
                  <button type="submit" className="btn btn-gold" style={{ flex: 1 }} disabled={loading || !title.trim()}>
                    {loading ? '⏳' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

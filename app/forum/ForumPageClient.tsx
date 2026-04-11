'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import ForumTopicModal from './ForumTopicModal'
import type { Profile } from '@/lib/supabase/types'

interface Props {
  profile: Profile | null
  otherTopics: any[]
  lastPostMap: Record<string, any>
  countMap: Record<string, number>
  totalTopics: number
}

const CHATANGO_URL = 'https://lemarathoncinema.chatango.com'

function ChatangoEmbed() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const old = document.getElementById('cid0020000436924900725')
    if (old) old.remove()
    const script = document.createElement('script')
    script.id = 'cid0020000436924900725'
    script.setAttribute('data-cfasync', 'false')
    script.async = true
    script.src = '//st.chatango.com/js/gz/emb.js'
    script.style.cssText = 'width:200px;height:300px;'
    script.textContent = JSON.stringify({
      handle: 'lemarathoncinema',
      arch: 'js',
      styles: {
        a: 'CC0000', b: 100, c: 'FFFFFF', d: 'FFFFFF',
        k: 'CC0000', l: 'CC0000', m: 'CC0000', n: 'FFFFFF',
        p: '10', q: 'CC0000', r: 100,
        pos: 'br', cv: 1, cvbg: 'CC0000', cvw: 75, cvh: 30,
      },
    })
    containerRef.current.appendChild(script)
  }, [])

  return (
    /* Desktop uniquement — l'embed est masqué sur mobile via CSS */
    <div ref={containerRef} className="chatango-desktop" style={{ width: '100%', height: 500 }} />
  )
}

export default function ForumPageClient({
  profile, otherTopics, lastPostMap, countMap, totalTopics
}: Props) {
  return (
    <div>
      {/* ─── Bande raccourci Chatango — mobile uniquement, en haut de page ─── */}
      <div className="chatango-mobile" style={{
        display: 'none',
        alignItems: 'center', justifyContent: 'space-between',
        gap: '.75rem', padding: '.7rem 1rem',
        background: 'linear-gradient(90deg, rgba(232,196,106,.1), rgba(232,160,60,.07))',
        border: '1px solid rgba(232,196,106,.3)',
        borderRadius: 'var(--r)',
        marginBottom: '1.2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <span style={{ fontSize: '1.3rem' }}>💬</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '.9rem', color: 'var(--gold)', lineHeight: 1.2 }}>Le Salon</div>
            <div style={{ fontSize: '.65rem', color: 'var(--text3)' }}>Chat en direct</div>
          </div>
        </div>
        <a href={CHATANGO_URL} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: '.4rem',
          background: 'rgba(232,196,106,.18)', border: '1px solid rgba(232,196,106,.4)',
          borderRadius: 'var(--r)', padding: '.45rem 1rem',
          color: 'var(--gold)', textDecoration: 'none', fontSize: '.78rem', fontWeight: 500, flexShrink: 0,
        }}>
          Ouvrir ↗
        </a>
      </div>

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

      {/* ─── LE SALON (Chatango embed) ─── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(232,196,106,.07), rgba(232,160,60,.04))',
        border: '1px solid rgba(232,196,106,.35)',
        borderRadius: 'var(--rl)',
        marginBottom: '2rem',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1rem 1.4rem',
          borderBottom: '1px solid rgba(232,196,106,.2)',
          display: 'flex', alignItems: 'center', gap: '.85rem',
        }}>
          <div style={{ fontSize: '1.6rem', lineHeight: 1 }}>💬</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Le Salon</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text3)', marginTop: '.1rem' }}>Chat en temps réel</div>
          </div>
          <div style={{
            marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%',
            background: '#22cc66', boxShadow: '0 0 6px #22cc66',
          }} title="En direct" />
        </div>
        <ChatangoEmbed />
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

'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  toggleWatchlistReaction,
  favoriteWatchlist,
  unfavoriteWatchlist,
} from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'

interface Film {
  id: number
  titre: string
  annee: number
  realisateur: string
  poster: string | null
  genre: string
}

interface WatchlistItem {
  film_id: number
  films: Film
}

interface PublicWatchlist {
  id: string
  name: string
  is_public: boolean
  is_anonymous: boolean
  updated_at: string
  user_id: string
  watchlist_items: WatchlistItem[]
  profiles: { pseudo: string; avatar_url: string | null } | null
  likes: number
  dislikes: number
}

interface Props {
  watchlists: PublicWatchlist[]
  userId: string | null
  initialUserReactions: Record<string, string>
  initialFavorites: string[]
}

export default function PublicWatchlistsClient({
  watchlists: initial,
  userId,
  initialUserReactions,
  initialFavorites,
}: Props) {
  const [selected, setSelected] = useState<PublicWatchlist | null>(null)
  const [reactions, setReactions] = useState<Record<string, { likes: number; dislikes: number }>>(
    () => Object.fromEntries(initial.map(w => [w.id, { likes: w.likes, dislikes: w.dislikes }]))
  )
  const [userReactions, setUserReactions] = useState<Record<string, string>>(initialUserReactions)
  const [favorites, setFavorites] = useState<string[]>(initialFavorites)
  const [isPending, startTransition] = useTransition()
  const { addToast } = useToast()
  const router = useRouter()

  // Realtime subscription sur watchlist_reactions
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('watchlist_reactions_public')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'watchlist_reactions',
      }, () => {
        // Refetch counts for all visible watchlists
        refetchAllCounts()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const refetchAllCounts = useCallback(async () => {
    const supabase = createClient()
    const ids = initial.map(w => w.id)
    if (ids.length === 0) return
    const { data } = await (supabase as any)
      .from('watchlist_reactions')
      .select('watchlist_id, type')
      .in('watchlist_id', ids)
    const map: Record<string, { likes: number; dislikes: number }> = {}
    ;(data ?? []).forEach((r: any) => {
      if (!map[r.watchlist_id]) map[r.watchlist_id] = { likes: 0, dislikes: 0 }
      if (r.type === 'like') map[r.watchlist_id].likes++
      else map[r.watchlist_id].dislikes++
    })
    setReactions(prev => {
      const next = { ...prev }
      ids.forEach(id => { next[id] = map[id] ?? { likes: 0, dislikes: 0 } })
      return next
    })
    // Met aussi à jour le selected si ouvert
    if (selected) {
      setReactions(prev => ({
        ...prev,
        [selected.id]: map[selected.id] ?? { likes: 0, dislikes: 0 },
      }))
    }
  }, [initial, selected])

  async function handleReaction(watchlistId: string, type: 'like' | 'dislike') {
    if (!userId) { addToast('Connecte-toi pour réagir', 'error'); return }
    const prev = userReactions[watchlistId]
    // Optimistic update
    setUserReactions(ur => {
      const next = { ...ur }
      if (prev === type) delete next[watchlistId]
      else next[watchlistId] = type
      return next
    })
    setReactions(r => {
      const cur = r[watchlistId] ?? { likes: 0, dislikes: 0 }
      const next = { ...cur }
      if (prev === 'like') next.likes = Math.max(0, next.likes - 1)
      if (prev === 'dislike') next.dislikes = Math.max(0, next.dislikes - 1)
      if (prev !== type) {
        if (type === 'like') next.likes++
        else next.dislikes++
      }
      return { ...r, [watchlistId]: next }
    })
    const res = await toggleWatchlistReaction(watchlistId, type)
    if (res.error) {
      addToast(res.error, 'error')
      // Revert
      setUserReactions(ur => { const n = { ...ur }; if (prev) n[watchlistId] = prev; else delete n[watchlistId]; return n })
      refetchAllCounts()
    }
  }

  async function handleFavorite(wl: PublicWatchlist) {
    if (!userId) { addToast('Connecte-toi pour ajouter un coup de coeur', 'error'); return }
    const isFav = favorites.includes(wl.id)
    if (isFav) {
      setFavorites(f => f.filter(id => id !== wl.id))
      const res = await unfavoriteWatchlist(wl.id)
      if (res.error) { setFavorites(f => [...f, wl.id]); addToast(res.error, 'error') }
      else addToast('Coup de coeur retiré', 'success')
    } else {
      setFavorites(f => [...f, wl.id])
      const res = await favoriteWatchlist(wl.id)
      if (res.error) { setFavorites(f => f.filter(id => id !== wl.id)); addToast(res.error, 'error') }
      else addToast(res.alreadyExists ? 'Déjà dans tes watchlists !' : '💛 Watchlist copiée dans Mes Watchlists !', 'success')
    }
    startTransition(() => router.refresh())
  }

  return (
    <>
      {/* Grille des cartes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '1.2rem' }}>
        {initial.map(wl => {
          const items: WatchlistItem[] = wl.watchlist_items ?? []
          const author = wl.is_anonymous ? null : wl.profiles
          const previewFilms = items.slice(0, 4)
          const r = reactions[wl.id] ?? { likes: wl.likes, dislikes: wl.dislikes }
          const userR = userReactions[wl.id]
          const isFav = favorites.includes(wl.id)
          const isOwn = userId === wl.user_id

          return (
            <div
              key={wl.id}
              className="wl-public-card"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelected(wl)}
            >
              {/* Poster grid preview */}
              <div style={{ height: 110, background: 'var(--bg3)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', overflow: 'hidden', position: 'relative' }}>
                {previewFilms.length > 0
                  ? previewFilms.map(item => (
                      <div key={item.film_id} style={{ position: 'relative', overflow: 'hidden' }}>
                        {item.films?.poster
                          ? <Image src={item.films.poster} alt={item.films.titre} fill style={{ objectFit: 'cover' }} sizes="80px" />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🎬</div>
                        }
                      </div>
                    ))
                  : <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '2rem' }}>📋</div>
                }
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(15,15,26,.9))', pointerEvents: 'none' }} />
              </div>

              <div style={{ padding: '1rem' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', marginBottom: '.3rem', lineHeight: 1.2 }}>{wl.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
                  <div style={{ fontSize: '.72rem', color: 'var(--text3)' }}>
                    {items.length} film{items.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                    {author ? (
                      <>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border2)', overflow: 'hidden', flexShrink: 0 }}>
                          {author.avatar_url
                            ? <Image src={author.avatar_url} alt={author.pseudo} width={18} height={18} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.55rem' }}>{author.pseudo?.[0]?.toUpperCase()}</div>
                          }
                        </div>
                        {author.pseudo}
                      </>
                    ) : <>👤 Anonyme</>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleReaction(wl.id, 'like')}
                    style={{ display: 'flex', alignItems: 'center', gap: '.3rem', background: userR === 'like' ? 'rgba(79,217,138,.15)' : 'var(--bg3)', border: `1px solid ${userR === 'like' ? 'rgba(79,217,138,.4)' : 'var(--border2)'}`, borderRadius: 6, padding: '.3rem .6rem', fontSize: '.75rem', color: userR === 'like' ? 'var(--green)' : 'var(--text2)', cursor: 'pointer', transition: 'all .15s' }}
                  >
                    👍 {r.likes}
                  </button>
                  <button
                    onClick={() => handleReaction(wl.id, 'dislike')}
                    style={{ display: 'flex', alignItems: 'center', gap: '.3rem', background: userR === 'dislike' ? 'rgba(232,90,90,.12)' : 'var(--bg3)', border: `1px solid ${userR === 'dislike' ? 'rgba(232,90,90,.35)' : 'var(--border2)'}`, borderRadius: 6, padding: '.3rem .6rem', fontSize: '.75rem', color: userR === 'dislike' ? 'var(--red)' : 'var(--text2)', cursor: 'pointer', transition: 'all .15s' }}
                  >
                    👎 {r.dislikes}
                  </button>
                  <button
                    onClick={() => handleFavorite(wl)}
                    title={isFav ? 'Retirer le coup de coeur' : 'Coup de coeur — copier dans mes watchlists'}
                    style={{ marginLeft: 'auto', background: isFav ? 'rgba(232,90,90,.12)' : 'var(--bg3)', border: `1px solid ${isFav ? 'rgba(232,90,90,.35)' : 'var(--border2)'}`, borderRadius: 6, padding: '.3rem .55rem', fontSize: '.9rem', cursor: 'pointer', transition: 'all .15s', lineHeight: 1 }}
                  >
                    {isFav ? '❤️' : '🤍'}
                  </button>
                  {isOwn && (
                    <Link
                      href="/watchlist"
                      onClick={e => e.stopPropagation()}
                      title="Gérer cette watchlist"
                      style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 6, padding: '.3rem .55rem', fontSize: '.75rem', color: 'var(--text3)', textDecoration: 'none', lineHeight: 1.4 }}
                    >
                      ✏️
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal détail watchlist */}
      {selected && (
        <WatchlistDetailModal
          wl={selected}
          reactions={reactions[selected.id] ?? { likes: selected.likes, dislikes: selected.dislikes }}
          userReaction={userReactions[selected.id] ?? null}
          isFavorite={favorites.includes(selected.id)}
          isOwn={userId === selected.user_id}
          onClose={() => setSelected(null)}
          onReaction={(type) => handleReaction(selected.id, type)}
          onFavorite={() => handleFavorite(selected)}
        />
      )}
    </>
  )
}

function WatchlistDetailModal({
  wl,
  reactions,
  userReaction,
  isFavorite,
  isOwn,
  onClose,
  onReaction,
  onFavorite,
}: {
  wl: PublicWatchlist
  reactions: { likes: number; dislikes: number }
  userReaction: string | null
  isFavorite: boolean
  isOwn: boolean
  onClose: () => void
  onReaction: (type: 'like' | 'dislike') => void
  onFavorite: () => void
}) {
  const items: WatchlistItem[] = wl.watchlist_items ?? []
  const author = wl.is_anonymous ? null : wl.profiles

  // Fermer sur Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '0' }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', background: 'var(--bg1)', borderRadius: 'var(--rl) var(--rl) 0 0', display: 'flex', flexDirection: 'column', animation: 'wl-modal-in .25s ease', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: 'var(--border2)', borderRadius: 99, margin: '12px auto 0' }} />

        {/* Header */}
        <div style={{ padding: '1rem 1.25rem .75rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.75rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', lineHeight: 1.2, marginBottom: '.25rem' }}>{wl.name}</div>
              <div style={{ fontSize: '.75rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                <span>{items.length} film{items.length !== 1 ? 's' : ''}</span>
                {author ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border2)', overflow: 'hidden', flexShrink: 0 }}>
                      {author.avatar_url
                        ? <Image src={author.avatar_url} alt={author.pseudo} width={16} height={16} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.5rem' }}>{author.pseudo?.[0]?.toUpperCase()}</div>
                      }
                    </div>
                    {author.pseudo}
                  </span>
                ) : <span>👤 Anonyme</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '1.3rem', cursor: 'pointer', padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>

          {/* Réactions */}
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginTop: '.75rem' }}>
            <button
              onClick={() => onReaction('like')}
              style={{ display: 'flex', alignItems: 'center', gap: '.35rem', background: userReaction === 'like' ? 'rgba(79,217,138,.15)' : 'var(--bg2)', border: `1px solid ${userReaction === 'like' ? 'rgba(79,217,138,.4)' : 'var(--border2)'}`, borderRadius: 8, padding: '.4rem .8rem', fontSize: '.82rem', color: userReaction === 'like' ? 'var(--green)' : 'var(--text2)', cursor: 'pointer', transition: 'all .15s', fontWeight: userReaction === 'like' ? 600 : 400 }}
            >
              👍 <span>{reactions.likes}</span>
            </button>
            <button
              onClick={() => onReaction('dislike')}
              style={{ display: 'flex', alignItems: 'center', gap: '.35rem', background: userReaction === 'dislike' ? 'rgba(232,90,90,.12)' : 'var(--bg2)', border: `1px solid ${userReaction === 'dislike' ? 'rgba(232,90,90,.35)' : 'var(--border2)'}`, borderRadius: 8, padding: '.4rem .8rem', fontSize: '.82rem', color: userReaction === 'dislike' ? 'var(--red)' : 'var(--text2)', cursor: 'pointer', transition: 'all .15s', fontWeight: userReaction === 'dislike' ? 600 : 400 }}
            >
              👎 <span>{reactions.dislikes}</span>
            </button>
            <button
              onClick={onFavorite}
              title={isFavorite ? 'Retirer le coup de coeur' : 'Ajouter aux mes watchlists'}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '.35rem', background: isFavorite ? 'rgba(232,90,90,.12)' : 'var(--bg2)', border: `1px solid ${isFavorite ? 'rgba(232,90,90,.35)' : 'var(--border2)'}`, borderRadius: 8, padding: '.4rem .8rem', fontSize: '.82rem', color: isFavorite ? '#f87171' : 'var(--text2)', cursor: 'pointer', transition: 'all .15s', fontWeight: isFavorite ? 600 : 400 }}
            >
              {isFavorite ? '❤️' : '🤍'} <span style={{ fontSize: '.78rem' }}>{isFavorite ? 'Coup de coeur' : 'Coup de coeur'}</span>
            </button>
            {isOwn && (
              <Link
                href="/watchlist"
                onClick={onClose}
                style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '.4rem .75rem', fontSize: '.78rem', color: 'var(--gold)', textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                ✏️ Gérer
              </Link>
            )}
          </div>
        </div>

        {/* Liste des films */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.25rem' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '2rem', fontSize: '.85rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🎬</div>
              Aucun film dans cette watchlist.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {items.map(item => {
                const film = item.films
                if (!film) return null
                return (
                  <div key={item.film_id} style={{ display: 'flex', alignItems: 'center', gap: '.85rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.6rem .85rem' }}>
                    <div style={{ width: 38, height: 56, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)', position: 'relative' }}>
                      {film.poster
                        ? <Image src={film.poster} alt={film.titre} fill style={{ objectFit: 'cover' }} sizes="38px" />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem' }}>🎬</div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '.88rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{film.titre}</div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text3)', marginTop: '.1rem' }}>{film.annee} · {film.realisateur}</div>
                      <div style={{ fontSize: '.65rem', color: 'var(--text3)', marginTop: '.1rem' }}>{film.genre}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

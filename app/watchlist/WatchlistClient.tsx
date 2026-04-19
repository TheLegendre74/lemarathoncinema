'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import {
  createWatchlist, deleteWatchlist, renameWatchlist,
  toggleWatchlistVisibility, removeFilmFromWatchlist,
} from '@/lib/actions'
import Link from 'next/link'

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

interface Watchlist {
  id: string
  name: string
  is_public: boolean
  is_anonymous: boolean
  created_at: string
  updated_at: string
  watchlist_items: WatchlistItem[]
}

interface Props {
  watchlists: Watchlist[]
}

export default function WatchlistClient({ watchlists: initial }: Props) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>(initial)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<string | null>(initial[0]?.id ?? null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { addToast } = useToast()
  const router = useRouter()

  const current = watchlists.find(w => w.id === selected) ?? null

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await createWatchlist(newName)
    setCreating(false)
    if (res.error) { addToast(res.error, 'error'); return }
    addToast(`Watchlist "${newName.trim()}" créée !`, 'success')
    setNewName('')
    setSelected(res.data.id)
    startTransition(() => router.refresh())
  }

  async function handleDelete(id: string) {
    const res = await deleteWatchlist(id)
    if (res.error) { addToast(res.error, 'error'); return }
    if (selected === id) setSelected(watchlists.find(w => w.id !== id)?.id ?? null)
    setConfirmDelete(null)
    addToast('Watchlist supprimée', 'success')
    startTransition(() => router.refresh())
  }

  async function handleRename(id: string) {
    const res = await renameWatchlist(id, renameVal)
    if (res.error) { addToast(res.error, 'error'); return }
    setRenameId(null)
    addToast('Watchlist renommée', 'success')
    startTransition(() => router.refresh())
  }

  async function handleTogglePublic(wl: Watchlist, newPublic: boolean, newAnon: boolean) {
    const res = await toggleWatchlistVisibility(wl.id, newPublic, newAnon)
    if (res.error) { addToast(res.error, 'error'); return }
    addToast(newPublic ? 'Watchlist rendue publique !' : 'Watchlist rendue privée', 'success')
    startTransition(() => router.refresh())
  }

  async function handleRemoveFilm(watchlistId: string, filmId: number, titre: string) {
    const res = await removeFilmFromWatchlist(watchlistId, filmId)
    if (res.error) { addToast(res.error, 'error'); return }
    addToast(`"${titre}" retiré`, 'success')
    startTransition(() => router.refresh())
  }

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/watchlist/public`
    : '/watchlist/public'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Mes Watchlists</div>
          <div style={{ color: 'var(--text3)', fontSize: '.82rem', marginTop: '.4rem' }}>Tes listes de films à voir pendant le marathon</div>
        </div>
        <Link href="/watchlist/public" style={{ fontSize: '.8rem', color: 'var(--gold)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '.4rem', background: 'rgba(232,196,106,.08)', border: '1px solid rgba(232,196,106,.25)', borderRadius: 'var(--r)', padding: '.45rem .9rem' }}>
          🌍 Watchlists publiques
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Sidebar — liste des watchlists */}
        <div>
          {/* Créer une nouvelle watchlist */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '.72rem', color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '.6rem' }}>Nouvelle watchlist</div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value.slice(0, 60))}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Nom de la liste…"
                style={{ flex: 1, minWidth: 0, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.45rem .65rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.82rem', outline: 'none' }}
              />
              <button
                className="btn btn-gold"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                style={{ padding: '.45rem .8rem', fontSize: '.8rem', flexShrink: 0 }}
              >
                {creating ? '…' : '+'}
              </button>
            </div>
          </div>

          {/* Liste des watchlists */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            {watchlists.length === 0 && (
              <div style={{ color: 'var(--text3)', fontSize: '.82rem', textAlign: 'center', padding: '1.5rem 1rem' }}>
                Aucune watchlist.<br />Crée-en une !
              </div>
            )}
            {watchlists.map(wl => (
              <div
                key={wl.id}
                onClick={() => { setSelected(wl.id); setRenameId(null); setConfirmDelete(null) }}
                style={{
                  background: selected === wl.id ? 'rgba(232,196,106,.08)' : 'var(--bg2)',
                  border: `1px solid ${selected === wl.id ? 'rgba(232,196,106,.3)' : 'var(--border)'}`,
                  borderRadius: 'var(--r)',
                  padding: '.65rem .9rem',
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <span style={{ fontSize: '.95rem' }}>{wl.is_public ? '🌍' : '🔒'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.84rem', fontWeight: selected === wl.id ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: selected === wl.id ? 'var(--gold)' : 'var(--text)' }}>
                      {wl.name}
                    </div>
                    <div style={{ fontSize: '.65rem', color: 'var(--text3)' }}>
                      {wl.watchlist_items.length} film{wl.watchlist_items.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main — contenu de la watchlist sélectionnée */}
        <div>
          {!current ? (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '3rem', textAlign: 'center', color: 'var(--text3)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
              <div style={{ fontSize: '.9rem' }}>Sélectionne ou crée une watchlist</div>
            </div>
          ) : (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '1.5rem' }}>
              {/* Header watchlist */}
              <div style={{ marginBottom: '1.2rem' }}>
                {renameId === current.id ? (
                  <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.75rem' }}>
                    <input
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value.slice(0, 60))}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(current.id); if (e.key === 'Escape') setRenameId(null) }}
                      autoFocus
                      style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.45rem .65rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '1rem', outline: 'none' }}
                    />
                    <button className="btn btn-gold" style={{ fontSize: '.8rem', padding: '.4rem .8rem' }} onClick={() => handleRename(current.id)}>OK</button>
                    <button className="btn btn-outline" style={{ fontSize: '.8rem', padding: '.4rem .8rem' }} onClick={() => setRenameId(null)}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.75rem', flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', flex: 1, minWidth: 0 }}>
                      {current.is_public ? '🌍' : '🔒'} {current.name}
                    </div>
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: '.72rem', padding: '.35rem .7rem' }}
                      onClick={() => { setRenameId(current.id); setRenameVal(current.name) }}
                    >
                      ✏️ Renommer
                    </button>
                    {confirmDelete === current.id ? (
                      <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '.75rem', color: 'var(--red)' }}>Confirmer ?</span>
                        <button className="btn btn-red" style={{ fontSize: '.72rem', padding: '.35rem .7rem' }} onClick={() => handleDelete(current.id)}>Supprimer</button>
                        <button className="btn btn-outline" style={{ fontSize: '.72rem', padding: '.35rem .7rem' }} onClick={() => setConfirmDelete(null)}>Annuler</button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-outline"
                        style={{ fontSize: '.72rem', padding: '.35rem .7rem', color: 'var(--red)', borderColor: 'rgba(232,90,90,.3)' }}
                        onClick={() => setConfirmDelete(current.id)}
                      >
                        🗑️ Supprimer
                      </button>
                    )}
                  </div>
                )}

                {/* Visibilité */}
                <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleTogglePublic(current, !current.is_public, current.is_anonymous)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '.5rem',
                      padding: '.4rem .85rem', borderRadius: 'var(--r)', cursor: 'pointer',
                      background: current.is_public ? 'rgba(79,217,138,.08)' : 'var(--bg3)',
                      border: `1px solid ${current.is_public ? 'rgba(79,217,138,.3)' : 'var(--border2)'}`,
                      fontSize: '.78rem', color: current.is_public ? 'var(--green)' : 'var(--text2)',
                      transition: 'all .15s',
                    }}
                  >
                    {current.is_public ? '🌍 Publique' : '🔒 Privée'}
                  </button>

                  {current.is_public && (
                    <button
                      onClick={() => handleTogglePublic(current, true, !current.is_anonymous)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '.5rem',
                        padding: '.4rem .85rem', borderRadius: 'var(--r)', cursor: 'pointer',
                        background: current.is_anonymous ? 'rgba(160,90,232,.08)' : 'var(--bg3)',
                        border: `1px solid ${current.is_anonymous ? 'rgba(160,90,232,.3)' : 'var(--border2)'}`,
                        fontSize: '.78rem', color: current.is_anonymous ? '#c084fc' : 'var(--text2)',
                        transition: 'all .15s',
                      }}
                    >
                      {current.is_anonymous ? '👤 Anonyme' : '👤 Avec mon pseudo'}
                    </button>
                  )}

                  {current.is_public && (
                    <div style={{ fontSize: '.72rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                      ✓ Visible dans les{' '}
                      <Link href="/watchlist/public" style={{ color: 'var(--gold)', textDecoration: 'none' }}>watchlists publiques</Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Films */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.2rem' }}>
                {current.watchlist_items.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '2rem', fontSize: '.85rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '.75rem' }}>🎬</div>
                    Aucun film dans cette watchlist.<br />
                    <span style={{ fontSize: '.78rem' }}>Ajoute des films depuis la <Link href="/films" style={{ color: 'var(--gold)', textDecoration: 'none' }}>liste des films</Link>.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {current.watchlist_items.map(item => {
                      const film = item.films
                      if (!film) return null
                      return (
                        <div key={item.film_id} style={{ display: 'flex', alignItems: 'center', gap: '.9rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.65rem .9rem', transition: 'border-color .15s' }}>
                          <div style={{ width: 32, height: 48, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'var(--bg2)' }}>
                            {film.poster
                              ? <Image src={film.poster} alt={film.titre} width={32} height={48} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem' }}>🎬</div>
                            }
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '.87rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{film.titre}</div>
                            <div style={{ fontSize: '.7rem', color: 'var(--text3)' }}>{film.annee} · {film.realisateur}</div>
                          </div>
                          <button
                            onClick={() => handleRemoveFilm(current.id, item.film_id, film.titre)}
                            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '1rem', padding: '.25rem', borderRadius: 4, transition: 'color .15s', flexShrink: 0 }}
                            title="Retirer de la watchlist"
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SQL reminder (dev) */}
      {/*
        CREATE TABLE watchlists (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          name text NOT NULL DEFAULT 'Ma Watchlist',
          is_public boolean NOT NULL DEFAULT false,
          is_anonymous boolean NOT NULL DEFAULT false,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
        CREATE TABLE watchlist_items (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          watchlist_id uuid REFERENCES watchlists(id) ON DELETE CASCADE NOT NULL,
          film_id integer REFERENCES films(id) ON DELETE CASCADE NOT NULL,
          added_at timestamptz DEFAULT now(),
          UNIQUE(watchlist_id, film_id)
        );
        ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
        ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "owner_all_watchlists" ON watchlists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "public_read_watchlists" ON watchlists FOR SELECT USING (is_public = true OR auth.uid() = user_id);
        CREATE POLICY "owner_all_items" ON watchlist_items FOR ALL USING (EXISTS (SELECT 1 FROM watchlists WHERE id = watchlist_id AND user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM watchlists WHERE id = watchlist_id AND user_id = auth.uid()));
        CREATE POLICY "public_read_items" ON watchlist_items FOR SELECT USING (EXISTS (SELECT 1 FROM watchlists WHERE id = watchlist_id AND (is_public = true OR user_id = auth.uid())));
      */}
    </div>
  )
}

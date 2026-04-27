import { getPublicWatchlists, getUserReactionsForWatchlists, getUserFavoriteWatchlistIds } from '@/lib/actions'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PublicWatchlistsClient from './PublicWatchlistsClient'

export const revalidate = 60

export default async function PublicWatchlistsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const watchlists = await getPublicWatchlists()

  const ids = watchlists.map((w: any) => w.id)
  const [userReactions, favorites] = await Promise.all([
    getUserReactionsForWatchlists(ids),
    getUserFavoriteWatchlistIds(),
  ])

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Watchlists publiques</div>
          <div style={{ color: 'var(--text3)', fontSize: '.82rem', marginTop: '.4rem' }}>
            {watchlists.length} watchlist{watchlists.length !== 1 ? 's' : ''} partagée{watchlists.length !== 1 ? 's' : ''} par la communauté
          </div>
        </div>
        {user && (
          <Link href="/watchlist" style={{ fontSize: '.8rem', color: 'var(--text2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '.4rem', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.45rem .9rem' }}>
            ← Mes watchlists
          </Link>
        )}
      </div>

      {watchlists.length === 0 ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '4rem', textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
          <div style={{ fontSize: '.9rem', marginBottom: '.5rem' }}>Aucune watchlist publique pour l'instant.</div>
          {user
            ? <Link href="/watchlist" style={{ fontSize: '.8rem', color: 'var(--gold)', textDecoration: 'none' }}>Partage la tienne !</Link>
            : <Link href="/auth" style={{ fontSize: '.8rem', color: 'var(--gold)', textDecoration: 'none' }}>Connecte-toi pour en créer une</Link>
          }
        </div>
      ) : (
        <PublicWatchlistsClient
          watchlists={watchlists as any}
          userId={user?.id ?? null}
          initialUserReactions={userReactions}
          initialFavorites={favorites}
        />
      )}
    </div>
  )
}

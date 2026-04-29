import { createClient } from '@/lib/supabase/server'
import { getUserCached } from '@/lib/auth'
import { withCache } from '@/lib/redis'
import SemaineClient from './SemaineClient'

export const revalidate = 60

async function fetchWatchProviders(tmdbId: number) {
  const key = process.env.TMDB_API_KEY
  if (!key || !tmdbId) return null
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${key}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    return data.results?.FR ?? null
  } catch { return null }
}

export default async function SemainePage() {
  const [user, supabase] = await Promise.all([
    getUserCached(),
    createClient(),
  ])

  // weekFilm public — même pour tous → caché 1h
  const weekFilm = await withCache('week_film:full', 3600, async () => {
    const { data } = await supabase.from('week_films').select('*, films(*)').eq('active', true).order('created_at', { ascending: false }).limit(1).single()
    return data ?? null
  })

  const film = (weekFilm as any)?.films ?? null

  const [profileResult, isWatchedResult] = await Promise.all([
    user ? supabase.from('profiles').select('*').eq('id', user.id).single() : Promise.resolve({ data: null }),
    (film && user) ? supabase.from('watched').select('film_id').eq('user_id', user.id).eq('film_id', film.id).single() : Promise.resolve({ data: null }),
  ])

  const profile = profileResult.data
  const isWatched = isWatchedResult.data

  const watchProviders = film?.tmdb_id ? await fetchWatchProviders(film.tmdb_id) : null

  return (
    <SemaineClient
      profile={profile}
      weekFilm={weekFilm as any}
      film={film}
      isWatched={!!isWatched}
      watchProviders={watchProviders}
    />
  )
}

import { createClient } from '@/lib/supabase/server'
import { getUserCached } from '@/lib/auth'
import SemaineClient from './SemaineClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

  const [{ data: weekFilm }, { data: weekFilmHistory }] = await Promise.all([
    supabase.from('week_films').select('*, films(*)').eq('active', true).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('week_films').select('id, film_id, session_time, active, created_at, films(id, titre, annee, poster, realisateur)').order('created_at', { ascending: false }).limit(50),
  ])

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
      weekFilmHistory={(weekFilmHistory as any[]) ?? []}
    />
  )
}

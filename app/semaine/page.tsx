import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: weekFilm }] = await Promise.all([
    user ? supabase.from('profiles').select('*').eq('id', user.id).single() : Promise.resolve({ data: null }),
    supabase.from('week_films').select('*, films(*)').eq('active', true).order('created_at', { ascending: false }).limit(1).single(),
  ])

  const film = (weekFilm as any)?.films ?? null
  const { data: isWatched } = (film && user)
    ? await supabase.from('watched').select('film_id').eq('user_id', user.id).eq('film_id', film.id).single()
    : { data: null }

  const watchProviders = film?.tmdb_id ? await fetchWatchProviders(film.tmdb_id) : null

  return (
    <SemaineClient
      profile={profile}
      weekFilm={weekFilm}
      film={film}
      isWatched={!!isWatched}
      watchProviders={watchProviders}
    />
  )
}

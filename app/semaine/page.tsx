import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SemaineClient from './SemaineClient'

export const revalidate = 60

export default async function SemainePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: profile }, { data: weekFilm }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('week_films').select('*, films(*)').eq('active', true).order('created_at', { ascending: false }).limit(1).single(),
  ])

  const film = (weekFilm as any)?.films ?? null
  const { data: isWatched } = film ? await supabase.from('watched').select('film_id').eq('user_id', user.id).eq('film_id', film.id).single() : { data: null }

  return (
    <SemaineClient
      profile={profile!}
      weekFilm={weekFilm}
      film={film}
      isWatched={!!isWatched}
    />
  )
}

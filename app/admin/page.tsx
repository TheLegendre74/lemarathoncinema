import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'
import type { Profile } from '@/lib/supabase/types'

export const revalidate = 30

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = profileData as Profile | null
  if (!profile?.is_admin) redirect('/')

  const [{ data: films }, { data: users }, { data: duels }, { data: weekFilm }, { data: allWatched }, { data: flaggedFilms }] = await Promise.all([
    supabase.from('films').select('*').order('titre'),
    supabase.from('profiles').select('*, watched:watched(film_id), votes:votes(duel_id)').order('exp', { ascending: false }),
    supabase.from('duels').select('*, film1:films!duels_film1_id_fkey(titre), film2:films!duels_film2_id_fkey(titre), votes(film_choice)').order('created_at', { ascending: false }).limit(10),
    supabase.from('week_films').select('*, films(titre)').eq('active', true).single(),
    supabase.from('watched').select('film_id'),
    supabase.from('films').select('*').eq('flagged_18plus', true).order('created_at', { ascending: false }),
  ])

  const totalUsers = users?.length ?? 1
  const watchCountMap: Record<number, number> = {}
  allWatched?.forEach((w: { film_id: number }) => { watchCountMap[w.film_id] = (watchCountMap[w.film_id] ?? 0) + 1 })

  return (
    <AdminClient
      profile={profile}
      films={films ?? []}
      users={users ?? []}
      duels={duels ?? []}
      weekFilm={weekFilm}
      totalUsers={totalUsers}
      watchCountMap={watchCountMap}
      flaggedFilms={flaggedFilms ?? []}
    />
  )
}

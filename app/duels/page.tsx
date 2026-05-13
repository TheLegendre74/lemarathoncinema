import { createClient } from '@/lib/supabase/server'
import DuelsClient from './DuelsClient'

export const revalidate = 30

export default async function DuelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: duels }, { count: totalUsers }] = await Promise.all([
    user ? supabase.from('profiles').select('*').eq('id', user.id).single() : Promise.resolve({ data: null }),
    supabase
      .from('duels')
      .select('*, film1:films!duels_film1_id_fkey(*), film2:films!duels_film2_id_fkey(*), winner:films!duels_winner_id_fkey(*)')
      .eq('pending', false)
      .order('created_at', { ascending: false })
      .limit(15),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const filmIds = [...new Set((duels ?? []).flatMap((d: any) => [d.film1_id, d.film2_id]))]

  const [votes, { data: allVotes }, { data: watchedRows }, { data: ratingRows }] = await Promise.all([
    user
      ? supabase.from('votes').select('duel_id, film_choice').eq('user_id', user.id).then(r => r.data ?? [])
      : Promise.resolve([]),
    supabase.from('votes').select('duel_id, film_choice').in('duel_id', (duels ?? []).map((d: { id: number }) => d.id)),
    filmIds.length ? supabase.from('watched').select('film_id').in('film_id', filmIds) : Promise.resolve({ data: [] }),
    filmIds.length ? supabase.from('ratings').select('film_id, score').in('film_id', filmIds) : Promise.resolve({ data: [] }),
  ])

  const watchCountMap: Record<number, number> = {}
  ;(watchedRows ?? []).forEach((w: { film_id: number }) => {
    watchCountMap[w.film_id] = (watchCountMap[w.film_id] ?? 0) + 1
  })
  const ratingMap: Record<number, number[]> = {}
  ;(ratingRows ?? []).forEach((r: { film_id: number; score: number }) => {
    if (!ratingMap[r.film_id]) ratingMap[r.film_id] = []
    ratingMap[r.film_id].push(r.score)
  })

  return (
    <DuelsClient
      profile={profile}
      duels={duels ?? []}
      myVotes={votes}
      allVotes={allVotes ?? []}
      watchCountMap={watchCountMap}
      ratingMap={ratingMap}
      totalUsers={totalUsers ?? 1}
    />
  )
}

import { createClient } from '@/lib/supabase/server'
import { getUserCached } from '@/lib/auth'
import { withCache } from '@/lib/redis'
import DuelsClient from './DuelsClient'

export const revalidate = 30

export default async function DuelsPage() {
  const [user, supabase] = await Promise.all([
    getUserCached(),
    createClient(),
  ])

  const [profile, duels, totalUsers] = await Promise.all([
    user
      ? withCache(`user:${user.id}:profile`, 60, async () => {
          const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
          return data
        })
      : Promise.resolve(null),
    withCache('duels:list', 30, async () => {
      const { data } = await supabase
        .from('duels')
        .select('*, film1:films!duels_film1_id_fkey(*), film2:films!duels_film2_id_fkey(*), winner:films!duels_winner_id_fkey(*)')
        .eq('pending', false)
        .order('created_at', { ascending: false })
        .limit(15)
      return data ?? []
    }),
    withCache('profiles:count', 300, async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      return count ?? 1
    }),
  ])

  const duelIds = (duels ?? []).map((d: { id: number }) => d.id)
  const filmIds = [...new Set((duels ?? []).flatMap((d: any) => [d.film1_id, d.film2_id]))]

  const [votes, allVotes, watchedRows, ratingRows, myWatchedData, myRatingsData] = await Promise.all([
    user
      ? supabase.from('votes').select('duel_id, film_choice').eq('user_id', user.id).then(r => r.data ?? [])
      : Promise.resolve([]),
    withCache(`duels:votes:${duelIds.join(',')}`, 15, async () => {
      const { data } = await supabase.from('votes').select('duel_id, film_choice').in('duel_id', duelIds)
      return data ?? []
    }),
    filmIds.length
      ? withCache(`duels:watched:${filmIds.sort().join(',')}`, 60, async () => {
          const { data } = await supabase.from('watched').select('film_id').in('film_id', filmIds)
          return data ?? []
        })
      : Promise.resolve([]),
    filmIds.length
      ? withCache(`duels:ratings:${filmIds.sort().join(',')}`, 60, async () => {
          const { data } = await supabase.from('ratings').select('film_id, score').in('film_id', filmIds)
          return data ?? []
        })
      : Promise.resolve([]),
    user && filmIds.length ? supabase.from('watched').select('film_id, pre').eq('user_id', user.id).in('film_id', filmIds).then(r => r.data ?? []) : Promise.resolve([]),
    user && filmIds.length ? supabase.from('ratings').select('film_id, score').eq('user_id', user.id).in('film_id', filmIds).then(r => r.data ?? []) : Promise.resolve([]),
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

  const myWatched: Record<number, boolean> = {}
  ;(myWatchedData ?? []).forEach((w: { film_id: number; pre: boolean }) => {
    myWatched[w.film_id] = w.pre
  })
  const myRatings: Record<number, number> = {}
  ;(myRatingsData ?? []).forEach((r: { film_id: number; score: number }) => {
    myRatings[r.film_id] = r.score
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
      myWatched={myWatched}
      myRatings={myRatings}
    />
  )
}

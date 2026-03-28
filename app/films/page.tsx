import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CONFIG, isMarathonLive } from '@/lib/config'
import { getServerConfig } from '@/lib/serverConfig'
import FilmsClient from './FilmsClient'

export const revalidate = 30

export default async function FilmsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [serverConfig, { data: profile }, { data: films }, { data: watched }, { data: ratings }, { data: userCount }, { data: weekFilm }] = await Promise.all([
    getServerConfig(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('films').select('*').order('titre'),
    supabase.from('watched').select('film_id, pre').eq('user_id', user.id),
    supabase.from('ratings').select('film_id, score').eq('user_id', user.id),
    supabase.from('profiles').select('id', { count: 'exact' }),
    supabase.from('week_films').select('film_id').eq('active', true).single(),
  ])

  // Get global watch counts per film
  const { data: allWatched } = await supabase.from('watched').select('film_id')

  const totalUsers = userCount?.length ?? 1
  const watchCountMap: Record<number, number> = {}
  allWatched?.forEach((w: { film_id: number }) => {
    watchCountMap[w.film_id] = (watchCountMap[w.film_id] ?? 0) + 1
  })

  // Get average ratings per film
  const { data: allRatings } = await supabase.from('ratings').select('film_id, score')
  const ratingMap: Record<number, number[]> = {}
  allRatings?.forEach((r: { film_id: number; score: number }) => {
    if (!ratingMap[r.film_id]) ratingMap[r.film_id] = []
    ratingMap[r.film_id].push(r.score)
  })

  const watchedIds = new Set((watched?.map((w: { film_id: number }) => w.film_id) ?? []) as number[])
  const myRatings = Object.fromEntries(ratings?.map((r: { film_id: number; score: number }) => [r.film_id, r.score]) ?? [])
  const weekFilmId = (weekFilm as { film_id: number } | null)?.film_id ?? null

  return (
    <FilmsClient
      films={films ?? []}
      profile={profile!}
      watchedIds={[...watchedIds]}
      myRatings={myRatings}
      watchCountMap={watchCountMap}
      ratingMap={ratingMap}
      totalUsers={totalUsers}
      weekFilmId={weekFilmId}
      isMarathonLive={isMarathonLive()}
      saisonNumero={CONFIG.SAISON_NUMERO}
      filmsOffsetX={serverConfig.FILMS_OFFSET_X}
      filmsOffsetY={serverConfig.FILMS_OFFSET_Y}
    />
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserWatchlists } from '@/lib/actions'
import WatchlistClient from './WatchlistClient'
import { getUserCached } from '@/lib/auth'

export const revalidate = 30

export default async function WatchlistPage() {
  const user = await getUserCached()
  if (!user) redirect('/auth')

  const supabase = await createClient()

  const [watchlists, { data: watchedData }] = await Promise.all([
    getUserWatchlists(),
    supabase.from('watched').select('film_id').eq('user_id', user.id),
  ])

  const watchedFilmIds = new Set<number>((watchedData ?? []).map((w: any) => w.film_id))

  return <WatchlistClient watchlists={watchlists} watchedFilmIds={watchedFilmIds} />
}

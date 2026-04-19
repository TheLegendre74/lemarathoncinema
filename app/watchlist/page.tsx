import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserWatchlists } from '@/lib/actions'
import WatchlistClient from './WatchlistClient'

export const revalidate = 0

export default async function WatchlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const watchlists = await getUserWatchlists()

  return <WatchlistClient watchlists={watchlists} />
}

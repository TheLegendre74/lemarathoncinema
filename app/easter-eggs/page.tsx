import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EasterEggsPageClient from './EasterEggsPageClient'

export const revalidate = 0

export default async function EasterEggsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Load discovered eggs for this user
  const { data: discovered } = await supabase
    .from('discovered_eggs')
    .select('egg_id, found_at')
    .eq('user_id', user.id)

  // Load user stats to compute achievement eggs
  const [
    { count: watchCount },
    { count: ratingCount },
    { count: voteCount },
    { count: filmCount },
  ] = await Promise.all([
    supabase.from('watched').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('ratings').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('votes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('films').select('*', { count: 'exact', head: true }).eq('added_by', user.id),
  ])

  const discoveredMap: Record<string, string> = {}
  discovered?.forEach(({ egg_id, found_at }) => { discoveredMap[egg_id] = found_at })

  // Achievement eggs: auto-discovered based on stats (not persisted in DB)
  const achievements: Record<string, boolean> = {
    watcher:  (watchCount  ?? 0) >= 5,
    critic:   (ratingCount ?? 0) >= 3,
    duelist:  (voteCount   ?? 0) >= 1,
    curator:  (filmCount   ?? 0) >= 1,
  }

  return (
    <EasterEggsPageClient
      discoveredMap={discoveredMap}
      achievements={achievements}
    />
  )
}

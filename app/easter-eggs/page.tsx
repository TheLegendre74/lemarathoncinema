import { createClient } from '@/lib/supabase/server'
import EasterEggsPageClient from './EasterEggsPageClient'

export const revalidate = 0

export default async function EasterEggsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let discoveredMap: Record<string, string> = {}
  let achievements: Record<string, boolean> = { watcher: false, critic: false, duelist: false, curator: false }

  if (user) {
    const { data: discovered } = await supabase
      .from('discovered_eggs')
      .select('egg_id, found_at')
      .eq('user_id', user.id)

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

    discovered?.forEach(({ egg_id, found_at }) => { discoveredMap[egg_id] = found_at })
    achievements = {
      watcher:  (watchCount  ?? 0) >= 5,
      critic:   (ratingCount ?? 0) >= 3,
      duelist:  (voteCount   ?? 0) >= 1,
      curator:  (filmCount   ?? 0) >= 1,
    }
  }

  // Statistiques globales : nombre de joueurs DISTINCTS ayant découvert chaque egg
  const [{ data: allEggs }, { count: totalUsers }] = await Promise.all([
    supabase.from('discovered_eggs').select('egg_id, user_id'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const eggStats: Record<string, number> = {}
  if (allEggs) {
    // On group par egg_id et on dédoublonne les user_id
    const seen: Record<string, Set<string>> = {}
    for (const { egg_id, user_id } of allEggs) {
      if (!seen[egg_id]) seen[egg_id] = new Set()
      seen[egg_id].add(user_id)
    }
    for (const [egg_id, users] of Object.entries(seen)) {
      eggStats[egg_id] = users.size
    }
  }

  return (
    <EasterEggsPageClient
      discoveredMap={discoveredMap}
      achievements={achievements}
      eggStats={eggStats}
      totalUsers={totalUsers ?? 0}
    />
  )
}

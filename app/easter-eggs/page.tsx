import { createClient, createAdminClient } from '@/lib/supabase/server'
import EasterEggsPageClient from './EasterEggsPageClient'
import { getUserCached } from '@/lib/auth'
import { getSeasonWeeks } from '@/lib/themes/seasonWeeks'
import { resolveTheme } from '@/lib/themes/resolve'
import { getServerConfig } from '@/lib/serverConfig'
import { cookies } from 'next/headers'
import { READY_THEMES, type ThemeKey } from '@/lib/themes/types'

export const revalidate = 120

export default async function EasterEggsPage() {
  const user = await getUserCached()

  let discoveredMap: Record<string, string> = {}
  let achievements: Record<string, boolean> = { watcher: false, critic: false, duelist: false, curator: false }

  if (user) {
    const supabase = await createClient()
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

  // Statistiques globales : client admin pour bypasser le RLS (sinon on ne voit que ses propres lignes)
  const adminClient = createAdminClient()
  const [{ data: allEggs }, { count: totalUsers }] = await Promise.all([
    adminClient.from('discovered_eggs').select('egg_id, user_id'),
    adminClient.from('profiles').select('id', { count: 'exact', head: true }),
  ])

  const eggStats: Record<string, number> = {}
  if (allEggs) {
    // Dédoublonnage par user_id pour compter les joueurs uniques par egg
    const seen: Record<string, Set<string>> = {}
    for (const { egg_id, user_id } of (allEggs as { egg_id: string; user_id: string }[])) {
      if (!seen[egg_id]) seen[egg_id] = new Set()
      seen[egg_id].add(user_id)
    }
    for (const [egg_id, users] of Object.entries(seen)) {
      eggStats[egg_id] = users.size
    }
  }

  const [seasonWeeks, cfg, cookieStore] = await Promise.all([
    getSeasonWeeks(),
    getServerConfig(),
    cookies(),
  ])

  const isAdmin = !!(user && (await (await createClient()).from('profiles').select('is_admin').eq('id', user.id).single()).data?.is_admin)
  const previewRaw = cookieStore.get('cm_theme_apercu')?.value ?? null
  const previewCookie = (previewRaw && READY_THEMES.includes(previewRaw as ThemeKey)) ? previewRaw as ThemeKey : null
  const resolved = resolveTheme({
    now: new Date(),
    cfg: { theme_mode: cfg.theme_mode, theme_force: cfg.theme_force as ThemeKey },
    weeks: seasonWeeks,
    previewCookie,
    isAdmin,
  })

  const now = new Date()
  const themeEggFamilies = ['action', 'comedie', 'western', 'horreur'] as const
  const THEME_EGG_IDS: Record<string, string[]> = {
    action: ['theme-action-voiture', 'theme-action-nakatomi'],
    comedie: ['theme-comedie-vert', 'theme-comedie-blanquette', 'theme-comedie-hyene'],
    western: ['theme-western-mouche', 'theme-western-404', 'theme-western-duel'],
    horreur: ['theme-horreur-ballon', 'theme-horreur-possession', 'theme-horreur-cercle', 'theme-horreur-apparition'],
  }

  const visibleFamilies: string[] = []
  for (const theme of themeEggFamilies) {
    if (isAdmin) { visibleFamilies.push(theme); continue }
    const hasStartedWeek = seasonWeeks.some(w => w.theme === theme && new Date(w.date_debut) <= now)
    const isCurrentTheme = resolved.real === theme
    const hasFoundEgg = THEME_EGG_IDS[theme]?.some(id => (eggStats[id] ?? 0) > 0)
    if (hasStartedWeek || isCurrentTheme || hasFoundEgg) {
      visibleFamilies.push(theme)
    }
  }

  return (
    <EasterEggsPageClient
      discoveredMap={discoveredMap}
      achievements={achievements}
      eggStats={eggStats}
      totalUsers={totalUsers ?? 0}
      visibleFamilies={visibleFamilies}
      currentTheme={resolved.real}
      isAdmin={isAdmin}
    />
  )
}

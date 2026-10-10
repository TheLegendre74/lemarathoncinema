'use server'

import { cookies } from 'next/headers'
import { revalidatePath, updateTag } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getUserCached } from '@/lib/auth'
import { deleteCacheKeys } from '@/lib/redis'
import type { ThemeKey, SeasonWeek } from './types'
import { READY_THEMES } from './types'

async function requireAdmin() {
  const user = await getUserCached()
  if (!user) throw new Error('Non connecté')
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Non admin')
  return user
}

export async function setThemePreview(key: ThemeKey | null) {
  const user = await requireAdmin()
  const cookieStore = await cookies()

  if (!key) {
    cookieStore.delete('cm_theme_apercu')
    return
  }

  if (!READY_THEMES.includes(key)) throw new Error('Thème inconnu')

  cookieStore.set('cm_theme_apercu', key, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60,
  })
}

export async function adminSetThemeMode(mode: 'auto' | 'force') {
  await requireAdmin()
  const admin = createAdminClient()
  await admin.from('site_config').upsert({ key: 'theme_mode', value: mode })
  updateTag('site-config')
  await deleteCacheKeys(['site-config'])
}

export async function adminSetThemeForce(theme: ThemeKey) {
  await requireAdmin()
  if (!READY_THEMES.includes(theme)) throw new Error('Thème inconnu')
  const admin = createAdminClient()
  await Promise.all([
    admin.from('site_config').upsert({ key: 'theme_mode', value: 'force' }),
    admin.from('site_config').upsert({ key: 'theme_force', value: theme }),
  ])
  updateTag('site-config')
  await deleteCacheKeys(['site-config'])
}

export async function adminSaveSeasonWeeks(weeks: SeasonWeek[]) {
  await requireAdmin()

  for (const w of weeks) {
    if (w.semaine < 1 || w.semaine > 12) throw new Error(`Semaine invalide : ${w.semaine}`)
    if (w.saison < 1) throw new Error(`Saison invalide : ${w.saison}`)
    const d = new Date(w.date_debut + 'T00:00:00Z')
    if (d.getUTCDay() !== 1) throw new Error(`${w.date_debut} n'est pas un lundi`)
  }

  const admin = createAdminClient()
  const { data: existing } = await admin.from('season_weeks').select('id, saison, semaine')
  const existingIds = (existing ?? []).map((e: any) => e.id)

  if (existingIds.length > 0) {
    await admin.from('season_weeks').delete().in('id', existingIds)
  }

  if (weeks.length > 0) {
    const { error } = await admin.from('season_weeks').insert(
      weeks.map(w => ({
        saison: w.saison,
        semaine: w.semaine,
        theme: w.theme,
        date_debut: w.date_debut,
      }))
    )
    if (error) throw new Error(error.message)
  }

  updateTag('season-weeks')
}

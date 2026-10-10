import { getServerConfig } from '@/lib/serverConfig'
import { getSeasonWeeks } from '@/lib/themes/seasonWeeks'
import { resolveTheme } from '@/lib/themes/resolve'
import { cookies } from 'next/headers'
import { READY_THEMES, type ThemeKey } from '@/lib/themes/types'
import ThemeAdminPage from './ThemeAdminPage'

export const revalidate = 0

export default async function AdminThemePage() {
  const [cfg, seasonWeeks, cookieStore] = await Promise.all([
    getServerConfig(),
    getSeasonWeeks(),
    cookies(),
  ])

  const previewRaw = cookieStore.get('cm_theme_apercu')?.value ?? null
  const previewCookie = (previewRaw && READY_THEMES.includes(previewRaw as ThemeKey)) ? previewRaw as ThemeKey : null

  const resolved = resolveTheme({
    now: new Date(),
    cfg: { theme_mode: cfg.theme_mode, theme_force: cfg.theme_force as ThemeKey },
    weeks: seasonWeeks,
    previewCookie,
    isAdmin: true,
  })

  return (
    <ThemeAdminPage
      resolved={resolved}
      themeMode={cfg.theme_mode}
      themeForce={cfg.theme_force}
      seasonWeeks={seasonWeeks}
      saisonNumero={cfg.SAISON_NUMERO}
      videoclubMode={cfg.videoclub_mode}
    />
  )
}

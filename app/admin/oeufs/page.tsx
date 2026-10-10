import { createAdminClient } from '@/lib/supabase/server'
import { getServerConfig } from '@/lib/serverConfig'
import OeufsPage from './OeufsPage'

export const revalidate = 0

export default async function AdminOeufsRoute() {
  const admin = createAdminClient()
  const cfg = await getServerConfig()

  const [
    { data: siteConfig },
    { data: eggCounts },
  ] = await Promise.all([
    admin.from('site_config').select('key, value'),
    admin.from('discovered_eggs').select('egg_id'),
  ])

  const configMap: Record<string, string> = {}
  for (const row of siteConfig ?? []) {
    configMap[(row as any).key] = (row as any).value
  }

  const countMap: Record<string, number> = {}
  for (const row of eggCounts ?? []) {
    const eid = (row as any).egg_id
    countMap[eid] = (countMap[eid] ?? 0) + 1
  }

  const eggsDisabled: string[] = (() => {
    try { return JSON.parse(configMap.eggs_disabled ?? '[]') } catch { return [] }
  })()

  const tipiakLinks: Array<{ label: string; url: string }> = (() => {
    try { return JSON.parse(configMap.TIPIAK_LINKS ?? '[]') } catch { return [] }
  })()

  const clippyReplies: string[] = (() => {
    try { const p = JSON.parse(configMap.CLIPPY_REPLIES ?? '[]'); return Array.isArray(p) ? p : [] } catch { return [] }
  })()

  return (
    <OeufsPage
      eggCounts={countMap}
      eggsDisabled={eggsDisabled}
      siteConfig={configMap}
      tipiakLinks={tipiakLinks}
      clippyReplies={clippyReplies}
    />
  )
}

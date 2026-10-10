import { createAdminClient } from '@/lib/supabase/server'
import { getServerConfig } from '@/lib/serverConfig'
import ReglagesPage from './ReglagesPage'

export const revalidate = 0

export default async function AdminReglagesRoute() {
  const admin = createAdminClient()
  const cfg = await getServerConfig()

  const { data: siteConfig } = await admin.from('site_config').select('key, value')

  const configMap: Record<string, string> = {}
  for (const row of siteConfig ?? []) {
    configMap[(row as any).key] = (row as any).value
  }

  return (
    <ReglagesPage
      siteConfig={configMap}
      serverConfig={cfg}
    />
  )
}

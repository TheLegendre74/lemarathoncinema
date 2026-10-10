import { createAdminClient } from '@/lib/supabase/server'
import { getServerConfig } from '@/lib/serverConfig'
import OutilsPage from './OutilsPage'

export const revalidate = 0

export default async function AdminOutilsRoute() {
  const admin = createAdminClient()
  const cfg = await getServerConfig()

  const { data: recentLog } = await admin.from('admin_log')
    .select('id, admin_id, action, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const hasRedis = !!process.env.REDIS_URL
  const hasTmdb = !!process.env.TMDB_API_KEY
  const hasOmdb = !!process.env.OMDB_API_KEY
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? null

  return (
    <OutilsPage
      recentLog={recentLog ?? []}
      hasRedis={hasRedis}
      hasTmdb={hasTmdb}
      hasOmdb={hasOmdb}
      commitSha={commitSha}
      saisonNumero={cfg.SAISON_NUMERO}
    />
  )
}

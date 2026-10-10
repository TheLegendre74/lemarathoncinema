import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getServerConfig } from '@/lib/serverConfig'
import JoueursPage from './JoueursPage'

export const revalidate = 0

export default async function AdminJoueursRoute() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const cfg = await getServerConfig()

  const [
    { data: users },
    { data: seasonJoinRequests },
    { data: marathonRequests },
  ] = await Promise.all([
    admin.from('profiles').select('id, pseudo, avatar_url, is_admin, exp, saison, in_marathon, created_at').order('pseudo'),
    (admin as any).from('season_join_requests').select('id, user_id, status, type, created_at, profiles(pseudo)').eq('status', 'pending').order('created_at', { ascending: false }),
    admin.from('marathon_requests').select('id, user_id, status, created_at, profiles(pseudo)').eq('status', 'pending').order('created_at', { ascending: false }),
  ])

  const userIds = (users ?? []).map((u: any) => u.id)

  const [{ data: watchCounts }, { data: voteCounts }] = await Promise.all([
    admin.from('watched').select('user_id').in('user_id', userIds),
    admin.from('votes').select('user_id').in('user_id', userIds),
  ])

  const watchMap: Record<string, number> = {}
  const voteMap: Record<string, number> = {}
  for (const w of watchCounts ?? []) {
    watchMap[w.user_id] = (watchMap[w.user_id] ?? 0) + 1
  }
  for (const v of voteCounts ?? []) {
    voteMap[v.user_id] = (voteMap[v.user_id] ?? 0) + 1
  }

  return (
    <JoueursPage
      users={(users ?? []).map((u: any) => ({ ...u, watchCount: watchMap[u.id] ?? 0, voteCount: voteMap[u.id] ?? 0 }))}
      seasonJoinRequests={seasonJoinRequests ?? []}
      marathonRequests={marathonRequests ?? []}
      saisonNumero={cfg.SAISON_NUMERO}
    />
  )
}

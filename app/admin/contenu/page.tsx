import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getServerConfig } from '@/lib/serverConfig'
import ContenuPage from './ContenuPage'

export const revalidate = 0

export default async function AdminContenuRoute() {
  const admin = createAdminClient()
  const supabase = await createClient()
  const cfg = await getServerConfig()

  const [
    { data: news },
    { data: recommendations },
    { data: forumTopics },
    { data: siteConfig },
  ] = await Promise.all([
    admin.from('news').select('id, title, content, pinned, created_at').order('created_at', { ascending: false }),
    admin.from('recommendations').select('id, titre, annee, realisateur, description, niveau, created_at').order('niveau').order('created_at', { ascending: false }),
    supabase.from('forum_topics').select('id, title, type, created_at, posts:forum_posts(count)').order('created_at', { ascending: false }),
    admin.from('site_config').select('key, value'),
  ])

  const configMap: Record<string, string> = {}
  for (const row of siteConfig ?? []) {
    configMap[(row as any).key] = (row as any).value
  }

  return (
    <ContenuPage
      news={news ?? []}
      recommendations={recommendations ?? []}
      forumTopics={forumTopics ?? []}
      siteConfig={configMap}
      serverConfig={cfg}
    />
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConwayPageClient from './ConwayPageClient'

export const metadata = { title: 'Jeu de la Vie' }

export default async function ConwayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/easter-eggs')

  const { data: egg } = await supabase
    .from('discovered_eggs')
    .select('egg_id')
    .eq('user_id', user.id)
    .eq('egg_id', 'conway')
    .maybeSingle()

  if (!egg) redirect('/easter-eggs')

  return <ConwayPageClient />
}

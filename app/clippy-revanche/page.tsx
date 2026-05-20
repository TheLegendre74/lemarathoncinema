import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClippyRevancheClient from './ClippyRevancheClient'

export const revalidate = 30

export default async function ClippyRevanchePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('clippy_defeats')
    .eq('id', user.id)
    .single()

  const defeats = (profile as any)?.clippy_defeats ?? 0
  if (defeats < 1) redirect('/easter-eggs')

  return <ClippyRevancheClient clippyDefeats={defeats} />
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TamagotchiPreview from './TamagotchiPreview'
import { getUserCached } from '@/lib/auth'

export const revalidate = 0

export default async function TamagotchiPreviewPage() {
  const user = await getUserCached()
  if (!user) redirect('/auth')

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  return <TamagotchiPreview />
}

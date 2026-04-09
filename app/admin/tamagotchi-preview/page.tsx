import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TamagotchiPreview from './TamagotchiPreview'

export const revalidate = 0

export default async function TamagotchiPreviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  return <TamagotchiPreview />
}

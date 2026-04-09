import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { initOrGetTamagotchi } from '@/lib/actions'
import TamagotchiClient from './TamagotchiClient'

export const revalidate = 0

export default async function TamagotchiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  // Vérifier que le joueur a l'egg tamagotchi
  const { data: egg } = await supabase
    .from('discovered_eggs')
    .select('egg_id')
    .eq('user_id', user.id)
    .eq('egg_id', 'tamagotchi')
    .single()

  if (!egg) redirect('/easter-eggs')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: pet, evolved, evolvedTo, isNew } = await initOrGetTamagotchi()

  return (
    <TamagotchiClient
      initialPet={pet}
      evolved={evolved}
      evolvedTo={evolvedTo}
      isNew={isNew}
      isAdmin={!!profile?.is_admin}
    />
  )
}

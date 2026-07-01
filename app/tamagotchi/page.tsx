import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { initOrGetTamagotchi } from '@/lib/actions'
import TamagotchiClient from './TamagotchiClient'
import { getUserCached } from '@/lib/auth'

export const revalidate = 30

export default async function TamagotchiPage() {
  const user = await getUserCached()

  if (!user) redirect('/auth')

  const supabase = await createClient()

  // Vérifier que le joueur a l'egg tamagotchi
  const { data: egg } = await supabase
    .from('discovered_eggs')
    .select('egg_id')
    .eq('user_id', user.id)
    .eq('egg_id', 'tamagotchi')
    .single()

  if (!egg) redirect('/easter-eggs')

  const [{ data: profile }, petResult] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
    initOrGetTamagotchi(),
  ])
  const { data: pet, evolved, evolvedTo, isNew, cycleRestarted, neglectPenalty } = petResult

  return (
    <TamagotchiClient
      initialPet={pet}
      evolved={evolved}
      evolvedTo={evolvedTo}
      isNew={isNew}
      isAdmin={!!profile?.is_admin}
      cycleRestartedOnLoad={!!cycleRestarted}
      neglectPenalty={!!neglectPenalty}
    />
  )
}

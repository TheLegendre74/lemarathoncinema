import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DuelsClient from './DuelsClient'

export const revalidate = 30

export default async function DuelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: profile }, { data: duels }, { data: votes }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('duels')
      .select('*, film1:films!duels_film1_id_fkey(*), film2:films!duels_film2_id_fkey(*), winner:films!duels_winner_id_fkey(*)')
      .order('created_at', { ascending: false })
      .limit(15),
    supabase.from('votes').select('duel_id, film_choice').eq('user_id', user.id),
  ])

  // Get vote counts per duel
  const duelIds = (duels ?? []).map((d: { id: number }) => d.id)
  const { data: allVotes } = await supabase.from('votes').select('duel_id, film_choice').in('duel_id', duelIds)

  return (
    <DuelsClient
      profile={profile!}
      duels={duels ?? []}
      myVotes={votes ?? []}
      allVotes={allVotes ?? []}
    />
  )
}

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Vérification : mercredi 20h Paris (UTC+2 en été, UTC+1 en hiver)
  const now = new Date()
  const parisTZ = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    hour: 'numeric',
  }).formatToParts(now)
  const weekday = parisTZ.find(p => p.type === 'weekday')?.value
  const hour = parseInt(parisTZ.find(p => p.type === 'hour')?.value ?? '0')

  if (weekday !== 'mercredi' || hour < 20) {
    return NextResponse.json({ message: `Pas mercredi 20h Paris (${weekday} ${hour}h UTC)` })
  }

  const supabase = createAdminClient()

  const { data: openDuels, error } = await supabase
    .from('duels')
    .select('id, film1_id, film2_id')
    .eq('closed', false)

  if (error || !openDuels?.length) {
    return NextResponse.json({ message: 'Aucun duel ouvert', closed: 0 })
  }

  let closed = 0
  for (const duel of openDuels) {
    const { data: votes } = await supabase
      .from('votes')
      .select('film_choice')
      .eq('duel_id', duel.id)

    const v1 = (votes ?? []).filter((v: { film_choice: number }) => v.film_choice === duel.film1_id).length
    const v2 = (votes ?? []).filter((v: { film_choice: number }) => v.film_choice === duel.film2_id).length
    const winnerId = v1 >= v2 ? duel.film1_id : duel.film2_id

    await supabase.from('duels').update({ winner_id: winnerId, closed: true }).eq('id', duel.id)
    closed++
  }

  revalidatePath('/duels')
  revalidatePath('/')
  revalidatePath('/admin')

  return NextResponse.json({ closed, total: openDuels.length })
}

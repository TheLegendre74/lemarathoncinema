import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { deleteCacheKeys } from '@/lib/redis'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const parisTZ = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    hour: 'numeric',
  }).formatToParts(now)
  const weekday = parisTZ.find(p => p.type === 'weekday')?.value
  const hour = parseInt(parisTZ.find(p => p.type === 'hour')?.value ?? '0')

  if (weekday !== 'vendredi' || hour < 22) {
    return NextResponse.json({ message: `Pas vendredi 22h Paris (${weekday} ${hour}h Paris)` })
  }

  const supabase = createAdminClient()
  const { data: activeFilms, error: selectError } = await supabase
    .from('week_films')
    .select('id')
    .eq('active', true)

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 })
  }

  if (!activeFilms?.length) {
    return NextResponse.json({ archived: 0, message: 'Aucun film de la semaine actif' })
  }

  const ids = activeFilms.map((film) => film.id)
  const { error: updateError } = await supabase
    .from('week_films')
    .update({ active: false })
    .in('id', ids)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  revalidatePath('/semaine')
  revalidatePath('/films')
  revalidatePath('/admin')
  revalidatePath('/')
  await deleteCacheKeys(['week_film:active', 'week_film:full'])

  return NextResponse.json({ archived: ids.length })
}

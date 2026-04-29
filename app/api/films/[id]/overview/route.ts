import { createClient } from '@/lib/supabase/server'
import { withCache } from '@/lib/redis'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const filmId = parseInt(id)
  if (isNaN(filmId)) return Response.json({ overview: null })

  const overview = await withCache(`film:overview:${filmId}`, 3600, async () => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('films')
      .select('overview')
      .eq('id', filmId)
      .single()
    return data?.overview ?? null
  })

  return Response.json({ overview })
}

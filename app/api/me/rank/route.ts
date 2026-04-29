import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ rank: null })

  const { data: profile } = await supabase
    .from('profiles')
    .select('exp')
    .eq('id', user.id)
    .single()

  if (!profile) return Response.json({ rank: null })

  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('exp', profile.exp)

  return Response.json({ rank: count ?? 1 })
}

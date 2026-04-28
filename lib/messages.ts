import { createClient } from './supabase/server'

type SupabaseLike = Awaited<ReturnType<typeof createClient>>

export async function getUnreadMessageCountForUser(userId: string, supabase: SupabaseLike): Promise<number> {
  const { count } = await (supabase as any)
    .from('private_messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null)
    .eq('deleted_by_recipient', false)

  return count ?? 0
}

export async function getUnreadMessageCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  return getUnreadMessageCountForUser(user.id, supabase)
}

import { cache } from 'react'
import { createClient } from './supabase/server'

// Déduplique auth.getUser() dans un même render (layout + page partagent le résultat)
export const getUserCached = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  console.log('[AUTH] getUser =>', user ? `✓ ${user.email}` : '✗ null', error ? `| err: ${error.message}` : '')
  return user
})

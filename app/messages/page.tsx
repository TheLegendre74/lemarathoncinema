import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MessagesLoader from './MessagesLoader'

export const revalidate = 0

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const supabase = await createClient()
  // getSession lit depuis le cookie — pas d'appel réseau Auth
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) redirect('/auth')

  const { with: withUserId } = await searchParams

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Messages privés</div>
        <div style={{ fontSize: '.8rem', color: 'var(--text3)', marginTop: '.4rem' }}>
          Tes conversations avec les autres marathoniens
        </div>
      </div>
      <MessagesLoader myId={session.user.id} initialWithId={withUserId ?? null} />
    </div>
  )
}

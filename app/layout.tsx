import type { Metadata } from 'next'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { ToastProvider } from '@/components/ToastProvider'
import EasterEggs from '@/components/EasterEggs'

export const metadata: Metadata = {
  title: 'Ciné Marathon',
  description: 'Le marathon cinématographique collaboratif',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <html lang="fr">
      <body>
        <ToastProvider>
          <EasterEggs />
          {user && profile ? (
            <div style={{ display: 'flex', minHeight: '100vh' }}>
              <Sidebar profile={profile} />
              <main className="main">
                {children}
              </main>
            </div>
          ) : (
            <>{children}</>
          )}
        </ToastProvider>
      </body>
    </html>
  )
}

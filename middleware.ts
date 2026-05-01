import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Toujours laisser passer : auth, API, fichiers statiques
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Mode invité : cookie posé par le bouton "Continuer en mode invité"
  const guestCookie = request.cookies.get('guest_mode')?.value
  if (guestCookie === '1') {
    return NextResponse.next()
  }

  // Pattern officiel Supabase SSR : il faut passer request dans NextResponse.next
  // ET mettre à jour les cookies sur les deux (request + response) pour que les
  // Server Components voient la session rafraîchie dans le même rendu.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 1. Mettre à jour les cookies sur la requête (pour les Server Components)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // 2. Recréer la réponse avec la requête mise à jour
          supabaseResponse = NextResponse.next({ request })
          // 3. Mettre à jour les cookies sur la réponse (pour le navigateur)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

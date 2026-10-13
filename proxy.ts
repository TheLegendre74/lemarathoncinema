import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routeAncienDomaine, buildRedirectUrl } from '@/lib/demenagement'

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const host = request.headers.get('host') ?? ''

  const decision = routeAncienDomaine({
    host,
    method: request.method,
    pathname,
    accept: request.headers.get('accept') ?? '',
    cookieDemenage: request.cookies.get('cm_demenage')?.value === '1',
  })

  if (decision === 'demenager') {
    const url = request.nextUrl.clone()
    url.pathname = '/demenagement/depart'
    url.searchParams.set('vers', pathname + search)
    return NextResponse.rewrite(url)
  }

  if (decision === 'rediriger') {
    return NextResponse.redirect(buildRedirectUrl(pathname, search), 308)
  }

  // Toujours laisser passer : auth, API, fichiers statiques
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Mode invité : cookie posé par le bouton "Continuer en mode invité"
  const isAuthPage = pathname === '/auth'
  const isAuthFlow = pathname.startsWith('/auth/')
  const guestCookie = request.cookies.get('guest_mode')?.value
  // Invités n'ont pas de session Supabase à rafraîchir — skip intentionnel
  if (guestCookie === '1' && !isAuthPage) {
    return NextResponse.next()
  }

  // Pattern officiel Supabase SSR : mettre à jour les cookies sur request ET response
  // pour que les Server Components voient la session rafraîchie dans le même rendu.
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (isAuthFlow) {
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

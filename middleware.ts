import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const hasSession = request.cookies.getAll().some(
    c => c.name.includes('-auth-token'),
  )

  if (!hasSession && pathname === '/') {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  if (hasSession && pathname === '/auth') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/auth'],
}

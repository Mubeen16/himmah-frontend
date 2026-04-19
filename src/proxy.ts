import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const path = request.nextUrl.pathname.replace(/\/$/, '') || '/'

  const allowsAnonymous =
    path === '/login' ||
    path === '/register' ||
    path === '/forgot-password' ||
    path === '/reset-password'

  if (!token && !allowsAnonymous) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Signed-in users do not need auth entry pages; still allow /reset-password (e.g. email link while a session exists).
  const redirectAuthedToHome =
    path === '/login' || path === '/register' || path === '/forgot-password'

  if (token && redirectAuthedToHome) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

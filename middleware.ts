import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_COOKIE = 'cgp_admin_session'
const PROTECTED_PREFIX = '/admin'
const LOGIN_PATH = '/admin/login'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /admin routes
  if (!pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next()
  }

  // Allow access to login page itself
  if (pathname === LOGIN_PATH) {
    // If already logged in, redirect to admin dashboard
    const session = request.cookies.get(ADMIN_COOKIE)
    if (session?.value === 'authenticated') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.next()
  }

  // Check auth cookie for all other /admin/* routes
  const session = request.cookies.get(ADMIN_COOKIE)
  if (session?.value !== 'authenticated') {
    const loginUrl = new URL(LOGIN_PATH, request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}

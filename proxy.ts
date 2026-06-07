import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from './lib/session'

const COOKIE_NAME = 'admin_session'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Admin pages and admin API routes require a valid session
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const token = req.cookies.get(COOKIE_NAME)?.value
    const valid = token ? await verifySessionToken(token) : false

    if (!valid) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const loginUrl = new URL('/admin-login', req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PUBLIC_PATHS = ['/login', '/api/auth/login']
const ADMIN_PATHS = ['/admin', '/api/admin']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('erp_session')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const session = await verifyToken(token)

  if (!session) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('erp_session')
    return response
  }

  // Allow stopping impersonation from within any session
  if (pathname === '/api/admin/impersonate' && request.method === 'DELETE') {
    return NextResponse.next()
  }

  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p))

  // /admin/* requires SUPERADMIN and not currently impersonating
  if (isAdminPath) {
    if (session.rol !== 'SUPERADMIN' || session.impersonatedBy) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // SUPERADMIN without impersonation goes to /admin
  if (session.rol === 'SUPERADMIN' && !session.impersonatedBy && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

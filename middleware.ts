import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminCookieName, verifyAdminToken } from './lib/admin-token';

function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith('/admin/login')) return false;
  if (pathname.startsWith('/api/admin/login')) return false;

  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_PASSWORD || process.env.ADMIN_COOKIE_SECRET;
  if (!secret) {
    // If not configured, block access rather than silently allow.
    return new NextResponse('Admin not configured (missing ADMIN_PASSWORD)', { status: 500 });
  }

  const cookieName = getAdminCookieName();
  const token = req.cookies.get(cookieName)?.value;

  const ok = token ? await verifyAdminToken(token, secret) : false;
  if (ok) {
    return NextResponse.next();
  }

  // Redirect UI requests, 401 API requests.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

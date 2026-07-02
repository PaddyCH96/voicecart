import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PAGES = [
  '/dashboard', '/video', '/settings', '/assets', '/subscription',
  '/record', '/preview', '/success',
];

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('vc_token')?.value;
  const path = req.nextUrl.pathname;

  const isAuthPage = path.startsWith('/login') || path.startsWith('/register');
  const isProtectedPage = PROTECTED_PAGES.some(p => path.startsWith(p));

  if (isAuthPage) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  if (isProtectedPage) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/video/:path*', '/settings/:path*', '/assets/:path*',
    '/subscription/:path*', '/record/:path*', '/preview/:path*', '/success/:path*',
    '/login', '/register',
  ],
};

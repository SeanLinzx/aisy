import { NextResponse, type NextRequest } from 'next/server';

const cookieName = process.env.COOKIE_NAME || 'ai_camp_token';

const PROTECTED_PREFIXES = ['/student', '/teacher', '/parent', '/admin'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const token = req.cookies.get(cookieName)?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/student/:path*', '/teacher/:path*', '/parent/:path*', '/admin/:path*'],
};

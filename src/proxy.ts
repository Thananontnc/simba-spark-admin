import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = (req.auth?.user as { role?: string } | undefined)?.role;
  const isAuthed = !!req.auth;
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isProtected = pathname.startsWith('/admin');

  // Only admins get bounced away from auth pages — non-admin sessions must be
  // able to reach /login to sign in again, otherwise /admin <-> /login loops.
  if (isAuthed && isAuthPage && role === 'admin') {
    return NextResponse.redirect(new URL('/admin', req.url));
  }
  if (!isAuthed && isProtected) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (isAuthed && isProtected && role !== 'admin') {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

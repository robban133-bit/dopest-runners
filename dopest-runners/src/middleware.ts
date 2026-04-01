// src/middleware.ts
// Edge middleware — fast, runs before every request.
// Reads a "__session" cookie (Firebase ID token) and enforces:
//   • /admin/*  → must be authenticated + isAdmin === true
//   • /(app)/*  → must be authenticated
//   • /(auth)/* → redirect to /home if already authenticated

import { NextRequest, NextResponse } from 'next/server';

// Paths that only require authentication (any logged-in user)
const PROTECTED = ['/home', '/checkin', '/stats', '/profile'];
// Paths that require admin role
const ADMIN_PATHS = ['/admin'];
// Auth pages (redirect away if already logged in)
const AUTH_PAGES = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read the session cookie set by our API on login
  const sessionCookie = request.cookies.get('__session')?.value;
  const isAdminCookie  = request.cookies.get('__isAdmin')?.value === 'true';

  const isAuthed = Boolean(sessionCookie);

  // ── Redirect logged-in users away from auth pages ────────────────────────
  if (AUTH_PAGES.some(p => pathname.startsWith(p)) && isAuthed) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // ── Protect admin routes ──────────────────────────────────────────────────
  if (ADMIN_PATHS.some(p => pathname.startsWith(p))) {
    if (!isAuthed) {
      return NextResponse.redirect(new URL('/login?from=admin', request.url));
    }
    if (!isAdminCookie) {
      // Authenticated but not admin — send home
      return NextResponse.redirect(new URL('/home', request.url));
    }
  }

  // ── Protect regular app routes ────────────────────────────────────────────
  if (PROTECTED.some(p => pathname.startsWith(p)) && !isAuthed) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ── Redirect root → login or home ─────────────────────────────────────────
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(isAuthed ? '/home' : '/login', request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|api).*)'],
};

// src/app/api/auth/verify-admin/route.ts
// Called after Firebase client-side login to set HttpOnly session cookies.
// This is what enables the Edge middleware to check auth without exposing tokens.

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    // Verify the ID token with Firebase Admin (validates signature + expiry)
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Check isAdmin custom claim set by seed-admin.ts
    const isAdmin = decoded.isAdmin === true;

    // Session cookie duration: 14 days
    const expiresMs = 14 * 24 * 60 * 60 * 1000;

    // Create a Firebase session cookie (HTTP-only, signed by Firebase)
    // This is more secure than the raw ID token (revocable, longer-lived)
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: expiresMs,
    });

    const response = NextResponse.json({ success: true, isAdmin });

    // __session: used by middleware to detect authentication
    response.cookies.set('__session', sessionCookie, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   expiresMs / 1000,
      path:     '/',
    });

    // __isAdmin: non-sensitive flag readable by edge middleware
    // The real authorization check uses the verified session cookie above
    response.cookies.set('__isAdmin', String(isAdmin), {
      httpOnly: false,          // Edge middleware needs to read this
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   expiresMs / 1000,
      path:     '/',
    });

    return response;
  } catch (err: any) {
    console.error('[verify-admin]', err.message);
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

// Clear session cookies on logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('__session');
  response.cookies.delete('__isAdmin');
  return response;
}

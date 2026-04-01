// src/app/api/session/route.ts
// Admin-only: create a new session and return a signed QR token.

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { generateSessionToken } from '@/lib/qr';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

async function requireAdmin(request: NextRequest): Promise<string | null> {
  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (!decoded.isAdmin) return null;
    return decoded.uid;
  } catch {
    return null;
  }
}

// ── Create session ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const adminUid = await requireAdmin(request);
  if (!adminUid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { date, location } = await request.json();

  if (!date || !location?.trim()) {
    return NextResponse.json({ error: 'date and location are required' }, { status: 400 });
  }

  // Create the session document
  const sessionRef = adminDb.collection('sessions').doc();
  const token      = generateSessionToken(sessionRef.id);

  // Token expires in 2 h — store expiry so UI can show countdown
  const tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  await sessionRef.set({
    id:               sessionRef.id,
    date:             date,
    location:         location.trim(),
    createdBy:        adminUid,
    token,
    tokenExpiresAt:   Timestamp.fromDate(tokenExpiresAt),
    participantCount: 0,
    createdAt:        FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    sessionId:      sessionRef.id,
    token,
    tokenExpiresAt: tokenExpiresAt.toISOString(),
  });
}

// ── List sessions ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const adminUid = await requireAdmin(request);
  if (!adminUid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snap = await adminDb
    .collection('sessions')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ sessions });
}

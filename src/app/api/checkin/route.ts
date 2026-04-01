// src/app/api/checkin/route.ts
// Validates a QR token and writes a check-in atomically.
// Security: server-side only — clients never touch Firestore directly for check-ins.

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { verifySessionToken } from '@/lib/qr';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

async function getAuthenticatedUid(request: NextRequest): Promise<string | null> {
  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  // 1. Authenticate the user
  const uid = await getAuthenticatedUid(request);
  if (!uid) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { token } = await request.json();

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'MISSING_TOKEN' }, { status: 400 });
  }

  // 2. Verify the JWT — throws if expired or tampered
  let payload: { sessionId: string };
  try {
    payload = verifySessionToken(token);
  } catch (err: any) {
    const isExpired = err.name === 'TokenExpiredError';
    return NextResponse.json(
      { error: isExpired ? 'QR_EXPIRED' : 'INVALID_QR' },
      { status: 400 }
    );
  }

  const { sessionId } = payload;

  // 3. Verify session exists in Firestore
  const sessionRef = adminDb.collection('sessions').doc(sessionId);
  const sessionSnap = await sessionRef.get();

  if (!sessionSnap.exists) {
    return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
  }

  // 4. Prevent duplicate check-in (compound query on userId + sessionId)
  const existingSnap = await adminDb
    .collection('checkins')
    .where('userId', '==', uid)
    .where('sessionId', '==', sessionId)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    return NextResponse.json({ error: 'ALREADY_CHECKED_IN' }, { status: 409 });
  }

  // 5. Atomic batch write
  const batch = adminDb.batch();

  // Create check-in record
  const checkinRef = adminDb.collection('checkins').doc();
  batch.set(checkinRef, {
    id:          checkinRef.id,
    userId:      uid,
    sessionId,
    checkedInAt: Timestamp.now(),
    method:      'qr',
  });

  // Increment session participant count
  batch.update(sessionRef, {
    participantCount: FieldValue.increment(1),
  });

  // Update user last-active + attendance counters
  const userRef = adminDb.collection('users').doc(uid);
  const currentYear = new Date().getFullYear();
  const sessionData = sessionSnap.data()!;
  const sessionYear = new Date(sessionData.date).getFullYear();

  batch.update(userRef, {
    totalAttendance: FieldValue.increment(1),
    ...(sessionYear === currentYear && { yearAttendance: FieldValue.increment(1) }),
    lastActive: Timestamp.now(),
  });

  await batch.commit();

  return NextResponse.json({
    success:   true,
    checkinId: checkinRef.id,
    sessionId,
    location:  sessionData.location,
    date:      sessionData.date,
  });
}

// Admin: remove a check-in
export async function DELETE(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let isAdmin = false;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    isAdmin = decoded.isAdmin === true;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { checkinId } = await request.json();
  if (!checkinId) return NextResponse.json({ error: 'checkinId required' }, { status: 400 });

  const checkinRef = adminDb.collection('checkins').doc(checkinId);
  const snap = await checkinRef.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const data = snap.data()!;

  const batch = adminDb.batch();
  batch.delete(checkinRef);
  batch.update(adminDb.collection('sessions').doc(data.sessionId), {
    participantCount: FieldValue.increment(-1),
  });
  batch.update(adminDb.collection('users').doc(data.userId), {
    totalAttendance: FieldValue.increment(-1),
  });

  await batch.commit();
  return NextResponse.json({ success: true });
}

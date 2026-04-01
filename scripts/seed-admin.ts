#!/usr/bin/env tsx
// scripts/seed-admin.ts
// Run ONCE to create the admin account in Firebase:
//   npx tsx scripts/seed-admin.ts
//
// SECURITY MODEL:
//   • Credentials come from environment variables — never hardcoded here.
//   • Firebase Auth stores the password as a bcrypt hash server-side.
//   • The Admin SDK is used so this can run in a trusted server/CI environment.
//   • The admin flag is written to Firestore, never derivable from the login alone.
//   • This script is safe to re-run — it checks for existing users first.

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth }      from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ── Bootstrap Admin SDK ──────────────────────────────────────────────────────
if (!getApps().length) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!privateKey || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PROJECT_ID) {
    console.error('\n❌  Missing Firebase Admin env vars.\n');
    console.error('    Ensure the following are set in .env.local:');
    console.error('    FIREBASE_ADMIN_PROJECT_ID');
    console.error('    FIREBASE_ADMIN_CLIENT_EMAIL');
    console.error('    FIREBASE_ADMIN_PRIVATE_KEY\n');
    process.exit(1);
  }
  initializeApp({ credential: cert({ projectId: process.env.FIREBASE_ADMIN_PROJECT_ID, clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL, privateKey }) });
}

const adminAuth = getAuth();
const adminDb   = getFirestore();

// ── Read credentials from env ────────────────────────────────────────────────
const ADMIN_EMAIL    = process.env.ADMIN_SEED_EMAIL    || '7178058@dopestrunners.app';
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || '7178058';
const ADMIN_NAME     = process.env.ADMIN_SEED_NAME     || 'Head Admin';

// ── Seed ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱  Seeding admin account…');
  console.log(`    Email: ${ADMIN_EMAIL}`);
  console.log('    Password: [from ADMIN_SEED_PASSWORD env var]\n');

  let uid: string;

  // Check if user already exists in Firebase Auth
  try {
    const existing = await adminAuth.getUserByEmail(ADMIN_EMAIL);
    uid = existing.uid;
    console.log(`ℹ️   Firebase Auth user already exists (uid: ${uid}).`);
    console.log('    Updating password to current ADMIN_SEED_PASSWORD value…');
    await adminAuth.updateUser(uid, { password: ADMIN_PASSWORD });
    console.log('    ✓ Password updated.');
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      // Create new user — Firebase Auth hashes the password (bcrypt + salt)
      const userRecord = await adminAuth.createUser({
        email:         ADMIN_EMAIL,
        password:      ADMIN_PASSWORD,
        displayName:   ADMIN_NAME,
        emailVerified: true,
      });
      uid = userRecord.uid;
      console.log(`✓  Firebase Auth user created (uid: ${uid}).`);
    } else {
      throw err;
    }
  }

  // Write / update Firestore profile with isAdmin: true
  const userRef = adminDb.collection('users').doc(uid);
  const snap    = await userRef.get();

  if (snap.exists) {
    await userRef.update({
      isAdmin:    true,
      name:       ADMIN_NAME,
      lastActive: FieldValue.serverTimestamp(),
    });
    console.log('✓  Firestore profile updated (isAdmin: true).');
  } else {
    await userRef.set({
      uid,
      email:           ADMIN_EMAIL,
      name:            ADMIN_NAME,
      age:             0,
      goal:            'Run the community',
      level:           10,
      avatarUrl:       null,
      isAdmin:         true,
      totalAttendance: 0,
      yearAttendance:  0,
      streak:          0,
      startDate:       new Date().toISOString().split('T')[0],
      createdAt:       FieldValue.serverTimestamp(),
      lastActive:      FieldValue.serverTimestamp(),
    });
    console.log('✓  Firestore profile created (isAdmin: true).');
  }

  // Set a custom claim so middleware can verify admin role from ID token
  await adminAuth.setCustomUserClaims(uid, { isAdmin: true });
  console.log('✓  Custom claim "isAdmin: true" set on Firebase Auth token.');

  console.log('\n✅  Admin account ready.');
  console.log(`    Login at /login with identifier: 7178058`);
  console.log(`    (App maps "7178058" → "${ADMIN_EMAIL}" automatically)\n`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});

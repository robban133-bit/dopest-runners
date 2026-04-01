// src/lib/auth.ts
// Client-side auth helpers — all auth flows go through Firebase Auth
// Passwords are never stored or transmitted in plain text by this app;
// Firebase Auth handles all credential hashing server-side over TLS.

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  User,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import {
  ref, uploadBytes, getDownloadURL,
} from 'firebase/storage';
import { auth, db, storage } from './firebase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid:              string;
  email:            string;
  name:             string;
  age:              number;
  goal:             string;
  level:            number;           // 1–10
  avatarUrl:        string | null;
  isAdmin:          boolean;
  totalAttendance:  number;
  yearAttendance:   number;
  streak:           number;
  startDate:        string;           // ISO date string
  createdAt:        Timestamp | null;
  lastActive:       Timestamp | null;
}

export interface RegisterData {
  email:    string;
  password: string;
  name:     string;
  age:      number;
  goal:     string;
  level:    number;
}

// ─── Login ───────────────────────────────────────────────────────────────────

/**
 * Log in with email + password.
 * For the admin account: email is "7178058@dopestrunners.app", password "7178058".
 * The app login form accepts the shorthand "7178058" as the identifier and
 * appends the domain automatically if no "@" is present.
 */
export async function loginUser(identifier: string, password: string): Promise<UserProfile> {
  const email = identifier.includes('@')
    ? identifier
    : `${identifier}@dopestrunners.app`;

  const { user } = await signInWithEmailAndPassword(auth, email, password);
  const profile = await fetchUserProfile(user.uid);

  // Update last-active timestamp
  await updateDoc(doc(db, 'users', user.uid), { lastActive: serverTimestamp() });

  return profile;
}

// ─── Register ────────────────────────────────────────────────────────────────

export async function registerUser(data: RegisterData): Promise<UserProfile> {
  const { user } = await createUserWithEmailAndPassword(auth, data.email, data.password);

  const now = new Date().toISOString().split('T')[0];

  const profile: Omit<UserProfile, 'createdAt' | 'lastActive'> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    lastActive: ReturnType<typeof serverTimestamp>;
  } = {
    uid:             user.uid,
    email:           data.email,
    name:            data.name,
    age:             data.age,
    goal:            data.goal,
    level:           data.level,
    avatarUrl:       null,
    isAdmin:         false,           // never set via client
    totalAttendance: 0,
    yearAttendance:  0,
    streak:          0,
    startDate:       now,
    createdAt:       serverTimestamp(),
    lastActive:      serverTimestamp(),
  };

  await setDoc(doc(db, 'users', user.uid), profile);

  return { ...profile, createdAt: null, lastActive: null };
}

// ─── Fetch Profile ────────────────────────────────────────────────────────────

export async function fetchUserProfile(uid: string): Promise<UserProfile> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) throw new Error('User profile not found');
  return snap.data() as UserProfile;
}

// ─── Update Profile ───────────────────────────────────────────────────────────

export interface ProfileUpdateData {
  name?:     string;
  age?:      number;
  goal?:     string;
  level?:    number;
  avatar?:   File;
}

export async function updateUserProfile(
  uid: string,
  updates: ProfileUpdateData,
): Promise<Partial<UserProfile>> {
  const payload: Partial<UserProfile> = {};

  if (updates.name  !== undefined) payload.name  = updates.name;
  if (updates.age   !== undefined) payload.age   = updates.age;
  if (updates.goal  !== undefined) payload.goal  = updates.goal;
  if (updates.level !== undefined) payload.level = updates.level;

  if (updates.avatar) {
    const storageRef = ref(storage, `avatars/${uid}`);
    await uploadBytes(storageRef, updates.avatar, {
      contentType: updates.avatar.type,
    });
    payload.avatarUrl = await getDownloadURL(storageRef);
  }

  await updateDoc(doc(db, 'users', uid), payload as Record<string, unknown>);
  return payload;
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// ─── Change Password ─────────────────────────────────────────────────────────

export async function changePassword(
  user: User,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const credential = EmailAuthProvider.credential(user.email!, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

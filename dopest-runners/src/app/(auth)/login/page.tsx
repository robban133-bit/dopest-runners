'use client';
// src/app/(auth)/login/page.tsx
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getIdToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { loginUser } from '@/lib/auth';
import { SocialLinks, useToast, Toast } from '@/components/ui';

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const fromAdmin    = searchParams.get('from') === 'admin';

  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const { toast, notify } = useToast();

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await loginUser(identifier.trim(), password);

      // Exchange Firebase ID token for a session cookie
      const firebaseUser = auth.currentUser!;
      const idToken      = await getIdToken(firebaseUser);

      const res = await fetch('/api/auth/verify-admin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ idToken }),
      });

      if (!res.ok) throw new Error('Session creation failed');

      const { isAdmin } = await res.json();
      router.replace(isAdmin ? '/admin' : '/home');
    } catch (err: any) {
      const code = err?.code || '';
      if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
        setError('Invalid username or password.');
      } else {
        setError('Login failed. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
      {toast && <Toast {...toast} />}

      <div style={{ flex: 1, paddingTop: 70 }}>
        {/* Brand */}
        <div style={{ marginBottom: 52 }}>
          <div style={{
            display: 'inline-block', background: 'var(--accent)', color: '#000',
            padding: '3px 10px', fontFamily: 'var(--font-mono)',
            fontSize: 10, letterSpacing: '0.12em', marginBottom: 18,
          }}>
            {fromAdmin ? 'ADMIN ACCESS' : 'STHLM RUNNING COMMUNITY'}
          </div>
          <h1 className="hd" style={{ fontSize: 80, lineHeight: 0.88, letterSpacing: '0.02em' }}>
            DOPEST<br />RUNNERS
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
            <div style={{ width: 48, height: 3, background: 'var(--accent)' }} />
            <span className="mn" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em' }}>EST. 2020</span>
          </div>
        </div>

        {fromAdmin && (
          <div style={{
            marginBottom: 20, padding: '12px 16px',
            border: '1px solid var(--accent)', background: '#CDFF0008',
          }}>
            <p className="mn" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.06em' }}>
              ADMIN LOGIN — ENTER YOUR ADMIN CREDENTIALS
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            className="inp" type="text"
            placeholder={fromAdmin ? 'ADMIN ID' : 'EMAIL OR ID'}
            value={identifier}
            onChange={e => { setIdentifier(e.target.value); setError(''); }}
            autoComplete="username"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.06em' }}
          />
          <input
            className="inp" type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            autoComplete="current-password"
          />
          {error && <p className="inp-error">{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 6 }}>
            {loading ? 'LOGGING IN...' : 'LOG IN'}
          </button>

          {!fromAdmin && (
            <button
              className="btn btn-outline" type="button"
              onClick={() => router.push('/register')}
            >
              CREATE ACCOUNT
            </button>
          )}
        </form>
      </div>

      {!fromAdmin && (
        <div style={{ padding: '20px 0 28px' }}>
          <SocialLinks />
        </div>
      )}
    </div>
  );
}

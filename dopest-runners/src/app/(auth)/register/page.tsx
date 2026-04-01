'use client';
// src/app/(auth)/register/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getIdToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { registerUser } from '@/lib/auth';
import { LevelDisplay, LevelPicker, useToast, Toast } from '@/components/ui';

type Step = 1 | 2 | 3;

interface FormData {
  name:     string;
  email:    string;
  password: string;
  age:      string;
  goal:     string;
  level:    number;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep]     = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const { toast, notify }   = useToast();
  const [data, setData]     = useState<FormData>({
    name: '', email: '', password: '', age: '', goal: '', level: 5,
  });

  const upd = (k: keyof FormData, v: string | number) => {
    setData(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validateStep1 = () => {
    const e: Partial<FormData> = {};
    if (!data.name.trim())               e.name     = 'Name required';
    if (!data.email.includes('@'))        e.email    = 'Valid email required';
    if (data.password.length < 6)         e.password = 'Min 6 characters';
    if (!data.age || +data.age < 10 || +data.age > 100) e.age = 'Enter a valid age';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const validateStep2 = () => {
    const e: Partial<FormData> = {};
    if (!data.goal.trim()) e.goal = 'Tell us your running goal';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      await registerUser({
        email:    data.email,
        password: data.password,
        name:     data.name,
        age:      Number(data.age),
        goal:     data.goal,
        level:    data.level,
      });

      const firebaseUser = auth.currentUser!;
      const idToken      = await getIdToken(firebaseUser);
      await fetch('/api/auth/verify-admin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ idToken }),
      });

      router.replace('/home');
    } catch (err: any) {
      const msg = err?.code === 'auth/email-already-in-use'
        ? 'That email is already registered.'
        : 'Registration failed. Please try again.';
      notify(msg, 'error');
      setStep(1);
      setLoading(false);
    }
  };

  const BORDER = 'var(--border)';
  const A      = 'var(--accent)';
  const MUTED  = 'var(--muted)';

  return (
    <div style={{ minHeight: '100vh', padding: '0 24px 40px' }}>
      {toast && <Toast {...toast} />}

      {/* Header */}
      <div style={{ paddingTop: 60, marginBottom: 36 }}>
        <button
          onClick={() => step === 1 ? router.push('/login') : setStep((step - 1) as Step)}
          style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 12, padding: 0, marginBottom: 24, letterSpacing: '0.06em' }}>
          ← {step === 1 ? 'BACK TO LOGIN' : 'PREVIOUS STEP'}
        </button>

        {/* Step progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
          {([1,2,3] as Step[]).map(i => (
            <div key={i} style={{ flex: 1, height: 3, background: i <= step ? A : BORDER, transition: 'background 0.3s' }} />
          ))}
        </div>

        <div className="tag">{['BASIC INFO', 'RUNNING PROFILE', 'WELCOME'][step - 1]}</div>
        <h1 className="hd" style={{ fontSize: 52, marginTop: 10, lineHeight: 0.9 }}>
          {step === 1 ? <>CREATE<br />ACCOUNT</> : step === 2 ? <>YOUR<br />PROFILE</> : <>YOU'RE<br />IN</>}
        </h1>
      </div>

      {/* ── Step 1: Basic info ─────────────────────────────────── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {([
            { key: 'name' as const,     type: 'text',     ph: 'FULL NAME' },
            { key: 'email' as const,    type: 'email',    ph: 'EMAIL ADDRESS' },
            { key: 'password' as const, type: 'password', ph: 'PASSWORD (MIN 6 CHARS)' },
            { key: 'age' as const,      type: 'number',   ph: 'AGE' },
          ]).map(f => (
            <div key={f.key}>
              <input
                className={`inp${errors[f.key] ? ' error' : ''}`}
                type={f.type} placeholder={f.ph}
                value={String(data[f.key])}
                onChange={e => upd(f.key, e.target.value)}
                autoComplete={f.key === 'password' ? 'new-password' : f.key}
              />
              {errors[f.key] && <p className="inp-error">{errors[f.key]}</p>}
            </div>
          ))}
          <button className="btn btn-primary" style={{ marginTop: 10 }}
            onClick={() => validateStep1() && setStep(2)}>
            CONTINUE →
          </button>
        </div>
      )}

      {/* ── Step 2: Running profile ────────────────────────────── */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div>
            <label className="inp-label">YOUR RUNNING GOAL</label>
            <textarea
              className={`inp${errors.goal ? ' error' : ''}`} rows={3}
              placeholder="e.g. Run a marathon, improve 5K, lose weight..."
              value={data.goal} onChange={e => upd('goal', e.target.value)}
              style={{ resize: 'none' }}
            />
            {errors.goal && <p className="inp-error">{errors.goal}</p>}
          </div>
          <div>
            <label className="inp-label">SELF-ASSESSMENT — LEVEL {data.level}/10</label>
            <LevelPicker value={data.level} onChange={v => upd('level', v)} />
          </div>
          <button className="btn btn-primary" onClick={() => validateStep2() && setStep(3)}>
            JOIN THE CREW →
          </button>
        </div>
      )}

      {/* ── Step 3: Welcome ────────────────────────────────────── */}
      {step === 3 && (
        <div style={{ textAlign: 'center', paddingTop: 12 }}>
          <div style={{ fontSize: 56, marginBottom: 24 }}>🏃</div>
          <h2 className="hd" style={{ fontSize: 52, marginBottom: 16 }}>
            LET'S RUN,<br />
            <span style={{ color: A }}>{data.name.split(' ')[0].toUpperCase()}</span>
          </h2>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
            Your account is ready.<br />Show up. Scan in. Level up.
          </p>
          <div className="card" style={{ marginBottom: 20, textAlign: 'left' }}>
            <div className="mn" style={{ fontSize: 10, color: MUTED, marginBottom: 8, letterSpacing: '0.08em' }}>YOUR GOAL</div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>{data.goal}</div>
          </div>
          <LevelDisplay level={data.level} />
          <button className="btn btn-primary" style={{ marginTop: 32 }}
            disabled={loading} onClick={handleRegister}>
            {loading ? 'CREATING ACCOUNT...' : 'ENTER THE APP'}
          </button>
        </div>
      )}
    </div>
  );
}

'use client';
// src/app/(app)/checkin/page.tsx
import { useState, useEffect, useRef } from 'react';
import { PageHeader, useToast, Toast } from '@/components/ui';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const A      = 'var(--accent)';
const BORDER = 'var(--border)';
const MUTED  = 'var(--muted)';

type Status = 'idle' | 'scanning' | 'success' | 'duplicate' | 'error';

interface CheckinResult {
  location: string;
  date:     string;
}

export default function CheckinPage() {
  const { toast, notify } = useToast();
  const [status,   setStatus]  = useState<Status>('idle');
  const [result,   setResult]  = useState<CheckinResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [nextSession, setNextSession] = useState<any>(null);

  // html5-qrcode scanner reference
  const scannerRef = useRef<any>(null);
  const scannerDivId = 'qr-reader';

  useEffect(() => {
    loadNextSession();
    return () => { stopScanner(); };
  }, []);

  const loadNextSession = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'sessions'), orderBy('createdAt', 'desc'), limit(1))
      );
      if (!snap.empty) setNextSession({ id: snap.docs[0].id, ...snap.docs[0].data() });
    } catch { /* ignore */ }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
  };

  const startScanner = async () => {
    setStatus('scanning');
    try {
      // Dynamically import to avoid SSR issues
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScanner();
          await processToken(decodedText);
        },
        undefined
      );
    } catch (err: any) {
      setStatus('idle');
      notify('Camera access denied. Please allow camera permissions.', 'error');
    }
  };

  const processToken = async (token: string) => {
    try {
      const res = await fetch('/api/checkin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ location: data.location, date: data.date });
        setStatus('success');
        notify('CHECKED IN! KEEP RUNNING 🏃');
      } else {
        switch (data.error) {
          case 'ALREADY_CHECKED_IN': setStatus('duplicate'); break;
          case 'QR_EXPIRED':
            setErrorMsg('This QR code has expired. Ask the admin to regenerate it.');
            setStatus('error');
            break;
          default:
            setErrorMsg('Invalid QR code. Make sure you are scanning the correct session.');
            setStatus('error');
        }
      }
    } catch {
      setErrorMsg('Check-in failed. Check your connection and try again.');
      setStatus('error');
    }
  };

  // Simulate scan for development/demo (no camera required)
  const simulateScan = async () => {
    if (!nextSession?.token) {
      notify('No active session found', 'error');
      return;
    }
    setStatus('scanning');
    await new Promise(r => setTimeout(r, 2000));
    await processToken(nextSession.token);
  };

  const reset = async () => {
    await stopScanner();
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();

  /* ── Success state ────────────────────────────────────────── */
  if (status === 'success') return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', minHeight: 'calc(100vh - 80px)' }}>
      {toast && <Toast {...toast} />}
      <div style={{ textAlign: 'center', animation: 'popIn 0.35s ease' }}>
        <div style={{ width: 96, height: 96, border: `3px solid ${A}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46, margin: '0 auto 30px' }}>✓</div>
        <h1 className="hd" style={{ fontSize: 56, color: A, marginBottom: 6 }}>CHECK-IN<br />CONFIRMED</h1>
        <div className="mn" style={{ fontSize: 11, color: MUTED, lineHeight: 1.9, marginBottom: 36, letterSpacing: '0.08em' }}>
          {result?.location?.toUpperCase()}<br />{result ? fmt(result.date) : ''}
        </div>
        <button className="btn btn-outline" onClick={reset} style={{ maxWidth: 240, margin: '0 auto' }}>DONE</button>
      </div>
    </div>
  );

  /* ── Duplicate state ─────────────────────────────────────── */
  if (status === 'duplicate') return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 96, height: 96, border: '3px solid var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 30px' }}>✕</div>
        <h1 className="hd" style={{ fontSize: 48, color: 'var(--danger)', marginBottom: 10 }}>ALREADY<br />CHECKED IN</h1>
        <p style={{ color: MUTED, fontSize: 13, marginBottom: 36 }}>You have already attended this session.</p>
        <button className="btn btn-outline" onClick={reset} style={{ maxWidth: 240, margin: '0 auto' }}>BACK</button>
      </div>
    </div>
  );

  /* ── Error state ─────────────────────────────────────────── */
  if (status === 'error') return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 96, height: 96, border: '3px solid var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 30px' }}>!</div>
        <h1 className="hd" style={{ fontSize: 48, color: 'var(--danger)', marginBottom: 10 }}>CHECK-IN<br />FAILED</h1>
        <p style={{ color: MUTED, fontSize: 13, marginBottom: 36, maxWidth: 260, margin: '0 auto 36px' }}>{errorMsg}</p>
        <button className="btn btn-outline" onClick={reset} style={{ maxWidth: 240, margin: '0 auto' }}>TRY AGAIN</button>
      </div>
    </div>
  );

  const scanning = status === 'scanning';

  return (
    <div className="screen">
      {toast && <Toast {...toast} />}
      <PageHeader
        title="QR CHECK-IN"
        sub={`TODAY — ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}`}
      />
      <div style={{ padding: '28px 24px' }}>

        {/* Camera viewport */}
        <div style={{
          position: 'relative', width: '100%', paddingBottom: scanning ? '0' : '96%',
          background: '#050505', border: `1px solid ${scanning ? A : BORDER}`,
          overflow: 'hidden', marginBottom: 22,
          transition: 'border-color 0.4s',
          boxShadow: scanning ? `0 0 20px ${A}22` : 'none',
          minHeight: scanning ? 320 : undefined,
        }}>
          {/* QR reader target div — html5-qrcode mounts here */}
          <div id={scannerDivId} style={{ width: '100%', height: scanning ? 320 : 0 }} />

          {/* Corner brackets (shown when not scanning) */}
          {!scanning && (
            <>
              {([[{ top: 0, left: 0 }, 'borderTop', 'borderLeft'],
                 [{ top: 0, right: 0 }, 'borderTop', 'borderRight'],
                 [{ bottom: 0, left: 0 }, 'borderBottom', 'borderLeft'],
                 [{ bottom: 0, right: 0 }, 'borderBottom', 'borderRight'],
              ] as any[]).map(([pos, b1, b2]: any, i: number) => (
                <div key={i} style={{ position: 'absolute', width: 26, height: 26, [b1]: `2px solid #2a2a2a`, [b2]: `2px solid #2a2a2a`, ...pos }} />
              ))}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                <div style={{ fontSize: 38, opacity: 0.12, marginBottom: 10 }}>⬛</div>
                <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.09em', lineHeight: 2 }}>
                  TAP BELOW TO SCAN<br />SESSION QR CODE
                </div>
              </div>
            </>
          )}
        </div>

        {/* Upcoming session info */}
        {nextSession && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.08em', marginBottom: 8 }}>UPCOMING SESSION</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{nextSession.location}</div>
            <div className="mn" style={{ fontSize: 11, color: MUTED }}>
              {fmt(nextSession.date)} · {nextSession.participantCount ?? 0} CHECKED IN
            </div>
          </div>
        )}

        {/* Scan button */}
        <button
          className="btn btn-primary" disabled={scanning}
          onClick={startScanner}
          style={{ marginBottom: 10 }}
        >
          {scanning ? 'SCANNING...' : '📷  SCAN QR CODE'}
        </button>

        {/* Demo button — only in dev or when no camera available */}
        <button className="btn btn-ghost" onClick={simulateScan} disabled={scanning}>
          SIMULATE SCAN (DEMO)
        </button>

        <p className="mn" style={{ textAlign: 'center', fontSize: 10, color: '#2e2e2e', marginTop: 14, lineHeight: 1.9, letterSpacing: '0.06em' }}>
          QR CODES ARE TIME-LIMITED · UNIQUE PER SESSION<br />
          DUPLICATE CHECK-INS ARE AUTOMATICALLY BLOCKED
        </p>
      </div>
    </div>
  );
}

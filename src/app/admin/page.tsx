'use client';
// src/app/admin/page.tsx
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { logoutUser } from '@/lib/auth';
import { PageHeader, useToast, Toast, Spinner, Avatar } from '@/components/ui';

const A      = 'var(--accent)';
const BORDER = 'var(--border)';
const MUTED  = 'var(--muted)';

type Tab = 'sessions' | 'qr' | 'users';

interface Session {
  id: string; date: string; location: string;
  participantCount: number; token: string; tokenExpiresAt?: string;
}
interface UserRow {
  uid: string; name: string; email: string;
  totalAttendance: number; lastActive: any; level: number; avatarUrl?: string;
}
interface Checkin {
  id: string; userId: string; sessionId: string;
  checkedInAt: any; userName?: string;
}

export default function AdminPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const { toast, notify } = useToast();

  const [tab, setTab]                   = useState<Tab>('sessions');
  const [sessions, setSessions]         = useState<Session[]>([]);
  const [users, setUsers]               = useState<UserRow[]>([]);
  const [checkins, setCheckins]         = useState<Checkin[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [activeQR, setActiveQR]         = useState<string | null>(null);
  const [formDate, setFormDate]         = useState('');
  const [formLoc, setFormLoc]           = useState('');
  const [formErr, setFormErr]           = useState<{ date?: string; location?: string }>({});
  const [creating, setCreating]         = useState(false);
  const [dataLoading, setDataLoading]   = useState(true);

  // Guard: non-admins get bounced
  useEffect(() => {
    if (!loading && (!profile || !profile.isAdmin)) {
      router.replace('/home');
    }
  }, [loading, profile, router]);

  useEffect(() => {
    if (profile?.isAdmin) loadAll();
  }, [profile]);

  const loadAll = async () => {
    setDataLoading(true);
    try {
      const [sessSnap, userSnap] = await Promise.all([
        getDocs(query(collection(db, 'sessions'), orderBy('createdAt', 'desc'), limit(50))),
        getDocs(query(collection(db, 'users'), orderBy('totalAttendance', 'desc'), limit(100))),
      ]);
      setSessions(sessSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session)));
      setUsers(userSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserRow)));
    } catch (err) {
      notify('Failed to load data', 'error');
    }
    setDataLoading(false);
  };

  const loadCheckins = async (sessionId: string) => {
    const snap = await getDocs(
      query(collection(db, 'checkins'), where('sessionId', '==', sessionId))
    );
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as Checkin));
    // Annotate with names
    const annotated = rows.map(c => ({
      ...c,
      userName: users.find(u => u.uid === c.userId)?.name ?? c.userId,
    }));
    setCheckins(annotated);
  };

  const openSession = async (s: Session) => {
    setSelectedSession(s);
    setActiveQR(s.token);
    setTab('qr');
    await loadCheckins(s.id);
  };

  const createSession = async () => {
    const e: typeof formErr = {};
    if (!formDate)         e.date     = 'Select a date';
    if (!formLoc.trim())   e.location = 'Enter a location';
    setFormErr(e);
    if (Object.keys(e).length) return;

    setCreating(true);
    try {
      const res = await fetch('/api/session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: formDate, location: formLoc.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());

      const { sessionId, token, tokenExpiresAt } = await res.json();
      const newSession: Session = {
        id: sessionId, date: formDate, location: formLoc.trim(),
        participantCount: 0, token, tokenExpiresAt,
      };
      setSessions(p => [newSession, ...p]);
      setFormDate(''); setFormLoc(''); setFormErr({});
      setSelectedSession(newSession);
      setActiveQR(token);
      setCheckins([]);
      setTab('qr');
      notify('SESSION CREATED + QR GENERATED ✓');
    } catch {
      notify('Failed to create session', 'error');
    }
    setCreating(false);
  };

  const removeCheckin = async (checkinId: string) => {
    try {
      const res = await fetch('/api/checkin', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ checkinId }),
      });
      if (!res.ok) throw new Error();
      setCheckins(p => p.filter(c => c.id !== checkinId));
      setSessions(p => p.map(s =>
        s.id === selectedSession?.id
          ? { ...s, participantCount: Math.max(0, s.participantCount - 1) }
          : s
      ));
      notify('CHECK-IN REMOVED ✓');
    } catch {
      notify('Failed to remove check-in', 'error');
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    await fetch('/api/auth/verify-admin', { method: 'DELETE' });
    router.replace('/login');
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  const fmtTs = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate?.() ?? new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  };

  const qrImageUrl = (token: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(token)}&bgcolor=000000&color=cdff00&margin=8`;

  const isExpired = selectedSession?.tokenExpiresAt
    ? new Date(selectedSession.tokenExpiresAt) < new Date()
    : false;

  if (loading || dataLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={28} />
    </div>
  );

  if (!profile?.isAdmin) return null;

  return (
    <div className="screen" style={{ paddingBottom: 0 }}>
      {toast && <Toast {...toast} />}

      {/* Admin top bar */}
      <div style={{ padding: '24px 24px 0', borderBottom: `1px solid ${BORDER}`, paddingBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{
              display: 'inline-block', background: A, color: '#000',
              padding: '3px 10px', fontFamily: 'var(--font-mono)',
              fontSize: 9, letterSpacing: '0.12em', marginBottom: 10,
            }}>ADMIN PANEL</div>
            <h1 className="hd" style={{ fontSize: 34, lineHeight: 1 }}>DOPEST RUNNERS</h1>
            <p className="mn" style={{ fontSize: 11, color: MUTED, marginTop: 4, letterSpacing: '0.06em' }}>
              {profile.name.toUpperCase()} · HQ
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => router.push('/home')} style={{
              background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED,
              padding: '7px 12px', cursor: 'pointer', fontFamily: 'var(--font-display)',
              fontSize: 12, letterSpacing: '0.08em',
            }}>← APP</button>
            <button onClick={handleLogout} style={{
              background: 'transparent', border: '1px solid #2a1010', color: 'var(--danger)',
              padding: '7px 12px', cursor: 'pointer', fontFamily: 'var(--font-display)',
              fontSize: 12, letterSpacing: '0.08em',
            }}>LOG OUT</button>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', padding: '0 24px', gap: 0, borderBottom: `1px solid ${BORDER}` }}>
        {[
          { label: 'SESSIONS', value: sessions.length },
          { label: 'MEMBERS',  value: users.length    },
          { label: 'TOTAL RUNS', value: users.reduce((s, u) => s + u.totalAttendance, 0) },
        ].map((item, i) => (
          <div key={i} style={{
            flex: 1, padding: '16px 0', textAlign: 'center',
            borderRight: i < 2 ? `1px solid ${BORDER}` : 'none',
          }}>
            <div className="hd" style={{ fontSize: 28, color: A }}>{item.value}</div>
            <div className="mn" style={{ fontSize: 9, color: MUTED, letterSpacing: '0.08em' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-row">
        {(['sessions', 'qr', 'users'] as Tab[]).map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'sessions' ? 'SESSIONS' : t === 'qr' ? 'QR CODE' : 'MEMBERS'}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px', paddingBottom: 100 }}>

        {/* ── SESSIONS ────────────────────────────────────────── */}
        {tab === 'sessions' && (
          <>
            {/* Create form */}
            <div className="card" style={{ marginBottom: 28 }}>
              <div className="hd" style={{ fontSize: 20, color: A, marginBottom: 14 }}>+ NEW SESSION</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <input className={`inp${formErr.date ? ' error' : ''}`} type="date"
                    value={formDate} onChange={e => { setFormDate(e.target.value); setFormErr(p => ({ ...p, date: '' })); }} />
                  {formErr.date && <p className="inp-error">{formErr.date}</p>}
                </div>
                <div>
                  <input className={`inp${formErr.location ? ' error' : ''}`} placeholder="LOCATION / ROUTE"
                    value={formLoc} onChange={e => { setFormLoc(e.target.value); setFormErr(p => ({ ...p, location: '' })); }}
                    onKeyDown={e => e.key === 'Enter' && createSession()} />
                  {formErr.location && <p className="inp-error">{formErr.location}</p>}
                </div>
                <button className="btn btn-primary" onClick={createSession} disabled={creating}>
                  {creating ? 'CREATING...' : 'CREATE SESSION + GENERATE QR'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 className="hd" style={{ fontSize: 22 }}>ALL SESSIONS</h2>
              <span className="mn" style={{ fontSize: 10, color: MUTED }}>{sessions.length} TOTAL</span>
            </div>

            {sessions.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: `1px solid #161616` }}>
                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => openSession(s)}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{s.location}</div>
                  <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.06em' }}>{fmt(s.date)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="hd" style={{ fontSize: 26, color: A }}>{s.participantCount}</div>
                    <div className="mn" style={{ fontSize: 9, color: MUTED }}>RUNNERS</div>
                  </div>
                  <button onClick={() => openSession(s)} style={{
                    background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED,
                    padding: '6px 10px', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                    fontSize: 9, letterSpacing: '0.06em',
                  }}>QR</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── QR CODE ─────────────────────────────────────────── */}
        {tab === 'qr' && (
          <>
            <div className="hd" style={{ fontSize: 24, marginBottom: 6 }}>SESSION QR CODE</div>
            <div className="mn" style={{ fontSize: 10, color: MUTED, marginBottom: 24, lineHeight: 1.9, letterSpacing: '0.07em' }}>
              TIME-LIMITED · UNIQUE PER SESSION<br />
              SHARE ON SCREEN AT THE START OF EACH RUN
            </div>

            {activeQR && selectedSession ? (
              <div style={{ textAlign: 'center' }}>
                {/* Session info */}
                <div className="card" style={{ marginBottom: 18, textAlign: 'left' }}>
                  <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.08em', marginBottom: 6 }}>
                    ACTIVE SESSION
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 3 }}>{selectedSession.location}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="mn" style={{ fontSize: 10, color: MUTED }}>{fmt(selectedSession.date)}</div>
                    {isExpired && (
                      <span style={{ background: 'var(--danger)', color: '#fff', padding: '2px 8px', fontFamily: 'var(--font-mono)', fontSize: 9 }}>
                        QR EXPIRED
                      </span>
                    )}
                  </div>
                </div>

                {/* QR image */}
                <div style={{
                  display: 'inline-block',
                  border: `3px solid ${isExpired ? 'var(--danger)' : A}`,
                  padding: 14, marginBottom: 20,
                  opacity: isExpired ? 0.5 : 1,
                }}>
                  <img
                    src={qrImageUrl(activeQR)}
                    alt="Session QR Code"
                    style={{ display: 'block', width: 240, height: 240 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>

                {isExpired && (
                  <div style={{ marginBottom: 16, padding: '12px', background: '#ff444408', border: '1px solid var(--danger)' }}>
                    <p className="mn" style={{ fontSize: 10, color: 'var(--danger)', letterSpacing: '0.06em' }}>
                      THIS QR CODE HAS EXPIRED (2H LIMIT)<br />
                      CREATE A NEW SESSION TO GENERATE A FRESH CODE
                    </p>
                  </div>
                )}

                {/* Checkins list */}
                {checkins.length > 0 && (
                  <div style={{ textAlign: 'left', marginBottom: 20 }}>
                    <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.08em', marginBottom: 12 }}>
                      CHECK-INS ({checkins.length})
                    </div>
                    {checkins.map(c => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid #161616` }}>
                        <div style={{ fontSize: 13 }}>{c.userName}</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div className="mn" style={{ fontSize: 9, color: MUTED }}>{fmtTs(c.checkedInAt)}</div>
                          <button onClick={() => removeCheckin(c.id)} style={{
                            background: 'transparent', border: '1px solid #2a1010', color: 'var(--danger)',
                            padding: '4px 8px', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                            fontSize: 9, letterSpacing: '0.04em',
                          }}>REMOVE</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {checkins.length === 0 && (
                  <div className="mn" style={{ fontSize: 10, color: '#2a2a2a', marginBottom: 20, letterSpacing: '0.08em' }}>
                    NO CHECK-INS YET — SHARE THE QR TO GET STARTED
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-outline" onClick={() => { setActiveQR(null); setSelectedSession(null); setCheckins([]); }}>
                    CLOSE
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '56px 20px', textAlign: 'center', border: `1px dashed ${BORDER}`, color: MUTED }}>
                <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 14 }}>⬜</div>
                <div className="mn" style={{ fontSize: 10, lineHeight: 2, letterSpacing: '0.08em' }}>
                  NO ACTIVE QR CODE<br />CREATE A SESSION OR TAP A SESSION BELOW
                </div>
                <button className="btn btn-ghost" style={{ marginTop: 20, maxWidth: 200, margin: '20px auto 0' }}
                  onClick={() => setTab('sessions')}>
                  VIEW SESSIONS
                </button>
              </div>
            )}
          </>
        )}

        {/* ── MEMBERS ─────────────────────────────────────────── */}
        {tab === 'users' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="hd" style={{ fontSize: 22 }}>ALL MEMBERS</h2>
              <span className="mn" style={{ fontSize: 10, color: MUTED }}>{users.filter(u => !u.uid.includes('admin') || true).length} TOTAL</span>
            </div>
            {users.map(u => (
              <div key={u.uid} className="divrow">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={u.name} url={u.avatarUrl} size={34} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{u.name}</div>
                    <div className="mn" style={{ fontSize: 9, color: MUTED, letterSpacing: '0.06em' }}>
                      {u.email} · LAST: {fmtTs(u.lastActive)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="hd" style={{ fontSize: 22, color: A }}>{u.totalAttendance}</div>
                  <div className="mn" style={{ fontSize: 9, color: MUTED }}>LVL {u.level}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

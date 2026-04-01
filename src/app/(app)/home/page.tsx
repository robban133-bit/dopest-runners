'use client';
// src/app/(app)/home/page.tsx
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { StatCard, LevelDisplay } from '@/components/ui';

const A      = 'var(--accent)';
const BORDER = 'var(--border)';
const MUTED  = 'var(--muted)';

interface RecentSession {
  id:           string;
  date:         string;
  location:     string;
  participants: number;
  attended:     boolean;
}

export default function HomePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<RecentSession[]>([]);

  const hour  = new Date().getHours();
  const greet = hour < 12 ? 'GOOD MORNING' : hour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';

  useEffect(() => {
    if (!profile) return;
    loadRecentSessions();
  }, [profile]);

  const loadRecentSessions = async () => {
    try {
      const sessSnap = await getDocs(
        query(collection(db, 'sessions'), orderBy('createdAt', 'desc'), limit(5))
      );

      const sessionList = sessSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      // Check which ones the user attended
      const checkinSnap = await getDocs(
        query(collection(db, 'checkins'), where('userId', '==', profile!.uid))
      );
      const attendedIds = new Set(checkinSnap.docs.map(d => d.data().sessionId));

      setSessions(sessionList.map((s: any) => ({ ...s, attended: attendedIds.has(s.id) })));
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  if (!profile) return null;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <div className="screen">
      {/* Top header */}
      <div style={{ padding: '30px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div className="mn" style={{ fontSize: 11, color: MUTED, letterSpacing: '0.08em', marginBottom: 4 }}>
              {greet}
            </div>
            <h1 className="hd" style={{ fontSize: 38, lineHeight: 1 }}>
              {profile.name.split(' ')[0].toUpperCase()}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {profile.isAdmin && (
              <button onClick={() => router.push('/admin')} style={{
                background: A, color: '#000', border: 'none', padding: '7px 14px',
                cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.1em',
              }}>
                ADMIN ↗
              </button>
            )}
            <div
              onClick={() => router.push('/profile')}
              style={{
                width: 38, height: 38, background: '#111', border: `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 17, color: MUTED, cursor: 'pointer',
                overflow: 'hidden',
              }}>
              {profile.avatarUrl
                ? <img src={profile.avatarUrl} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : profile.name[0]
              }
            </div>
          </div>
        </div>

        {/* Brand bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 16px', background: '#080808', border: `1px solid ${BORDER}`, marginBottom: 22,
        }}>
          <div>
            <span className="hd" style={{ fontSize: 20 }}>DOPEST </span>
            <span className="hd" style={{ fontSize: 20, color: A }}>RUNNERS</span>
          </div>
          <div className="mn" style={{ fontSize: 10, color: MUTED, textAlign: 'right', lineHeight: 1.7, letterSpacing: '0.06em' }}>
            1,000+ MEMBERS<br />STHLM · 2020–
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '0 24px', display: 'flex', gap: 10, marginBottom: 22 }}>
        <StatCard label="TOTAL RUNS"  value={profile.totalAttendance} accent />
        <StatCard label="THIS YEAR"   value={profile.yearAttendance} />
        <StatCard label="STREAK 🔥"   value={profile.streak} />
      </div>

      {/* Level */}
      <div style={{ padding: '0 24px 22px' }}>
        <div className="card">
          <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.08em', marginBottom: 14 }}>YOUR LEVEL</div>
          <LevelDisplay level={profile.level} />
          <div style={{ marginTop: 14, fontSize: 12, color: '#3a3a3a', lineHeight: 1.6, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
            <span style={{ color: MUTED }}>GOAL: </span>{profile.goal}
          </div>
        </div>
      </div>

      {/* Recent runs */}
      <div style={{ padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 className="hd" style={{ fontSize: 22 }}>RECENT RUNS</h2>
          <span className="mn" style={{ fontSize: 10, color: MUTED }}>{sessions.length} LOADED</span>
        </div>
        {sessions.length === 0 && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: MUTED }}>
            <div className="mn" style={{ fontSize: 11, letterSpacing: '0.08em' }}>NO SESSIONS YET</div>
          </div>
        )}
        {sessions.map(s => (
          <div key={s.id} className="divrow">
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{s.location}</div>
              <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.06em' }}>{fmt(s.date)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mn" style={{ fontSize: 11, color: MUTED }}>{s.participants} runners</div>
              {s.attended && (
                <div style={{
                  background: A, color: '#000', padding: '2px 7px', fontSize: 9,
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginTop: 4, display: 'inline-block',
                }}>✓ ATTENDED</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

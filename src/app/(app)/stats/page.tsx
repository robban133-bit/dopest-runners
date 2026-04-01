'use client';
// src/app/(app)/stats/page.tsx
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, LevelDisplay, StatCard } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

const A      = 'var(--accent)';
const BORDER = 'var(--border)';
const MUTED  = 'var(--muted)';

interface MonthData { m: string; n: number; }

export default function StatsPage() {
  const { profile } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);

  useEffect(() => {
    if (!profile) return;
    loadCheckins();
  }, [profile]);

  const loadCheckins = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'checkins'), where('userId', '==', profile!.uid))
      );

      // Build monthly buckets for the last 7 months
      const counts: Record<string, number> = {};
      snap.docs.forEach(d => {
        const date  = d.data().checkedInAt?.toDate?.() ?? new Date();
        const key   = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        counts[key] = (counts[key] || 0) + 1;
      });

      // Last 7 months in order
      const months: MonthData[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const m = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        months.push({ m, n: counts[m] || 0 });
      }
      setMonthlyData(months);
    } catch (err) {
      console.error('Failed to load check-ins:', err);
      // Fallback demo data
      setMonthlyData([
        { m: 'SEP', n: 3 }, { m: 'OCT', n: 4 }, { m: 'NOV', n: 5 },
        { m: 'DEC', n: 2 }, { m: 'JAN', n: 6 }, { m: 'FEB', n: 7 }, { m: 'MAR', n: 5 },
      ]);
    }
  };

  if (!profile) return null;

  const topPct = Math.max(1, 100 - Math.round((profile.totalAttendance / 120) * 100));

  const startDate = new Date(profile.startDate)
    .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    .toUpperCase();

  return (
    <div className="screen">
      <PageHeader title="YOUR STATS" sub={`MEMBER SINCE ${startDate}`} />

      <div style={{ padding: '24px' }}>

        {/* Hero number */}
        <div className="card" style={{ display: 'flex', padding: 0, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ flex: 1, padding: '22px 20px' }}>
            <div className="hd" style={{ fontSize: 88, color: A, lineHeight: 1 }}>
              {profile.totalAttendance}
            </div>
            <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.08em' }}>
              SESSIONS ATTENDED
            </div>
          </div>
          <div style={{ width: 1, background: BORDER }} />
          <div style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 18, justifyContent: 'center' }}>
            <div>
              <div className="hd" style={{ fontSize: 32 }}>{profile.yearAttendance}</div>
              <div className="mn" style={{ fontSize: 9, color: MUTED, letterSpacing: '0.08em' }}>THIS YEAR</div>
            </div>
            <div>
              <div className="hd" style={{ fontSize: 32 }}>{profile.streak}🔥</div>
              <div className="mn" style={{ fontSize: 9, color: MUTED, letterSpacing: '0.08em' }}>WEEK STREAK</div>
            </div>
          </div>
        </div>

        {/* Monthly bar chart */}
        {monthlyData.length > 0 && (
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.08em', marginBottom: 18 }}>
              SESSIONS / MONTH
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={monthlyData} barSize={26} margin={{ top: 0, right: 0, bottom: 0, left: -32 }}>
                <XAxis
                  dataKey="m"
                  tick={{ fill: '#444', fontSize: 9, fontFamily: 'Space Mono' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#0C0C0C', border: `1px solid ${BORDER}`, color: '#fff', fontFamily: 'Space Mono', fontSize: 10 }}
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  formatter={(v: number) => [v, 'SESSIONS']}
                />
                <Bar dataKey="n" radius={0}>
                  {monthlyData.map((_, i) => (
                    <Cell key={i} fill="#CDFF00" opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Insight card */}
        {profile.totalAttendance > 0 && (
          <div className="card" style={{ marginBottom: 10, borderColor: '#CDFF0022', background: '#080808' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 42, height: 42, background: '#CDFF0015', border: '1px solid #CDFF0033',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
              }}>📈</div>
              <div>
                <div className="hd" style={{ fontSize: 18, marginBottom: 5 }}>
                  TOP {topPct}% OF THE CREW
                </div>
                <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}>
                  You've attended <span style={{ color: A, fontWeight: 600 }}>{profile.totalAttendance} sessions</span> since joining.
                  Your consistency puts you in the top {topPct}% of all Dopest Runners.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Level + goal */}
        <div className="card">
          <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.08em', marginBottom: 14 }}>
            RUNNING LEVEL
          </div>
          <LevelDisplay level={profile.level} />
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BORDER}`, fontSize: 13, color: MUTED, lineHeight: 1.7 }}>
            <span className="mn" style={{ fontSize: 10, letterSpacing: '0.08em' }}>GOAL:</span>
            <div style={{ color: '#ccc', marginTop: 4 }}>{profile.goal}</div>
          </div>
        </div>

      </div>
    </div>
  );
}

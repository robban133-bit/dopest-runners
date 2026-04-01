'use client';
// src/app/(app)/profile/page.tsx
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile, logoutUser } from '@/lib/auth';
import { PageHeader, LevelDisplay, LevelPicker, StatCard, SocialLinks, Avatar, useToast, Toast } from '@/components/ui';

const A      = 'var(--accent)';
const BORDER = 'var(--border)';
const MUTED  = 'var(--muted)';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const router   = useRouter();
  const { toast, notify } = useToast();

  const [editing, setEditing]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [errors,  setErrors]    = useState<Record<string, string>>({});
  const [preview, setPreview]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name:  profile?.name  ?? '',
    email: profile?.email ?? '',
    age:   String(profile?.age ?? ''),
    goal:  profile?.goal  ?? '',
    level: profile?.level ?? 5,
    avatar: null as File | null,
  });

  const upd = (k: keyof typeof form, v: any) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())            e.name  = 'Name required';
    if (!form.age || +form.age < 10)  e.age   = 'Valid age required';
    if (!form.goal.trim())            e.goal  = 'Goal required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { notify('Image must be under 5MB', 'error'); return; }
    upd('avatar', file);
    setPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    if (!validate() || !profile) return;
    setSaving(true);
    try {
      await updateUserProfile(profile.uid, {
        name:   form.name,
        age:    Number(form.age),
        goal:   form.goal,
        level:  form.level,
        avatar: form.avatar ?? undefined,
      });
      await refreshProfile();
      setEditing(false);
      setPreview(null);
      upd('avatar', null);
      notify('PROFILE UPDATED ✓');
    } catch {
      notify('Update failed. Please try again.', 'error');
    }
    setSaving(false);
  };

  const cancel = () => {
    setForm({
      name:   profile?.name  ?? '',
      email:  profile?.email ?? '',
      age:    String(profile?.age ?? ''),
      goal:   profile?.goal  ?? '',
      level:  profile?.level ?? 5,
      avatar: null,
    });
    setErrors({});
    setPreview(null);
    setEditing(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    await fetch('/api/auth/verify-admin', { method: 'DELETE' });
    router.replace('/login');
  };

  if (!profile) return null;

  const startDate = new Date(profile.startDate)
    .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    .toUpperCase();

  return (
    <div className="screen">
      {toast && <Toast {...toast} />}
      <PageHeader
        title="PROFILE"
        action={
          editing ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={cancel} style={{
                background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`,
                padding: '8px 14px', cursor: 'pointer', fontFamily: 'var(--font-display)',
                fontSize: 13, letterSpacing: '0.08em',
              }}>CANCEL</button>
              <button onClick={save} disabled={saving} style={{
                background: A, color: '#000', border: `1px solid ${A}`,
                padding: '8px 16px', cursor: 'pointer', fontFamily: 'var(--font-display)',
                fontSize: 13, letterSpacing: '0.08em', opacity: saving ? 0.7 : 1,
              }}>
                {saving ? 'SAVING...' : 'SAVE ✓'}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} style={{
              background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`,
              padding: '8px 16px', cursor: 'pointer', fontFamily: 'var(--font-display)',
              fontSize: 13, letterSpacing: '0.08em',
            }}>EDIT</button>
          )
        }
      />

      <div style={{ padding: '24px' }}>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={handleAvatarChange} />
          <Avatar
            name={profile.name}
            url={preview ?? profile.avatarUrl}
            size={76}
            editable={editing}
            onClick={() => editing && fileRef.current?.click()}
          />
          <div style={{ flex: 1 }}>
            {editing ? (
              <>
                <input
                  className={`inp${errors.name ? ' error' : ''}`}
                  value={form.name} onChange={e => upd('name', e.target.value)}
                  style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.06em', padding: '8px 12px' }}
                />
                {errors.name && <p className="inp-error">{errors.name}</p>}
              </>
            ) : (
              <>
                <h2 className="hd" style={{ fontSize: 30, marginBottom: 4 }}>{profile.name}</h2>
                <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.08em' }}>
                  SINCE {startDate}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <StatCard label="TOTAL"  value={profile.totalAttendance} accent />
          <StatCard label={String(new Date().getFullYear())} value={profile.yearAttendance} />
          <StatCard label="STREAK" value={`${profile.streak}🔥`} />
        </div>

        {/* Email (read-only) */}
        <div className="divrow">
          <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.08em', width: 70 }}>EMAIL</div>
          <div style={{ fontSize: 14, color: '#aaa' }}>{profile.email}</div>
        </div>

        {/* Age */}
        <div className="divrow">
          <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.08em', width: 70 }}>AGE</div>
          {editing ? (
            <div style={{ flex: 1 }}>
              <input className={`inp${errors.age ? ' error' : ''}`} type="number"
                value={form.age} onChange={e => upd('age', e.target.value)}
                style={{ textAlign: 'right', padding: '7px 12px', fontSize: 13 }} />
              {errors.age && <p className="inp-error" style={{ textAlign: 'right' }}>{errors.age}</p>}
            </div>
          ) : <div style={{ fontSize: 14 }}>{profile.age}</div>}
        </div>

        {/* Running goal */}
        <div style={{ padding: '15px 0', borderBottom: `1px solid ${BORDER}` }}>
          <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.08em', marginBottom: 8 }}>RUNNING GOAL</div>
          {editing ? (
            <>
              <textarea
                className={`inp${errors.goal ? ' error' : ''}`}
                rows={3} value={form.goal}
                onChange={e => upd('goal', e.target.value)}
                style={{ resize: 'none' }}
              />
              {errors.goal && <p className="inp-error">{errors.goal}</p>}
            </>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.7, color: '#ccc' }}>{profile.goal}</div>
          )}
        </div>

        {/* Level */}
        <div style={{ padding: '15px 0 20px' }}>
          <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.08em', marginBottom: 14 }}>
            RUNNING LEVEL{editing ? ` — LEVEL ${form.level}/10` : ''}
          </div>
          {editing
            ? <LevelPicker value={form.level} onChange={v => upd('level', v)} />
            : <LevelDisplay level={profile.level} />
          }
        </div>

        {/* Social */}
        <div style={{ marginBottom: 10 }}><SocialLinks /></div>

        {/* Logout */}
        <button className="btn btn-danger" onClick={handleLogout}>LOG OUT</button>
      </div>
    </div>
  );
}

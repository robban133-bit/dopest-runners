'use client';
// src/components/ui/index.tsx
// Shared primitives used across all screens.

import React, { useEffect, useState } from 'react';

const A      = 'var(--accent)';
const BORDER = 'var(--border)';
const MUTED  = 'var(--muted)';

/* ── Toast ─────────────────────────────────────────────────────────────────── */
export interface ToastMessage { msg: string; type?: 'success' | 'error'; }

export function Toast({ msg, type = 'success' }: ToastMessage) {
  return (
    <div className={`toast ${type}`} role="alert" aria-live="assertive">
      {msg}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };
  return { toast, notify };
}

/* ── Page Header ───────────────────────────────────────────────────────────── */
interface PageHeaderProps {
  title:   string;
  sub?:    string;
  onBack?: () => void;
  action?: React.ReactNode;
}
export function PageHeader({ title, sub, onBack, action }: PageHeaderProps) {
  return (
    <div style={{ padding: '28px 24px 20px', borderBottom: `1px solid ${BORDER}` }}>
      {onBack && (
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: MUTED, cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: 12, marginBottom: 14,
          padding: 0, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6,
        }}>← BACK</button>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="hd" style={{ fontSize: 34, lineHeight: 1 }}>{title}</h1>
          {sub && <p className="mn" style={{ color: MUTED, fontSize: 11, marginTop: 5, letterSpacing: '0.06em' }}>{sub}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────────────────────────────── */
export function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 0 }}>
      <div className="mn" style={{ fontSize: 10, color: MUTED, marginBottom: 6, letterSpacing: '0.08em' }}>{label}</div>
      <div className="hd" style={{ fontSize: 36, color: accent ? A : '#fff', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

/* ── Level Display ─────────────────────────────────────────────────────────── */
export function LevelDisplay({ level }: { level: number }) {
  const label = level <= 2 ? 'BEGINNER' : level <= 4 ? 'CASUAL' : level <= 6 ? 'REGULAR' : level <= 8 ? 'ADVANCED' : 'ELITE';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 40, height: 40, border: `2px solid ${A}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontSize: 22, color: A, flexShrink: 0,
      }}>{level}</div>
      <div style={{ flex: 1 }}>
        <div className="lvl-track"><div className="lvl-fill" style={{ width: `${level * 10}%` }} /></div>
        <div className="mn" style={{ fontSize: 10, color: MUTED, marginTop: 5, letterSpacing: '0.07em' }}>
          LVL {level}/10 — {label}
        </div>
      </div>
    </div>
  );
}

/* ── Social Links ──────────────────────────────────────────────────────────── */
export function SocialLinks() {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <a href="https://www.instagram.com/dopestrunners" target="_blank" rel="noopener noreferrer" className="social-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
        INSTAGRAM
      </a>
      <a href="https://www.tiktok.com/@dopestrunners" target="_blank" rel="noopener noreferrer" className="social-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
        </svg>
        TIKTOK
      </a>
    </div>
  );
}

/* ── Spinner ───────────────────────────────────────────────────────────────── */
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="spinner" role="status" aria-label="Loading" />
  );
}

/* ── Input Field ───────────────────────────────────────────────────────────── */
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:   string;
  error?:   string;
}
export function InputField({ label, error, className = '', ...props }: InputFieldProps) {
  return (
    <div>
      {label && <label className="inp-label">{label}</label>}
      <input className={`inp${error ? ' error' : ''} ${className}`} {...props} />
      {error && <p className="inp-error">{error}</p>}
    </div>
  );
}

/* ── Textarea Field ────────────────────────────────────────────────────────── */
interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:   string;
  error?:   string;
}
export function TextareaField({ label, error, className = '', ...props }: TextareaFieldProps) {
  return (
    <div>
      {label && <label className="inp-label">{label}</label>}
      <textarea className={`inp${error ? ' error' : ''} ${className}`} style={{ resize: 'none' }} {...props} />
      {error && <p className="inp-error">{error}</p>}
    </div>
  );
}

/* ── Level Picker ──────────────────────────────────────────────────────────── */
export function LevelPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <p className="mn" style={{ fontSize: 10, color: '#3a3a3a', marginBottom: 12, letterSpacing: '0.06em' }}>
        1 = NEVER RUN · 10 = ELITE (MARATHON ~3H)
      </p>
      <div style={{ display: 'flex', gap: 5 }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)} style={{
            flex: 1, padding: '10px 0',
            background: value >= n ? 'var(--accent)' : 'transparent',
            color: value >= n ? '#000' : MUTED,
            border: `1px solid ${value >= n ? 'var(--accent)' : BORDER}`,
            cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 14, transition: 'all 0.1s',
          }}>{n}</button>
        ))}
      </div>
    </div>
  );
}

/* ── Avatar ────────────────────────────────────────────────────────────────── */
export function Avatar({
  name, url, size = 48, editable, onClick,
}: { name: string; url?: string | null; size?: number; editable?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      width: size, height: size, flexShrink: 0,
      background: url ? 'transparent' : '#111',
      border: `1px solid ${BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontSize: size * 0.38, color: MUTED,
      position: 'relative', cursor: editable ? 'pointer' : 'default',
      overflow: 'hidden',
    }}>
      {url
        ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : name[0]?.toUpperCase()
      }
      {editable && (
        <div style={{
          position: 'absolute', bottom: 0, right: 0, width: 20, height: 20,
          background: 'var(--accent)', color: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
        }}>+</div>
      )}
    </div>
  );
}

/* ── PWA Install Banner ────────────────────────────────────────────────────── */
export function InstallBanner({ onInstall, onDismiss }: { onInstall: () => void; onDismiss: () => void }) {
  return (
    <div className="install-banner">
      <div style={{ flex: 1 }}>
        <div className="hd" style={{ fontSize: 16, color: 'var(--accent)', marginBottom: 2 }}>ADD TO HOME SCREEN</div>
        <div className="mn" style={{ fontSize: 10, color: MUTED, letterSpacing: '0.06em' }}>
          Install Dopest Runners for the full app experience
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onDismiss} style={{ background: 'none', border: `1px solid ${BORDER}`, color: MUTED,
          padding: '7px 12px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 12 }}>
          LATER
        </button>
        <button onClick={onInstall} style={{ background: 'var(--accent)', border: 'none', color: '#000',
          padding: '7px 14px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 12 }}>
          INSTALL
        </button>
      </div>
    </div>
  );
}

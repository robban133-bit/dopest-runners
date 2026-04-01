'use client';
// src/components/layout/BottomNav.tsx
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/home',    icon: '⌂', label: 'HOME'    },
  { href: '/checkin', icon: '◈', label: 'SCAN'    },
  { href: '/stats',   icon: '▣', label: 'STATS'   },
  { href: '/profile', icon: '◉', label: 'PROFILE' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <nav className="nav-bar" role="navigation" aria-label="Main navigation">
      {NAV.map(item => (
        <button
          key={item.href}
          className={`nav-item${pathname === item.href ? ' active' : ''}`}
          onClick={() => router.push(item.href)}
          aria-label={item.label}
          aria-current={pathname === item.href ? 'page' : undefined}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

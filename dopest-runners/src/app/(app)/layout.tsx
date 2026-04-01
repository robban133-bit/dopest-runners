'use client';
// src/app/(app)/layout.tsx
// Shared layout for all authenticated user pages.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/layout/BottomNav';
import { InstallBanner, Spinner } from '@/components/ui';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading, firebaseUser } = useAuth();
  const router = useRouter();

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall]       = useState(false);

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace('/login');
    }
  }, [loading, firebaseUser, router]);

  // Listen for PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      const dismissed = localStorage.getItem('pwa-dismissed');
      if (!dismissed) {
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShowInstall(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'dismissed') localStorage.setItem('pwa-dismissed', '1');
    setShowInstall(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-dismissed', '1');
    setShowInstall(false);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#000',
      }}>
        <Spinner size={28} />
      </div>
    );
  }

  if (!firebaseUser) return null;

  return (
    <>
      {children}
      <BottomNav />
      {showInstall && (
        <InstallBanner onInstall={handleInstall} onDismiss={handleDismiss} />
      )}
    </>
  );
}

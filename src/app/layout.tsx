import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dopest Runners',
  description: 'Stockholm Running Community — Track your runs, connect with the crew.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Dopest Runners',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .catch(err => console.warn('SW registration failed:', err));
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <div id="app-root">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
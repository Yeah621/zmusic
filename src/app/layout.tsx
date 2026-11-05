import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { IconSprite } from '@/components/icons/IconSprite';
import { AppShell } from '@/components/shell/AppShell';
import { OfflineBanner } from '@/components/shell/OfflineBanner';
import { THEME_INIT } from '@/lib/theme-init';
import '@/styles/zmusic.css';

export const metadata: Metadata = { title: 'ZMusic — Musik tanpa batas' };

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#eef8f5',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <a className="skip" href="#vw">
          Lewati ke konten
        </a>
        <OfflineBanner />
        <IconSprite />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

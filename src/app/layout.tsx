import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { IconSprite } from '@/components/icons/IconSprite';
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
        <IconSprite />
        {children}
      </body>
    </html>
  );
}

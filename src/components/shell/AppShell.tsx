import type { ReactNode } from 'react';
import { NowPlaying } from '@/components/player/NowPlaying';
import { PlayerBar } from '@/components/player/PlayerBar';
import { BottomNav } from './BottomNav';
import { ShellEffects } from './ShellEffects';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Kerangka halaman: grid 3 kolom (sidebar, konten, Now Playing), pemutar bawah, dan navigasi bawah (mobile). */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="aur" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="app">
        <Sidebar />
        <main className="pn gl" id="main">
          <Topbar />
          <div id="vw" tabIndex={-1}>
            {children}
          </div>
        </main>
        <NowPlaying />
      </div>
      <PlayerBar />
      <BottomNav />
      <ShellEffects />
    </>
  );
}

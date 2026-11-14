'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toggleLikeWithToast, toggleMuteWithToast } from '@/lib/actions';
import { registerMediaSession, setMediaMetadata, setPlaybackState } from '@/lib/media-session';
import { dataMode } from '@/lib/data/mode';
import { routeFlag } from '@/lib/route-flag';
import { applyTheme } from '@/lib/theme';
import { trackAt, useCatalog } from '@/stores/catalog';
import { useLibraryStore } from '@/stores/library';
import { usePlayerStore } from '@/stores/player';
import { toast, useUiStore } from '@/stores/ui';

const DEFAULT_TITLE = 'ZMusic — Musik tanpa batas';
const INTERACTIVE = 'input,textarea,select,dialog,.menu,button,a,[role=button],[role=slider],[role=tab]';

/** Efek global tanpa tampilan: jam simulasi, kelas body.ply, aurora, judul tab, tema, pintasan keyboard, Media Session, efek rute. */
export function ShellEffects() {
  const on = usePlayerStore((s) => s.on);
  const cur = usePlayerStore((s) => s.cur);
  const pathname = usePathname();
  const firstRoute = useRef(true);

  // Mode contoh (?data=sample): katalog Fase 1 terisi sejak awal, jadi pintasan seperti Spasi memutar lagu pertama di halaman mana pun
  useEffect(() => {
    if (dataMode() === 'sample') useCatalog.getState().seedSample();
  }, []);

  // Jam simulasi Fase 1 (diganti AudioEngine di P2-01)
  useEffect(() => {
    const id = setInterval(() => usePlayerStore.getState().tick(0.1, useLibraryStore.getState().settings.ap), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('ply', on);
    setPlaybackState(on);
  }, [on]);

  useEffect(() => {
    document.documentElement.style.setProperty('--th', String(trackAt(cur)?.h ?? 165));
    setMediaMetadata(cur);
  }, [cur]);

  useEffect(() => {
    const x = trackAt(cur);
    document.title = on && x ? `${x.t} · ZMusic` : DEFAULT_TITLE;
  }, [on, cur]);

  useEffect(() => registerMediaSession(), []);

  // Tema: pulihkan pilihan tersimpan dan ikuti perubahan tema sistem
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('zt');
    } catch {
      /* penyimpanan tidak tersedia */
    }
    if (saved === 'light' || saved === 'dark') useUiStore.setState({ theme: saved });
    const mq = matchMedia('(prefers-color-scheme:dark)');
    const onChange = () => {
      if (useUiStore.getState().theme === 'system') applyTheme('system');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const online = () => toast('Kembali online');
    addEventListener('online', online);
    return () => removeEventListener('online', online);
  }, []);

  // Pintasan: / cari, Spasi putar/jeda, panah kiri/kanan lagu, L suka, M senyap, Q Now Playing, Esc tutup, Tab terkurung di sheet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof HTMLElement ? e.target : null;
      const k = e.key;
      const ui = useUiStore.getState();
      if (k === 'Escape') {
        if (ui.menu) {
          e.preventDefault();
          ui.closeMenu();
          return;
        }
        ui.setNpOpen(false);
        return;
      }
      if (k === 'Tab' && ui.npOpen && innerWidth < 1180) {
        const np = document.getElementById('np');
        const f = [...(np?.querySelectorAll<HTMLElement>('button,input,[tabindex="0"]') ?? [])].filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (t && t !== document.body && t.closest(INTERACTIVE)) return;
      const p = usePlayerStore.getState();
      if (k === '/') {
        e.preventDefault();
        document.getElementById('q')?.focus();
      }
      if (e.code === 'Space') {
        e.preventDefault();
        p.toggle();
      }
      if (e.code === 'ArrowRight') p.next(1);
      if (e.code === 'ArrowLeft') p.next(-1);
      if (k === 'l') toggleLikeWithToast(p.cur);
      if (k === 'm') toggleMuteWithToast();
      if (k === 'q') ui.setNpOpen(!ui.npOpen);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Pindah halaman: tutup Now Playing dan menu, gulir ke atas, fokus ke konten (route() di HTML)
  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    if (routeFlag.silentPath === pathname) return;
    routeFlag.silentPath = null;
    const ui = useUiStore.getState();
    ui.setNpOpen(false);
    ui.closeMenu();
    document.getElementById('main')?.scrollTo({ top: 0 });
    document.getElementById('vw')?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}

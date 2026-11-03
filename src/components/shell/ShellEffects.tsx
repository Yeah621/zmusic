'use client';
import { useEffect } from 'react';
import { T } from '@/data/mock';
import { applyTheme } from '@/lib/theme';
import { useLibraryStore } from '@/stores/library';
import { usePlayerStore } from '@/stores/player';
import { useUiStore } from '@/stores/ui';

const DEFAULT_TITLE = 'ZMusic — Musik tanpa batas';

/** Efek global tanpa tampilan: jam simulasi pemutar, kelas body.ply, warna aurora, judul tab, dan sinkron tema. */
export function ShellEffects() {
  const on = usePlayerStore((s) => s.on);
  const cur = usePlayerStore((s) => s.cur);

  // Jam simulasi Fase 1 (diganti AudioEngine di P2-01)
  useEffect(() => {
    const id = setInterval(() => usePlayerStore.getState().tick(0.1, useLibraryStore.getState().settings.ap), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('ply', on);
  }, [on]);

  useEffect(() => {
    document.documentElement.style.setProperty('--th', String(cur >= 0 ? T[cur].h : 165));
  }, [cur]);

  useEffect(() => {
    document.title = on && cur >= 0 ? `${T[cur].t} · ZMusic` : DEFAULT_TITLE;
  }, [on, cur]);

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

  return null;
}

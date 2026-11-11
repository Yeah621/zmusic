'use client';
import { useEffect, useRef } from 'react';
import { CROSSFADE_SECONDS, gainAt } from '@/lib/crossfade';
import { resolveStream, type ResolvedStream } from '@/lib/stream-resolver';
import { useLibraryStore } from '@/stores/library';
import { durationOf, usePlayerStore } from '@/stores/player';
import { toast } from '@/stores/ui';

const SEEK_TOLERANCE = 0.75;

interface HlsLike {
  loadSource(url: string): void;
  attachMedia(el: HTMLMediaElement): void;
  destroy(): void;
}

/** Satu elemen <audio> yang selaras dengan usePlayerStore: putar/jeda, seek, volume, senyap, crossfade, batas preview, HLS. */
export function AudioEngine() {
  const el = useRef<HTMLAudioElement>(null);
  const hls = useRef<HlsLike | null>(null);
  const limit = useRef<number | undefined>(undefined);
  const cur = usePlayerStore((s) => s.cur);
  const on = usePlayerStore((s) => s.on);
  const engine = usePlayerStore((s) => s.engine);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const crossfade = useLibraryStore((s) => s.settings.cf);

  const fail = () => {
    toast('Gagal memutar audio');
    usePlayerStore.getState().pause();
  };
  const autoplay = () => useLibraryStore.getState().settings.ap;
  // play() ditolak dengan AbortError bila disela load()/pause() berikutnya: itu bukan kegagalan
  const play = (a: HTMLAudioElement) =>
    a.play().catch((err: unknown) => {
      if (!(err instanceof DOMException && err.name === 'AbortError')) fail();
    });

  // volume efektif = volume pengguna x pengali fade (bila crossfade aktif); senyap lewat properti muted
  const applyVolume = (a: HTMLAudioElement) => {
    const st = usePlayerStore.getState();
    const dur = durationOf(st);
    const fade = useLibraryStore.getState().settings.cf ? Math.min(CROSSFADE_SECONDS, dur / 4) : 0;
    a.muted = st.muted;
    a.volume = Math.max(0, Math.min(1, st.volume * gainAt(a.currentTime, dur, fade)));
  };

  // 1. Muat stream saat lagu aktif berubah (tanpa stream = mode simulasi)
  useEffect(() => {
    const a = el.current;
    if (!a) return;
    let cancelled = false;
    hls.current?.destroy();
    hls.current = null;
    a.pause();
    a.removeAttribute('src');
    a.load();
    if (cur < 0) {
      usePlayerStore.getState().setEngine(false);
      return;
    }
    const load = async (s: ResolvedStream) => {
      limit.current = s.limitSec;
      if (s.kind === 'hls' && !a.canPlayType('application/vnd.apple.mpegurl')) {
        const { default: Hls } = await import('hls.js');
        if (!Hls.isSupported()) throw new Error('HLS tidak didukung');
        const h = new Hls();
        h.loadSource(s.url);
        h.attachMedia(a);
        hls.current = h;
      } else {
        a.src = s.url;
      }
    };
    resolveStream(cur)
      .then(async (s) => {
        if (cancelled) return;
        if (!s) return usePlayerStore.getState().setEngine(false);
        await load(s);
        if (cancelled) return;
        usePlayerStore.getState().setEngine(true);
        applyVolume(a);
        if (usePlayerStore.getState().on) await play(a);
      })
      .catch(() => {
        if (!cancelled) fail();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya bereaksi pada pergantian lagu
  }, [cur]);

  // 2. Putar/jeda mengikuti store
  useEffect(() => {
    const a = el.current;
    if (!a || !engine || !a.getAttribute('src')) return;
    if (on) void play(a);
    else a.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, engine]);

  // 3. Volume dan senyap; fade berjalan tiap 100 ms saat memutar dengan crossfade
  useEffect(() => {
    const a = el.current;
    if (!a) return;
    applyVolume(a);
    if (!engine || !on || !crossfade) return;
    const id = setInterval(() => applyVolume(a), 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, muted, engine, on, crossfade]);

  // 4. Seek dari luar (bar, keyboard, ulang lagu) → currentTime
  useEffect(
    () =>
      usePlayerStore.subscribe((s, prev) => {
        const a = el.current;
        // pergantian lagu ditangani efek pemuatan; di sini hanya seek di lagu yang sama
        if (!a || !s.engine || s.cur !== prev.cur || s.pos === prev.pos || Math.abs(s.pos - a.currentTime) <= SEEK_TOLERANCE) return;
        a.currentTime = s.pos;
        if (s.on && a.paused && a.getAttribute('src')) void play(a);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <audio
      ref={el}
      preload="auto"
      onTimeUpdate={(e) => {
        const a = e.currentTarget;
        const st = usePlayerStore.getState();
        if (!st.engine) return;
        if (limit.current !== undefined && a.currentTime >= limit.current) {
          a.pause();
          st.finish(autoplay());
          return;
        }
        st.setPosition(a.currentTime);
      }}
      onLoadedMetadata={(e) => {
        const d = e.currentTarget.duration;
        if (Number.isFinite(d)) usePlayerStore.getState().setDuration(limit.current !== undefined ? Math.min(d, limit.current) : d);
      }}
      onEnded={() => usePlayerStore.getState().finish(autoplay())}
      onError={(e) => {
        if (e.currentTarget.getAttribute('src') || hls.current) fail();
      }}
    />
  );
}

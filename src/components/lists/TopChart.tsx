'use client';
import { useEffect, useRef } from 'react';
import type { Track } from '@/data/mock';
import { useUiStore } from '@/stores/ui';
import { TrackRow } from './TrackRow';

/** Daftar Top Chart dengan scroll tak hingga: sentinel terlihat → 4 baris lagi setelah 500ms (padanan more() di HTML). */
export function TopChart({ tracks }: { tracks: readonly Track[] }) {
  const count = useUiStore((s) => s.chartCount);
  const more = useUiStore((s) => s.moreChart);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = tracks.length > count;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting && timer === undefined) {
          timer = setTimeout(() => {
            timer = undefined;
            more();
          }, 500);
        }
      },
      { root: document.getElementById('main'), rootMargin: '200px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [count, hasMore, more]);

  return (
    <div id="list">
      {tracks.slice(0, count).map((x, k) => (
        <TrackRow key={x.i} track={x} k={k} />
      ))}
      {hasMore ? <div ref={sentinel} id="sent" className="sk" style={{ height: 56, marginTop: 8 }} aria-label="Memuat lagu lainnya" role="status" /> : null}
    </div>
  );
}

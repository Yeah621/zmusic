'use client';
import { useEffect, useMemo, useRef } from 'react';
import type { Track } from '@/stores/catalog';
import { useUiStore } from '@/stores/ui';
import { TrackList } from './TrackList';
import { TrackRow } from './TrackRow';

/** Daftar Top Chart dengan scroll tak hingga: sentinel terlihat → 4 baris lagi setelah 500ms (padanan more() di HTML). */
export function TopChart({ tracks }: { tracks: readonly Track[] }) {
  const count = useUiStore((s) => s.chartCount);
  const more = useUiStore((s) => s.moreChart);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = tracks.length > count;
  const ids = useMemo(() => tracks.map((x) => x.i), [tracks]);

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
      <TrackList ids={ids}>
        {tracks.slice(0, count).map((x, k) => (
          <TrackRow key={x.i} track={x} k={k} />
        ))}
      </TrackList>
      {hasMore ? <div ref={sentinel} id="sent" className="sk" style={{ height: 56, marginTop: 8 }} aria-label="Memuat lagu lainnya" role="status" /> : null}
    </div>
  );
}

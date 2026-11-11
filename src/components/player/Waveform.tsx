'use client';
import { useMemo, type CSSProperties } from 'react';
import { T } from '@/data/mock';
import { fmt } from '@/lib/format';
import { waveHeights } from '@/lib/waveform';
import { SEED_COMMENTS, useLibraryStore } from '@/stores/library';
import { useDuration, usePlayerStore } from '@/stores/player';
import { useSeek } from './useSeek';

export function Bars({ heights, className = 'wb' }: { heights: readonly number[]; className?: string }) {
  return (
    <div className={className}>
      {heights.map((h, k) => (
        <i key={k} style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

/** #wv di Now Playing: waveform dua lapis (dasar + progres), penanda komentar, dan slider posisi. */
export function Waveform() {
  const cur = usePlayerStore((s) => s.cur);
  const pos = usePlayerStore((s) => s.pos);
  const duration = useDuration();
  const comments = useLibraryStore((s) => s.comments[cur]);
  const heights = useMemo(() => waveHeights(cur >= 0 ? cur : 0), [cur]);
  const seek = useSeek();
  const x = cur >= 0 ? T[cur] : null;
  return (
    <div
      className="wv"
      id="wv"
      role="slider"
      tabIndex={0}
      aria-label="Posisi lagu"
      aria-valuemin={0}
      aria-valuemax={x ? duration : 100}
      aria-valuenow={x ? pos | 0 : 0}
      aria-valuetext={x ? `${fmt(pos)} dari ${fmt(duration)}` : undefined}
      style={x ? ({ '--p': `${(pos / duration) * 100}%` } as CSSProperties) : undefined}
      {...seek}
    >
      <Bars heights={heights} />
      <Bars heights={heights} className="wb pw" />
      {x ? (comments ?? SEED_COMMENTS).map((m, k) => <b key={k} className="mk" style={{ left: `${m.p * 100}%` }} />) : null}
    </div>
  );
}

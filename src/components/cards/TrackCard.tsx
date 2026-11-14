'use client';
import { Icon } from '@/components/icons/Icon';
import { useTrackList } from '@/components/lists/TrackList';
import { coverStyle } from '@/lib/cover-art';
import { subtitle } from '@/lib/track-label';
import { delayStyle, useReveal } from '@/lib/use-reveal';
import type { Track } from '@/stores/catalog';
import { usePlayerStore } from '@/stores/player';

export function TrackCard({ track: x, k }: { track: Track; k: number }) {
  const play = usePlayerStore((s) => s.play);
  const list = useTrackList();
  const { ref, cls } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`card rv${cls}`} style={delayStyle(k * 60)} data-a="play" data-nf="" onClick={() => play(x.i, false, list)}>
      <div className="cv" style={coverStyle(x)}>
        <span className="pbt">
          <Icon name="play" />
        </span>
      </div>
      <button className="tl">
        <b>{x.t}</b>
        <span>{subtitle(x)}</span>
      </button>
    </div>
  );
}

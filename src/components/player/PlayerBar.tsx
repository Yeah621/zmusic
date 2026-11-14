'use client';
import { LikeButton } from '@/components/cards/LikeButton';
import { Icon } from '@/components/icons/Icon';
import { toggleMuteWithToast } from '@/lib/actions';
import { coverStyle } from '@/lib/cover-art';
import { fmt } from '@/lib/format';
import { subtitle } from '@/lib/track-label';
import { useTrack } from '@/stores/catalog';
import { useDuration, usePlayerStore } from '@/stores/player';
import { useUiStore } from '@/stores/ui';
import { Controls } from './Controls';
import { useSeek } from './useSeek';

/** Footer pemutar tiga zona: info + suka, kontrol + progres, timer tidur + volume (mini player di mobile). */
export function PlayerBar() {
  const cur = usePlayerStore((s) => s.cur);
  const pos = usePlayerStore((s) => s.pos);
  const duration = useDuration();
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const setNpOpen = useUiStore((s) => s.setNpOpen);
  const openMenu = useUiStore((s) => s.openMenu);
  const seek = useSeek();
  const x = useTrack(cur) ?? null;
  return (
    <footer className="pl gl">
      <div className="pli">
        <button className="pi" aria-label="Buka pemutar penuh" onClick={() => setNpOpen(true)}>
          <span className="pc cvr" style={x ? coverStyle(x) : undefined} />
          <span className="pt">
            <span className="nt">{x ? x.t : 'Pilih lagu'}</span>
            <span className="na">{x ? subtitle(x) : 'ZMusic'}</span>
          </span>
        </button>
        <LikeButton index={cur} className="lk ph" />
      </div>
      <div className="pm">
        <div className="ctl" id="pctl">
          <Controls />
        </div>
        <div className="pr">
          <span className="tc">{fmt(pos)}</span>
          <div
            className="bar"
            role="slider"
            tabIndex={0}
            aria-label="Posisi lagu"
            aria-valuemin={0}
            aria-valuemax={x ? duration : 100}
            aria-valuenow={x ? pos | 0 : 0}
            aria-valuetext={x ? `${fmt(pos)} dari ${fmt(duration)}` : undefined}
            {...seek}
          >
            <i className="fill" style={x ? { width: `${(pos / duration) * 100}%` } : undefined} />
          </div>
          <span className="tt">{x ? fmt(duration) : '0:00'}</span>
        </div>
      </div>
      <div className="pv">
        <button
          className="lk"
          data-a="slp"
          aria-label="Timer tidur"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            openMenu({ kind: 'sleep', right: r.right, bottom: r.bottom });
          }}
        >
          <Icon name="clock" />
        </button>
        <button className="lk" id="mt" data-a="mute" aria-label="Senyap" onClick={toggleMuteWithToast}>
          <Icon name={muted ? 'mute' : 'vol'} />
        </button>
        <input type="range" id="vol" min="0" max="1" step=".01" value={volume} aria-label="Volume" onChange={(e) => setVolume(Number(e.target.value))} />
      </div>
    </footer>
  );
}

'use client';
import { LikeButton } from '@/components/cards/LikeButton';
import { Icon } from '@/components/icons/Icon';
import type { Track } from '@/data/mock';
import { coverStyle } from '@/lib/cover-art';
import { fmt } from '@/lib/format';
import { delayStyle, useReveal } from '@/lib/use-reveal';
import { usePlayerStore } from '@/stores/player';
import { useUiStore } from '@/stores/ui';

interface Props {
  track: Track;
  /** nomor baris (0-based) */
  k: number;
  /** baris ringkas di panel Now Playing (tanpa animasi muncul) */
  queue?: boolean;
  /** indeks di "Dalam antrean": menampilkan gagang geser dan tombol hapus */
  qi?: number;
  /** baris sedang diseret (kelas drag) */
  dragging?: boolean;
  onDragStart?: (qi: number) => void;
}

/** Baris lagu (tr() di HTML). Klik baris atau judul = putar; tombol di dalamnya menghentikan propagasi. */
export function TrackRow({ track: x, k, queue = false, qi, dragging = false, onDragStart }: Props) {
  const isCurrent = usePlayerStore((s) => s.cur === x.i);
  const play = usePlayerStore((s) => s.play);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const swapInQueue = usePlayerStore((s) => s.swapInQueue);
  const openMenu = useUiStore((s) => s.openMenu);
  const { ref, cls } = useReveal<HTMLDivElement>(!queue);
  const dq = qi !== undefined;
  const qn = qi ?? 0;
  return (
    <div
      ref={ref}
      className={`tr${queue ? ' q' : ` rv${cls}`}${dq ? ' dq' : ''}${isCurrent ? ' cur' : ''}${dragging ? ' drag' : ''}`}
      style={delayStyle(k * 40)}
      data-a="play"
      data-nf=""
      data-qi={dq ? qi : undefined}
      onClick={() => play(x.i)}
      onContextMenu={(e) => {
        if (dq) return;
        e.preventDefault();
        e.currentTarget.querySelector<HTMLElement>('.tl')?.focus();
        openMenu({ kind: 'track', index: x.i, right: e.clientX + 220, bottom: e.clientY });
      }}
    >
      {dq ? (
        <button
          className="lk gp"
          aria-label="Geser urutan (panah atas atau bawah)"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.preventDefault();
            onDragStart?.(qn);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
            e.preventDefault();
            const j = qn + (e.key === 'ArrowUp' ? -1 : 1);
            swapInQueue(qn, j);
            requestAnimationFrame(() => document.querySelectorAll<HTMLElement>('#qq .gp')[j]?.focus());
          }}
        >
          <Icon name="grip" />
        </button>
      ) : (
        <div className="n">
          <span>{k + 1}</span>
          <div className="eq">
            <i />
            <i />
            <i />
          </div>
        </div>
      )}
      <div className="cv" style={coverStyle(x)} />
      <button className="tl">
        <b>{x.t}</b>
        <span>{x.a}</span>
      </button>
      <p className="al">{x.pv === 'p' ? 'Pribadi' : x.g}</p>
      <LikeButton index={x.i} />
      <p className="tm">{fmt(x.d)}</p>
      {dq ? (
        <button
          className="lk"
          data-a="rq"
          aria-label="Hapus dari antrean"
          onClick={(e) => {
            e.stopPropagation();
            removeFromQueue(qn);
          }}
        >
          <Icon name="x" />
        </button>
      ) : (
        <button
          className="lk"
          data-a="more"
          aria-label={`Opsi untuk ${x.t}`}
          aria-haspopup="menu"
          onClick={(e) => {
            e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect();
            openMenu({ kind: 'track', index: x.i, right: r.right, bottom: r.bottom });
          }}
        >
          <Icon name="more" />
        </button>
      )}
    </div>
  );
}

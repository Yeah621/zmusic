'use client';
import { useEffect, useRef, useState } from 'react';
import { LikeButton } from '@/components/cards/LikeButton';
import { Icon } from '@/components/icons/Icon';
import { TrackRow } from '@/components/lists/TrackRow';
import { T } from '@/data/mock';
import { shareTrack } from '@/lib/actions';
import { coverStyle } from '@/lib/cover-art';
import { fmt } from '@/lib/format';
import { SEED_COMMENTS, useLibraryStore } from '@/stores/library';
import { durationOf, useDuration, usePlayerStore } from '@/stores/player';
import { toast, useUiStore } from '@/stores/ui';
import { Controls } from './Controls';
import { Waveform } from './Waveform';

function QueuePane() {
  const cur = usePlayerStore((s) => s.cur);
  const queue = usePlayerStore((s) => s.queue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const moveInQueue = usePlayerStore((s) => s.moveInQueue);
  const [drag, setDrag] = useState<number | null>(null);
  const dragging = useRef<number | null>(null);

  // Seret gagang: pendengar dipasang langsung saat pointerdown (bukan lewat efek) agar gerakan cepat tidak terlewat.
  // Baris berpindah saat penunjuk melewati titik tengah baris lain (pointermove/up di HTML).
  const startDrag = (from: number) => {
    dragging.current = from;
    setDrag(from);
    const onMove = (e: PointerEvent) => {
      const d = dragging.current;
      const row = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('#qq .tr');
      if (d === null || !row) return;
      const over = Number(row.dataset.qi);
      if (!Number.isInteger(over) || over === d) return;
      const r = row.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if ((over > d && e.clientY > mid) || (over < d && e.clientY < mid)) {
        moveInQueue(d, over);
        dragging.current = over;
        setDrag(over);
      }
    };
    const end = () => {
      dragging.current = null;
      setDrag(null);
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerup', end);
      removeEventListener('pointercancel', end);
    };
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
  };

  if (cur < 0) return null;
  const seen = new Map<number, number>();
  return (
    <>
      {queue.length > 0 && (
        <>
          <div className="qh">
            <h4>Dalam antrean</h4>
            <button
              onClick={() => {
                const prev = clearQueue();
                toast('Antrean dikosongkan', () => setQueue(prev));
              }}
            >
              Kosongkan
            </button>
          </div>
          <div id="qq">
            {queue.map((i, j) => {
              const n = seen.get(i) ?? 0;
              seen.set(i, n + 1);
              return <TrackRow key={`${i}#${n}`} track={T[i]} k={j} queue qi={j} dragging={drag === j} onDragStart={startDrag} />;
            })}
          </div>
        </>
      )}
      <div className="qh">
        <h4>Selanjutnya</h4>
      </div>
      {[1, 2, 3, 4].map((k, j) => (
        <TrackRow key={k} track={T[(cur + k) % T.length]} k={j} queue />
      ))}
    </>
  );
}

/** Panel kanan (sheet layar penuh di bawah 1180px): sampul, waveform, komentar, timer tidur, antrean, lirik. */
export function NowPlaying() {
  const cur = usePlayerStore((s) => s.cur);
  const pos = usePlayerStore((s) => s.pos);
  const duration = useDuration();
  const open = useUiStore((s) => s.npOpen);
  const tab = useUiStore((s) => s.npTab);
  const setNpOpen = useUiStore((s) => s.setNpOpen);
  const setNpTab = useUiStore((s) => s.setNpTab);
  const openMenu = useUiStore((s) => s.openMenu);
  const comments = useLibraryStore((s) => s.comments[cur]);
  const [text, setText] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchY = useRef(0);
  const x = cur >= 0 ? T[cur] : null;
  const bubble = x ? (comments ?? SEED_COMMENTS).find((c) => pos - c.p * duration >= 0 && pos - c.p * duration < 3.5) : undefined;

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    const s = usePlayerStore.getState();
    if (s.cur < 0) return toast('Putar lagu dulu untuk berkomentar');
    useLibraryStore.getState().addComment(s.cur, s.pos / durationOf(s), t);
    setText('');
    toast(`Komentar ditambahkan di ${fmt(s.pos)}`);
  };

  return (
    <aside
      className={`np pn gl${open ? ' open' : ''}`}
      id="np"
      aria-label="Sedang diputar"
      onTouchStart={(e) => {
        touchY.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        const swipedDown = e.changedTouches[0].clientY - touchY.current > 110;
        const onControl = e.target instanceof Element && e.target.closest('.wv,.bar,input,.gp');
        if (swipedDown && e.currentTarget.scrollTop < 5 && !onControl) setNpOpen(false);
      }}
    >
      <button ref={closeRef} className="ib x" data-a="close" aria-label="Tutup pemutar" onClick={() => setNpOpen(false)}>
        <Icon name="down" />
      </button>
      <div className="big cvr" role="img" aria-label="Sampul lagu" style={x ? coverStyle(x) : undefined} />
      <div className="nr">
        <div>
          <h3 className="nt">{x ? x.t : 'Pilih lagu'}</h3>
          <p className="na">{x ? x.a : 'ZMusic'}</p>
        </div>
        <LikeButton index={cur} className="lk ph" />
      </div>
      <Waveform />
      <div className="pr">
        <span className="tc">{fmt(pos)}</span>
        <span className="cmb" id="cmb" aria-live="off">
          {bubble ? `“${bubble.t}”` : ''}
        </span>
        <span className="tt">{x ? fmt(duration) : '0:00'}</span>
      </div>
      <div className="ctl" id="nctl">
        <Controls />
      </div>
      <div className="cmi">
        <input
          id="cmt"
          placeholder="Tulis komentar di titik ini…"
          maxLength={60}
          autoComplete="off"
          aria-label="Komentar"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="ib" data-a="cmt" aria-label="Kirim komentar" onClick={submit}>
          <Icon name="send" />
        </button>
      </div>
      <div className="ut">
        <button
          data-a="slp"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            openMenu({ kind: 'sleep', right: r.right, bottom: r.bottom });
          }}
        >
          <Icon name="clock" />
          Timer tidur
        </button>
        <button data-a="shr" onClick={shareTrack}>
          <Icon name="share" />
          Bagikan
        </button>
      </div>
      <div className="tabs np-t" role="tablist" id="npt">
        <button role="tab" className={tab === 0 ? 'on' : undefined} aria-selected={tab === 0} onClick={() => setNpTab(0)}>
          Antrean
        </button>
        <button role="tab" className={tab === 1 ? 'on' : undefined} aria-selected={tab === 1} onClick={() => setNpTab(1)}>
          Lirik
        </button>
      </div>
      <div id="que">{x ? tab === 1 ? <p className="lyn">Lirik belum tersedia</p> : <QueuePane /> : null}</div>
    </aside>
  );
}

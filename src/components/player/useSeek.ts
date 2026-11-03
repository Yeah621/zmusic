import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { T } from '@/data/mock';
import { usePlayerStore } from '@/stores/player';

/** Klik/geser/keyboard pada slider posisi (bar progres dan waveform). Padanan sk() dan handler slider di HTML. */
export function useSeek() {
  const dragging = useRef(false);
  const fromPointer = (e: PointerEvent<HTMLElement>) => {
    const { cur, seek } = usePlayerStore.getState();
    if (cur < 0) return;
    const b = e.currentTarget.getBoundingClientRect();
    seek(Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)) * T[cur].d);
  };
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      fromPointer(e);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (dragging.current) fromPointer(e);
    },
    onPointerUp: () => {
      dragging.current = false;
    },
    onPointerCancel: () => {
      dragging.current = false;
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      const { cur, pos, seek } = usePlayerStore.getState();
      if (cur < 0) return;
      const k = e.key;
      const to = k === 'ArrowRight' || k === 'ArrowUp' ? pos + 5 : k === 'ArrowLeft' || k === 'ArrowDown' ? pos - 5 : k === 'Home' ? 0 : k === 'End' ? T[cur].d - 1 : null;
      if (to === null) return;
      e.preventDefault();
      seek(to);
    },
  };
}

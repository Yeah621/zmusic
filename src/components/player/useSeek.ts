import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { durationOf, usePlayerStore } from '@/stores/player';

/** Klik/geser/keyboard pada slider posisi (bar progres dan waveform). Padanan sk() dan handler slider di HTML. */
export function useSeek() {
  const dragging = useRef(false);
  const fromPointer = (e: PointerEvent<HTMLElement>) => {
    const st = usePlayerStore.getState();
    if (st.cur < 0) return;
    const b = e.currentTarget.getBoundingClientRect();
    st.seek(Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)) * durationOf(st));
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
      const st = usePlayerStore.getState();
      const { cur, pos, seek } = st;
      if (cur < 0) return;
      const k = e.key;
      const to = k === 'ArrowRight' || k === 'ArrowUp' ? pos + 5 : k === 'ArrowLeft' || k === 'ArrowDown' ? pos - 5 : k === 'Home' ? 0 : k === 'End' ? durationOf(st) - 1 : null;
      if (to === null) return;
      e.preventDefault();
      seek(to);
    },
  };
}

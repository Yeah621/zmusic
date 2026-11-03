import { useEffect, useRef, useState, type CSSProperties } from 'react';

/** Penundaan animasi muncul (variabel CSS --d, dipakai .rv di zmusic.css). */
export const delayStyle = (ms: number): CSSProperties => ({ '--d': `${ms}ms` }) as CSSProperties;

/**
 * Padanan IntersectionObserver `.rv` → `.in` di HTML. Kelas `in` dikelola React
 * (bukan classList) supaya tidak terhapus saat className elemen berubah.
 */
export function useReveal<E extends HTMLElement>(enabled = true) {
  const ref = useRef<E>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || shown) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { root: document.getElementById('main'), threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, shown]);
  return { ref, cls: shown ? ' in' : '' };
}

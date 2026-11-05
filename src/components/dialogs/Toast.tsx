'use client';
import { useEffect } from 'react';
import { useUiStore } from '@/stores/ui';

/** Toast di atas layar; "Urungkan" muncul bila aksi bisa dibatalkan (toast() di HTML: 2,4 detik, 5,5 detik bila ada urungkan). */
export function Toast() {
  const toast = useUiStore((s) => s.toast);
  const shown = useUiStore((s) => s.toastShown);
  const hideToast = useUiStore((s) => s.hideToast);
  const id = toast?.id;
  const hasUndo = !!toast?.undo;

  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(hideToast, hasUndo ? 5500 : 2400);
    return () => clearTimeout(t);
  }, [id, shown, hasUndo, hideToast]);

  return (
    <div className={`toast gl${shown ? ' s' : ''}`} id="toast" role="status" aria-live="polite">
      {toast ? (
        <>
          <span>{toast.message}</span>
          {toast.undo ? (
            <button
              className="ud"
              onClick={() => {
                toast.undo?.();
                hideToast();
              }}
            >
              Urungkan
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

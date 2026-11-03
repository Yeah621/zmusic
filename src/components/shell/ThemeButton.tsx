'use client';
import { useSyncExternalStore } from 'react';
import { Icon } from '@/components/icons/Icon';
import { useUiStore } from '@/stores/ui';

// Tema aktif dibaca dari <html data-theme> (diset skrip awal di <head>), bukan dari state React.
const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
};
const isDark = () => document.documentElement.dataset.theme === 'dark';

export function ThemeButton() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  const setTheme = useUiStore((s) => s.setTheme);
  return (
    <button className="ib" id="th" aria-label="Ganti tema" onClick={() => setTheme(dark ? 'light' : 'dark')}>
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  );
}

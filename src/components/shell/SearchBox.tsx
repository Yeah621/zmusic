'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { routeFlag, silentPathOf } from '@/lib/route-flag';
import { searchQueryFromPath, suggest, type Suggestion } from '@/lib/search';
import { useLibraryStore } from '@/stores/library';
import { usePlayerStore } from '@/stores/player';

const DEBOUNCE_MS = 250;
const KIND_ICON = { t: 'music', a: 'user', al: 'lib', g: 'search' } as const;

/** Kolom cari bergaya combobox: saran saat mengetik, navigasi panah, Enter, Esc (sug/pickSg/commit di HTML). */
export function SearchBox() {
  const pathname = usePathname();
  const router = useRouter();
  const pushRecent = useLibraryStore((s) => s.pushRecent);
  const play = usePlayerStore((s) => s.play);
  const [typed, setTyped] = useState<string | null>(null);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLInputElement>(null);
  const onSearchPage = (pathname ?? '').startsWith('/search');
  const value = typed ?? searchQueryFromPath(pathname);

  const hide = () => {
    setOpen(false);
    setActive(-1);
  };
  const show = (v: string) => {
    const list = suggest(v);
    setItems(list);
    setActive(-1);
    setOpen(list.length > 0);
  };
  const commit = (v: string) => {
    hide();
    if (!v) return;
    pushRecent(v);
    setTyped(null);
    router.push(`/search/${encodeURIComponent(v)}`);
  };
  const pick = (k: number) => {
    const s = items[k];
    if (!s) return;
    hide();
    if (s.kind === 't' && s.i !== undefined) play(s.i, true);
    else if (s.kind === 'a') router.push(`/artist/${s.i}`);
    else if (s.kind === 'al') router.push(`/album/${s.i}`);
    else commit(s.label);
  };
  const onInput = (v: string) => {
    setTyped(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      show(v);
      const path = `/search${v.trim() ? `/${encodeURIComponent(v.trim())}` : ''}`;
      if (onSearchPage || v.trim()) routeFlag.silentPath = silentPathOf(path);
      if (onSearchPage) window.history.replaceState(null, '', path);
      else if (v.trim()) router.push(path);
    }, DEBOUNCE_MS);
  };
  const clear = () => {
    setTyped('');
    hide();
    if (onSearchPage) {
      routeFlag.silentPath = silentPathOf('/search');
      window.history.replaceState(null, '', '/search');
    }
    input.current?.focus();
  };

  return (
    <div className={`sbox${value ? ' hq' : ''}`} id="qbox">
      <label className="sr">
        <span aria-hidden="true">
          <Icon name="search" />
        </span>
        <span className="vh">Cari</span>
        <input
          ref={input}
          id="q"
          type="search"
          placeholder="Cari lagu, artis, atau genre…"
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="sg"
          aria-activedescendant={active >= 0 ? `sg${active}` : undefined}
          value={value}
          onChange={(e) => onInput(e.target.value)}
          onFocus={() => value.trim() && show(value)}
          onBlur={() => setTimeout(hide, 150)}
          onKeyDown={(e) => {
            const k = e.key;
            if ((k === 'ArrowDown' || k === 'ArrowUp') && items.length && open) {
              e.preventDefault();
              setActive(k === 'ArrowDown' ? (active + 1) % items.length : active <= 0 ? items.length - 1 : active - 1);
            } else if (k === 'Enter') {
              e.preventDefault();
              clearTimeout(timer.current);
              if (active >= 0) pick(active);
              else commit(value.trim());
            } else if (k === 'Escape' && open) {
              e.nativeEvent.stopImmediatePropagation();
              hide();
            }
          }}
        />
        <button type="button" className="clr" aria-label="Hapus pencarian" onClick={clear}>
          <Icon name="x" />
        </button>
      </label>
      <div className={`sg${open ? ' s' : ''}`} id="sg" role="listbox" aria-label="Saran pencarian" onMouseDown={(e) => e.preventDefault()}>
        {items.map((s, k) => (
          <div key={`${s.kind}-${s.label}`} role="option" id={`sg${k}`} data-a="sgp" data-nf="" aria-selected={k === active} onClick={() => pick(k)}>
            <span>
              <Icon name={KIND_ICON[s.kind]} />
            </span>
            <div style={{ padding: 0 }}>
              <b>{s.label}</b>
              <span>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

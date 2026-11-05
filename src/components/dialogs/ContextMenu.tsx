'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Icon, type IconName } from '@/components/icons/Icon';
import { A, AL, PB, T } from '@/data/mock';
import { setSleepTimer, shareTrack, toggleLikeWithToast } from '@/lib/actions';
import { useLibraryStore } from '@/stores/library';
import { usePlayerStore } from '@/stores/player';
import { toast, useUiStore } from '@/stores/ui';

interface Item {
  icon: IconName;
  label: string;
  run: () => void;
}

/** Menu lagu, "tambah ke playlist", dan timer tidur (menu()/tm()/addPl() di HTML). Posisi mengikuti tombol pembuka. */
export function ContextMenu() {
  const menu = useUiStore((s) => s.menu);
  const closeMenu = useUiStore((s) => s.closeMenu);
  const openMenu = useUiStore((s) => s.openMenu);
  const openDialog = useUiStore((s) => s.openDialog);
  const own = useLibraryStore((s) => s.ownPlaylists);
  const liked = useLibraryStore((s) => (menu?.kind === 'track' ? s.likes.includes(menu.index) : false));
  const router = useRouter();
  const pathname = usePathname();
  const el = useRef<HTMLDivElement>(null);

  // Fokus ke item pertama saat dibuka, kembali ke pembuka saat ditutup
  useEffect(() => {
    if (!menu) return;
    const opener = document.activeElement as HTMLElement | null;
    el.current?.querySelector('button')?.focus();
    return () => {
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [menu]);

  const items: Item[] = [];
  if (menu?.kind === 'sleep') {
    items.push({ icon: 'x', label: 'Matikan timer', run: () => setSleepTimer(0) });
    for (const m of [15, 30, 60]) items.push({ icon: 'clock', label: `${m} menit`, run: () => setSleepTimer(m) });
  } else if (menu?.kind === 'addpl') {
    const i = menu.index;
    items.push({ icon: 'plus', label: 'Playlist baru…', run: () => openDialog({ kind: 'playlist', track: i }) });
    own.forEach((p, k) =>
      items.push({
        icon: 'list',
        label: p.n,
        run: () => {
          useLibraryStore.getState().addToPlaylist(k, i);
          toast(`Ditambahkan ke ${p.n}`);
        },
      }),
    );
  } else if (menu?.kind === 'track') {
    const i = menu.index;
    const x = T[i];
    const artist = A.findIndex((y) => y.n === x.a);
    const album = AL.findIndex((y) => y.t.includes(i));
    const m = /^\/playlist\/(\d+)/.exec(pathname ?? '');
    const ownIdx = m ? Number(m[1]) - PB.length : -1;
    const { right, bottom } = menu;
    items.push(
      {
        icon: 'list',
        label: 'Putar berikutnya',
        run: () => {
          usePlayerStore.getState().addNext(i);
          toast('Diputar berikutnya');
        },
      },
      {
        icon: 'plus',
        label: 'Tambah ke antrean',
        run: () => {
          usePlayerStore.getState().addToQueue(i);
          toast('Ditambahkan ke antrean');
        },
      },
      {
        icon: 'music',
        label: 'Mulai radio',
        run: () => {
          usePlayerStore.getState().startRadio(i);
          toast(`Radio ${x.t}`);
        },
      },
      { icon: 'heart', label: liked ? 'Hapus dari Disukai' : 'Simpan ke Disukai', run: () => toggleLikeWithToast(i) },
      { icon: 'list', label: 'Tambah ke playlist…', run: () => openMenu({ kind: 'addpl', index: i, right, bottom }) },
    );
    if (ownIdx >= 0 && own[ownIdx]) {
      items.push({
        icon: 'trash',
        label: 'Hapus dari playlist',
        run: () => {
          const lib = useLibraryStore.getState();
          const name = lib.ownPlaylists[ownIdx]?.n ?? '';
          lib.removeFromPlaylist(ownIdx, i);
          toast(`Dihapus dari ${name}`, () => useLibraryStore.getState().addToPlaylist(ownIdx, i));
        },
      });
    }
    items.push({ icon: 'user', label: 'Lihat artis', run: () => router.push(`/artist/${artist}`) });
    if (album >= 0) items.push({ icon: 'lib', label: 'Lihat album', run: () => router.push(`/album/${album}`) });
    items.push({ icon: 'share', label: 'Bagikan', run: shareTrack });
  }

  const style = menu
    ? {
        left: Math.max(8, Math.min(window.innerWidth - 236, menu.right - 220)),
        top: Math.max(8, Math.min(window.innerHeight - items.length * 46 - 24, menu.bottom + 6)),
      }
    : undefined;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.nativeEvent.stopImmediatePropagation();
      closeMenu();
      return;
    }
    const b = [...e.currentTarget.querySelectorAll('button')];
    const i = b.indexOf(document.activeElement as HTMLButtonElement);
    const n = b.length;
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      b[(i + 1) % n]?.focus();
    } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      b[(i - 1 + n) % n]?.focus();
    }
  };

  return (
    <>
      <div className={`mb${menu ? ' s' : ''}`} id="mb" onClick={closeMenu} />
      <div ref={el} className={`menu${menu ? ' s' : ''}`} id="menu" role="menu" style={style} onKeyDown={onKeyDown}>
        {items.map((it, k) => (
          <button
            key={`${it.label}-${k}`}
            role="menuitem"
            onClick={() => {
              closeMenu();
              it.run();
            }}
          >
            <Icon name={it.icon} />
            {it.label}
          </button>
        ))}
      </div>
    </>
  );
}

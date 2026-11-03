'use client';
import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { useLibraryStore } from '@/stores/library';
import { toast } from '@/stores/ui';
import { ThemeButton } from './ThemeButton';

/** Kolom cari bergaya combobox. Perilaku saran dan riwayat dibangun di P1-04. */
function SearchBox() {
  return (
    <div className="sbox" id="qbox">
      <label className="sr">
        <span aria-hidden="true">
          <Icon name="search" />
        </span>
        <span className="vh">Cari</span>
        <input
          id="q"
          type="search"
          placeholder="Cari lagu, artis, atau genre…"
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={false}
          aria-controls="sg"
        />
        <button type="button" className="clr" aria-label="Hapus pencarian">
          <Icon name="x" />
        </button>
      </label>
      <div className="sg" id="sg" role="listbox" aria-label="Saran pencarian" />
    </div>
  );
}

export function Topbar() {
  const user = useLibraryStore((s) => s.user);
  return (
    <header className="top">
      <SearchBox />
      <ThemeButton />
      <button className="ib" id="bell" data-a="toast" aria-label="Notifikasi" onClick={() => toast('Tidak ada notifikasi baru')}>
        <Icon name="bell" />
      </button>
      {user ? (
        <Link className="ib av" id="avt" href="/profile" aria-label={`Profil ${user.name}`}>
          {user.name[0].toUpperCase()}
        </Link>
      ) : (
        <Link className="ib av wd" id="avt" href="/login" aria-label="Masuk">
          Masuk
        </Link>
      )}
    </header>
  );
}

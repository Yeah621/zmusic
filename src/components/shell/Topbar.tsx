'use client';
import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { useLibraryStore } from '@/stores/library';
import { toast } from '@/stores/ui';
import { SearchBox } from './SearchBox';
import { ThemeButton } from './ThemeButton';

export function Topbar() {
  const user = useLibraryStore((s) => s.user);
  const authReady = useLibraryStore((s) => s.authReady);
  return (
    <header className="top">
      <SearchBox />
      <ThemeButton />
      <button className="ib" id="bell" data-a="toast" aria-label="Notifikasi" onClick={() => toast('Tidak ada notifikasi baru')}>
        <Icon name="bell" />
      </button>
      {!authReady ? (
        // status masuk belum diketahui: tempat avatar ditahan agar tata letak tidak bergeser dan tombol "Masuk" tidak berkedip
        <span className="ib av" id="avt" aria-hidden="true" style={{ visibility: 'hidden' }} />
      ) : user ? (
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

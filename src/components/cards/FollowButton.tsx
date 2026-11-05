'use client';
import { toggleFollowWithToast } from '@/lib/actions';
import { useLibraryStore } from '@/stores/library';

/** Tombol Ikuti/Mengikuti. `className` = kelas dasar (`fb` di Koleksi, `btn b2 fol` di halaman artis). */
export function FollowButton({ index, className }: { index: number; className: string }) {
  const following = useLibraryStore((s) => s.follows.includes(index));
  return (
    <button className={`${className}${following ? ' on' : ''}`} aria-pressed={following} onClick={() => toggleFollowWithToast(index)}>
      {following ? 'Mengikuti' : 'Ikuti'}
    </button>
  );
}

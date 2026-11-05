'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons/Icon';
import { TrackRow } from '@/components/lists/TrackRow';
import { EmptyState } from '@/components/shell/EmptyState';
import { Reveal } from '@/components/shell/Reveal';
import { PB } from '@/data/mock';
import { playIds } from '@/lib/actions';
import { coverStyle } from '@/lib/cover-art';
import { playlistsOf } from '@/lib/playlists';
import { useLibraryStore } from '@/stores/library';
import { toast, useUiStore } from '@/stores/ui';
import { NotFoundView } from './NotFoundView';

/** Halaman playlist (plV di HTML). `id` = indeks gabungan (bawaan dulu, lalu milik sendiri). */
export function PlaylistView({ id }: { id: string }) {
  const k = Number(id);
  const router = useRouter();
  const own = useLibraryStore((s) => s.ownPlaylists);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);
  const restorePlaylist = useLibraryStore((s) => s.restorePlaylist);
  const openDialog = useUiStore((s) => s.openDialog);
  const p = playlistsOf(own)[k];
  if (!p) return <NotFoundView />;
  const ids = p.tracks.map((x) => x.i);
  const mins = Math.round(p.tracks.reduce((s, x) => s + x.d, 0) / 60);
  const remove = () => {
    const idx = k - PB.length;
    const removed = deletePlaylist(idx);
    if (!removed) return;
    toast('Playlist dihapus', () => restorePlaylist(idx, removed));
    router.push('/library/0');
  };
  return (
    <>
      <Reveal className="dh">
        <div className="cv" style={coverStyle({ h: p.h, s: k + 1 })} />
        <div>
          <p>{`Playlist${p.own ? ' · Milikmu' : ''}`}</p>
          <h1>{p.n}</h1>
          <p>{`${p.tracks.length} lagu · ${mins} mnt`}</p>
          <div className="cta">
            <button className="btn b1" onClick={() => playIds(ids)}>
              <Icon name="play" />
              Putar
            </button>
            <button className="btn b3" onClick={() => playIds(ids, true)}>
              <Icon name="shuffle" />
              Acak
            </button>
            {p.own ? (
              <>
                <button className="btn b3" onClick={() => openDialog({ kind: 'playlist', edit: k })}>
                  <Icon name="edit" />
                  Ubah nama
                </button>
                <button className="btn b3" onClick={remove}>
                  <Icon name="trash" />
                  Hapus
                </button>
              </>
            ) : null}
          </div>
        </div>
      </Reveal>
      {p.tracks.length ? (
        <>
          <h2>Daftar lagu</h2>
          {p.tracks.map((x, i) => (
            <TrackRow key={x.i} track={x} k={i} />
          ))}
        </>
      ) : (
        <EmptyState icon="music" title="Playlist masih kosong" text="Tambahkan lagu lewat menu ⋯ pada lagu mana pun." href="/search" cta="Cari lagu" />
      )}
    </>
  );
}

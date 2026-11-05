'use client';
import { usePathname, useRouter } from 'next/navigation';
import { AlbumCard } from '@/components/cards/AlbumCard';
import { ArtistCard } from '@/components/cards/ArtistCard';
import { GenreTile } from '@/components/cards/GenreTile';
import { Icon } from '@/components/icons/Icon';
import { Shelf } from '@/components/lists/Shelf';
import { TrackRow } from '@/components/lists/TrackRow';
import { EmptyState } from '@/components/shell/EmptyState';
import { TL } from '@/data/mock';
import { coverStyle } from '@/lib/cover-art';
import { searchAll, searchQueryFromPath } from '@/lib/search';
import { useOnline } from '@/lib/use-online';
import { useLibraryStore } from '@/stores/library';
import { usePlayerStore } from '@/stores/player';
import { toast } from '@/stores/ui';

/** Halaman Cari (srchV di HTML): riwayat + ubin genre, atau hasil untuk kata kunci di URL. */
export function SearchView() {
  const q = searchQueryFromPath(usePathname());
  const router = useRouter();
  const online = useOnline();
  const recents = useLibraryStore((s) => s.recents);
  const pushRecent = useLibraryStore((s) => s.pushRecent);
  const removeRecent = useLibraryStore((s) => s.removeRecent);
  const play = usePlayerStore((s) => s.play);
  const openTerm = (term: string) => {
    pushRecent(term);
    router.push(`/search/${encodeURIComponent(term)}`);
  };

  if (!q) {
    return (
      <>
        <h2>Pencarian terakhir</h2>
        <div className="chips" style={{ margin: 0 }}>
          {recents.length ? (
            recents.map((r, k) => (
              <span className="chp" key={r}>
                <button onClick={() => openTerm(r)}>
                  <Icon name="clock" />
                  {r}
                </button>
                <button aria-label={`Hapus ${r} dari riwayat`} onClick={() => removeRecent(k)}>
                  <Icon name="x" />
                </button>
              </span>
            ))
          ) : (
            <p>Belum ada riwayat.</p>
          )}
        </div>
        <h2>Jelajahi semua</h2>
        <div className="tiles">
          {TL.map((t, k) => (
            <GenreTile key={t[1]} tile={t} k={k} onOpen={openTerm} />
          ))}
        </div>
      </>
    );
  }

  if (!online) {
    return (
      <>
        <EmptyState icon="alert" title="Tidak ada koneksi" text="Periksa jaringanmu lalu coba lagi." />
        <div style={{ textAlign: 'center' }}>
          <button className="btn b1" onClick={() => !navigator.onLine && toast('Masih offline')}>
            Coba lagi
          </button>
        </div>
      </>
    );
  }

  const { songs, artists, albums } = searchAll(q);
  const top = songs[0];
  if (!songs.length && !artists.length && !albums.length) {
    return <EmptyState icon="search" title={`Tidak ada hasil untuk “${q}”`} text="Coba kata kunci atau genre lain." href="/" cta="Jelajahi genre" />;
  }
  return (
    <>
      {top ? (
        <>
          <h2>Hasil teratas</h2>
          <button className="top1" onClick={() => play(top.i)}>
            <div className="cv" style={coverStyle(top)} />
            <div>
              <h3>{top.t}</h3>
              <p>{`${top.a} · ${top.g}`}</p>
            </div>
            <span className="ib pb">
              <Icon name="play" />
            </span>
          </button>
          <h2>Lagu</h2>
          {songs.map((x, k) => (
            <TrackRow key={x.i} track={x} k={k} />
          ))}
        </>
      ) : null}
      {artists.length ? (
        <Shelf title="Artis">
          {artists.map((a, k) => (
            <ArtistCard key={a.n} artist={a} k={k} />
          ))}
        </Shelf>
      ) : null}
      {albums.length ? (
        <Shelf title="Album">
          {albums.map((a, k) => (
            <AlbumCard key={a.n} album={a} k={k} />
          ))}
        </Shelf>
      ) : null}
    </>
  );
}

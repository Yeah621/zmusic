'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlbumCard } from '@/components/cards/AlbumCard';
import { artistLine } from '@/components/cards/ArtistCard';
import { FollowButton } from '@/components/cards/FollowButton';
import { NewPlaylistCard, PlaylistCard } from '@/components/cards/PlaylistCard';
import { Icon } from '@/components/icons/Icon';
import { TrackList } from '@/components/lists/TrackList';
import { TrackRow } from '@/components/lists/TrackRow';
import { EmptyState } from '@/components/shell/EmptyState';
import { LoadError } from '@/components/shell/LoadError';
import { Reveal } from '@/components/shell/Reveal';
import { RouteSkeleton } from '@/components/shell/RouteSkeleton';
import { playIds } from '@/lib/actions';
import { artistBg } from '@/lib/cover-art';
import { useGenreMixes, useHome } from '@/lib/data/hooks';
import { playlistsOf } from '@/lib/playlists';
import { useCatalog, type Track } from '@/stores/catalog';
import { useLibraryStore } from '@/stores/library';

const TABS = ['Playlist', 'Artis', 'Album', 'Disukai'] as const;

/** Koleksi dengan empat tab: Playlist, Artis, Album, Disukai (libV di HTML). Tab dari URL /library/<0..3>. */
export function LibraryView() {
  const seg = (usePathname() ?? '').split('/').filter(Boolean);
  const tab = seg[0] === 'library' ? Math.min(3, Math.max(0, Number(seg[1]) || 0)) : 0;
  const own = useLibraryStore((s) => s.ownPlaylists);
  const likes = useLibraryStore((s) => s.likes);
  const follows = useLibraryStore((s) => s.follows);
  const tracks = useCatalog((s) => s.tracks);
  const artists = useCatalog((s) => s.artists);
  const albums = useCatalog((s) => s.albums);
  // Tab Artis dan Album: artis/album dari lagu tren (seperti daftar lengkap di HTML) ditambah artis yang diikuti
  const shelves = useHome('Semua', tab === 1 || tab === 2);
  const mixes = useGenreMixes(tab === 0);
  const byGenre = (g: string): Track[] | null => (mixes.data ? (mixes.data[g] ?? []).map((i) => tracks[i]) : null);
  const pls = playlistsOf(own, byGenre, (i) => tracks[i]);
  const artistIds = shelves.data ? [...shelves.data.artists, ...follows.filter((f) => !shelves.data?.artists.includes(f))] : [];
  return (
    <>
      <h2>Koleksi Kamu</h2>
      <nav className="tabs" aria-label="Koleksi">
        {TABS.map((t, i) => (
          <Link key={t} href={`/library/${i}`} className={i === tab ? 'on' : undefined} aria-current={i === tab ? 'page' : undefined}>
            {t}
          </Link>
        ))}
      </nav>
      {tab === 0 && (
        <div className="row2">
          <NewPlaylistCard />
          {pls.map((p, k) => (
            <PlaylistCard key={`${p.n}-${k}`} playlist={p} k={k} />
          ))}
        </div>
      )}
      {(tab === 1 || tab === 2) && !shelves.data ? (shelves.status === 'error' ? <LoadError error={shelves.error} onRetry={shelves.reload} /> : <RouteSkeleton />) : null}
      {tab === 1 &&
        shelves.data &&
        (artistIds.length ? (
          artistIds.map((i, k) => {
            const a = artists[i];
            return (
            <Reveal className="ar2" delay={k * 50} key={a.k}>
              <Link href={`/artist/${encodeURIComponent(a.k)}`}>
                <div className="avt" style={artistBg(a.h)}>
                  {a.n[0]}
                </div>
                <div>
                  <h4>{a.n}</h4>
                  <p>{artistLine(a)}</p>
                </div>
              </Link>
              <FollowButton index={a.i} className="fb" />
            </Reveal>
            );
          })
        ) : (
          <EmptyState icon="user" title="Belum ada artis" text="Jelajahi musik untuk menemukan artis." href="/" cta="Jelajahi musik" />
        ))}
      {tab === 2 &&
        shelves.data &&
        (shelves.data.albums.length ? (
          <div className="row2">
            {shelves.data.albums.map((i, k) => (
              <AlbumCard key={albums[i].k} album={albums[i]} k={k} />
            ))}
          </div>
        ) : (
          <EmptyState icon="lib" title="Belum ada album" text="Jelajahi musik untuk menemukan album." href="/" cta="Jelajahi musik" />
        ))}
      {tab === 3 &&
        (likes.length ? (
          <>
            <div className="cta" style={{ margin: '0 0 14px' }}>
              <button className="btn b1" onClick={() => playIds(likes)}>
                <Icon name="play" />
                Putar semua
              </button>
            </div>
            <TrackList ids={likes}>
              {likes.map((i, k) => (
                <TrackRow key={i} track={tracks[i]} k={k} />
              ))}
            </TrackList>
          </>
        ) : (
          <EmptyState icon="heart" title="Belum ada lagu disukai" text="Ketuk ikon hati pada lagu favoritmu." href="/" cta="Jelajahi musik" />
        ))}
    </>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlbumCard } from '@/components/cards/AlbumCard';
import { FollowButton } from '@/components/cards/FollowButton';
import { NewPlaylistCard, PlaylistCard } from '@/components/cards/PlaylistCard';
import { Icon } from '@/components/icons/Icon';
import { TrackRow } from '@/components/lists/TrackRow';
import { EmptyState } from '@/components/shell/EmptyState';
import { Reveal } from '@/components/shell/Reveal';
import { A, AL, T } from '@/data/mock';
import { playIds } from '@/lib/actions';
import { artistBg } from '@/lib/cover-art';
import { playlistsOf } from '@/lib/playlists';
import { useLibraryStore } from '@/stores/library';

const TABS = ['Playlist', 'Artis', 'Album', 'Disukai'] as const;

/** Koleksi dengan empat tab: Playlist, Artis, Album, Disukai (libV di HTML). Tab dari URL /library/<0..3>. */
export function LibraryView() {
  const seg = (usePathname() ?? '').split('/').filter(Boolean);
  const tab = seg[0] === 'library' ? Math.min(3, Math.max(0, Number(seg[1]) || 0)) : 0;
  const own = useLibraryStore((s) => s.ownPlaylists);
  const likes = useLibraryStore((s) => s.likes);
  const pls = playlistsOf(own);
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
      {tab === 1 &&
        A.map((a, k) => (
          <Reveal className="ar2" delay={k * 50} key={a.n}>
            <Link href={`/artist/${k}`}>
              <div className="avt" style={artistBg(a.h)}>
                {a.n[0]}
              </div>
              <div>
                <h4>{a.n}</h4>
                <p>{a.f} rb pendengar</p>
              </div>
            </Link>
            <FollowButton index={k} className="fb" />
          </Reveal>
        ))}
      {tab === 2 && (
        <div className="row2">
          {AL.map((a, k) => (
            <AlbumCard key={a.n} album={a} k={k} />
          ))}
        </div>
      )}
      {tab === 3 &&
        (likes.length ? (
          <>
            <div className="cta" style={{ margin: '0 0 14px' }}>
              <button className="btn b1" onClick={() => playIds(likes)}>
                <Icon name="play" />
                Putar semua
              </button>
            </div>
            {likes.map((i, k) => (
              <TrackRow key={i} track={T[i]} k={k} />
            ))}
          </>
        ) : (
          <EmptyState icon="heart" title="Belum ada lagu disukai" text="Ketuk ikon hati pada lagu favoritmu." href="/" cta="Jelajahi musik" />
        ))}
    </>
  );
}

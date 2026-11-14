'use client';
import { useSyncExternalStore } from 'react';
import { AlbumCard } from '@/components/cards/AlbumCard';
import { ArtistCard } from '@/components/cards/ArtistCard';
import { QuickLiked, QuickPlaylistTile } from '@/components/cards/QuickTile';
import { TrackCard } from '@/components/cards/TrackCard';
import { Icon } from '@/components/icons/Icon';
import { Shelf } from '@/components/lists/Shelf';
import { TopChart } from '@/components/lists/TopChart';
import { TrackList } from '@/components/lists/TrackList';
import { LoadError } from '@/components/shell/LoadError';
import { Reveal } from '@/components/shell/Reveal';
import { RouteSkeleton } from '@/components/shell/RouteSkeleton';
import { G, PB } from '@/data/mock';
import { useHome } from '@/lib/data/hooks';
import { greet } from '@/lib/format';
import { useCatalog } from '@/stores/catalog';
import { useLibraryStore } from '@/stores/library';
import { usePlayerStore } from '@/stores/player';
import { useUiStore } from '@/stores/ui';

// Jam lokal hanya diketahui di klien: server dan hidrasi memakai nilai -1 agar tidak terjadi mismatch.
const noopSubscribe = () => () => {};
const localHour = () => new Date().getHours();
const serverHour = () => -1;

/** Rak artis/album di beranda dibatasi agar baris tidak terlalu panjang bila sumber memberi banyak. */
const SHELF_MAX = 20;

function Greeting() {
  const hour = useSyncExternalStore(noopSubscribe, localHour, serverHour);
  const user = useLibraryStore((s) => s.user);
  return <h2 className="gr">{hour < 0 ? '\u00a0' : greet(hour) + (user ? ', ' + user.name.split(' ')[0] : '')}</h2>;
}

/** Beranda (homeV di HTML). Data dari lib/data: lagu tren (per genre), rak artis dan album dari lagu tren semua genre. */
export function HomeView() {
  const genre = useUiStore((s) => s.genre);
  const setGenre = useUiStore((s) => s.setGenre);
  const play = usePlayerStore((s) => s.play);
  const home = useHome('Semua');
  const chosen = useHome(genre);
  const tracks = useCatalog((s) => s.tracks);
  const artists = useCatalog((s) => s.artists);
  const albums = useCatalog((s) => s.albums);

  const d = home.data;
  if (!d) return home.status === 'error' ? <LoadError error={home.error} onRetry={home.reload} /> : <RouteSkeleton />;
  const first = d.ids[0];
  const v = chosen.data?.ids.map((i) => tracks[i]);
  return (
    <>
      <Greeting />
      <div className="qa">
        <QuickLiked />
        {PB.slice(0, 5).map((p, k) => (
          <QuickPlaylistTile key={p.n} playlist={p} k={k} />
        ))}
      </div>
      <Reveal className="hero">
        <div>
          <span className="tag">✦ Rilis baru minggu ini</span>
          <h1>
            Dengarkan <em>tanpa batas</em>, rasakan setiap detik.
          </h1>
          <p>Koleksi lagu pilihan dengan kualitas jernih dan nuansa mint yang segar, menemani harimu kapan saja.</p>
          <div className="cta">
            <button className="btn b1" onClick={() => first !== undefined && play(first, false, d.ids)}>
              <Icon name="play" />
              Putar Sekarang
            </button>
            <button className="btn b2" onClick={() => document.getElementById('chips')?.scrollIntoView({ behavior: 'smooth' })}>
              Jelajahi
            </button>
          </div>
        </div>
        <div className="disc" aria-hidden="true">
          <b>Z</b>
        </div>
      </Reveal>
      {d.artists.length ? (
        <Shelf title="Artis Populer">
          {d.artists.slice(0, SHELF_MAX).map((i, k) => (
            <ArtistCard key={artists[i].k} artist={artists[i]} k={k} />
          ))}
        </Shelf>
      ) : null}
      {d.albums.length ? (
        <Shelf title="Album Terbaru">
          {d.albums.slice(0, SHELF_MAX).map((i, k) => (
            <AlbumCard key={albums[i].k} album={albums[i]} k={k} />
          ))}
        </Shelf>
      ) : null}
      <div className="chips" id="chips" role="group" aria-label="Filter genre">
        {G.map((s) => (
          <button key={s} className={s === genre ? 'on' : undefined} aria-pressed={s === genre} onClick={() => setGenre(s)}>
            {s}
          </button>
        ))}
      </div>
      {v ? (
        <>
          <Shelf title="Sedang Tren">
            <TrackList ids={v.map((x) => x.i)}>
              {v.map((x, k) => (
                <TrackCard key={x.i} track={x} k={k} />
              ))}
            </TrackList>
          </Shelf>
          <h2>Top Chart</h2>
          <TopChart tracks={v} />
        </>
      ) : chosen.status === 'error' ? (
        <LoadError error={chosen.error} onRetry={chosen.reload} />
      ) : (
        [1, 2, 3, 4].map((n) => <div key={n} className="sk" style={{ height: 56, margin: '10px 0' }} />)
      )}
    </>
  );
}

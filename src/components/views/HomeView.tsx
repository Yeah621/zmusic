'use client';
import { useSyncExternalStore } from 'react';
import { AlbumCard } from '@/components/cards/AlbumCard';
import { ArtistCard } from '@/components/cards/ArtistCard';
import { QuickLiked, QuickPlaylistTile } from '@/components/cards/QuickTile';
import { TrackCard } from '@/components/cards/TrackCard';
import { Icon } from '@/components/icons/Icon';
import { Shelf } from '@/components/lists/Shelf';
import { TopChart } from '@/components/lists/TopChart';
import { Reveal } from '@/components/shell/Reveal';
import { A, AL, G, PB, T } from '@/data/mock';
import { greet } from '@/lib/format';
import { useLibraryStore } from '@/stores/library';
import { usePlayerStore } from '@/stores/player';
import { useUiStore } from '@/stores/ui';

// Jam lokal hanya diketahui di klien: server dan hidrasi memakai nilai -1 agar tidak terjadi mismatch.
const noopSubscribe = () => () => {};
const localHour = () => new Date().getHours();
const serverHour = () => -1;

function Greeting() {
  const hour = useSyncExternalStore(noopSubscribe, localHour, serverHour);
  const user = useLibraryStore((s) => s.user);
  return <h2 className="gr">{hour < 0 ? '\u00a0' : greet(hour) + (user ? ', ' + user.name.split(' ')[0] : '')}</h2>;
}

/** Beranda (homeV di HTML). */
export function HomeView() {
  const genre = useUiStore((s) => s.genre);
  const setGenre = useUiStore((s) => s.setGenre);
  const play = usePlayerStore((s) => s.play);
  const v = genre === 'Semua' ? T : T.filter((x) => x.g === genre);
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
            <button className="btn b1" onClick={() => play(0)}>
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
      <Shelf title="Artis Populer">
        {A.map((a, k) => (
          <ArtistCard key={a.n} artist={a} k={k} />
        ))}
      </Shelf>
      <Shelf title="Album Terbaru">
        {AL.map((a, k) => (
          <AlbumCard key={a.n} album={a} k={k} />
        ))}
      </Shelf>
      <div className="chips" id="chips" role="group" aria-label="Filter genre">
        {G.map((s) => (
          <button key={s} className={s === genre ? 'on' : undefined} aria-pressed={s === genre} onClick={() => setGenre(s)}>
            {s}
          </button>
        ))}
      </div>
      <Shelf title="Sedang Tren">
        {v.map((x, k) => (
          <TrackCard key={x.i} track={x} k={k} />
        ))}
      </Shelf>
      <h2>Top Chart</h2>
      <TopChart tracks={v} />
    </>
  );
}

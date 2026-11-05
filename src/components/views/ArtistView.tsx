'use client';
import { AlbumCard } from '@/components/cards/AlbumCard';
import { ArtistCard } from '@/components/cards/ArtistCard';
import { FollowButton } from '@/components/cards/FollowButton';
import { Icon } from '@/components/icons/Icon';
import { TrackRow } from '@/components/lists/TrackRow';
import { Reveal } from '@/components/shell/Reveal';
import { A, AL, T } from '@/data/mock';
import { playIds } from '@/lib/actions';
import { artistBg } from '@/lib/cover-art';
import { NotFoundView } from './NotFoundView';

/** Halaman artis (artV di HTML). `id` = indeks artis. */
export function ArtistView({ id }: { id: string }) {
  const k = Number(id);
  const a = A[k];
  if (!a) return <NotFoundView />;
  const ts = T.filter((x) => x.a === a.n);
  const al = AL.filter((x) => x.a === a.n);
  return (
    <>
      <Reveal className="ab" style={artistBg(a.h)}>
        <div>
          <p>Artis terverifikasi</p>
          <h1>{a.n}</h1>
          <p>{a.f} rb pendengar bulanan</p>
        </div>
        <div className="cta">
          <button className="btn b1" onClick={() => playIds(ts.map((x) => x.i))}>
            <Icon name="play" />
            Putar
          </button>
          <FollowButton index={k} className="btn b2 fol" />
        </div>
      </Reveal>
      <h2>Populer</h2>
      {ts.map((x, i) => (
        <TrackRow key={x.i} track={x} k={i} />
      ))}
      <h2>Diskografi</h2>
      {al.length ? (
        <div className="row">
          {al.map((x, i) => (
            <AlbumCard key={x.n} album={x} k={i} />
          ))}
        </div>
      ) : (
        <p>Belum ada album. Lagu rilisan tunggal.</p>
      )}
      <h2>Tentang</h2>
      <p className="bio">{`${a.n} adalah musisi ${a.g} asal Indonesia. Dikenal lewat perpaduan nada yang hangat, ritme yang mengalir, dan produksi yang bersih. ${ts.length} lagu tersedia di ZMusic.`}</p>
      <h2>Penggemar juga suka</h2>
      <div className="row">
        {A.filter((_, i) => i !== k)
          .slice(0, 6)
          .map((x, i) => (
            <ArtistCard key={x.n} artist={x} k={i} />
          ))}
      </div>
    </>
  );
}

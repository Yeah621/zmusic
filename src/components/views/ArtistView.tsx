'use client';
import { AlbumCard } from '@/components/cards/AlbumCard';
import { ArtistCard } from '@/components/cards/ArtistCard';
import { FollowButton } from '@/components/cards/FollowButton';
import { Icon } from '@/components/icons/Icon';
import { TrackList } from '@/components/lists/TrackList';
import { TrackRow } from '@/components/lists/TrackRow';
import { LoadError } from '@/components/shell/LoadError';
import { Reveal } from '@/components/shell/Reveal';
import { RouteSkeleton } from '@/components/shell/RouteSkeleton';
import { playIds } from '@/lib/actions';
import { SOURCE_LABEL } from '@/lib/constants';
import { artistBg } from '@/lib/cover-art';
import { useArtist } from '@/lib/data/hooks';
import { safeDecode } from '@/lib/url';
import { useCatalog } from '@/stores/catalog';
import { NotFoundView } from './NotFoundView';

/** Halaman artis (artV di HTML). `id` = kunci artis (slug nama; mode contoh: indeks). */
export function ArtistView({ id }: { id: string }) {
  const res = useArtist(safeDecode(id));
  const tracks = useCatalog((s) => s.tracks);
  const artists = useCatalog((s) => s.artists);
  const albums = useCatalog((s) => s.albums);
  if (res.status === 'error') return <LoadError error={res.error} onRetry={res.reload} />;
  if (res.status === 'ready' && !res.data) return <NotFoundView />;
  const d = res.data;
  if (!d) return <RouteSkeleton />;
  const a = artists[d.artist];
  const ts = d.ids.map((i) => tracks[i]);
  const al = d.albums.map((i) => albums[i]);
  const others = artists.filter((x) => x.i !== a.i).slice(0, 6);
  const sources = a.src.map((s) => SOURCE_LABEL[s]).join(' · ');
  const sample = a.f !== undefined;
  return (
    <>
      <Reveal className="ab" style={artistBg(a.h)}>
        <div>
          <p>{sample ? 'Artis terverifikasi' : 'Artis'}</p>
          <h1>{a.n}</h1>
          <p>{sample ? `${a.f} rb pendengar bulanan` : `${ts.length} lagu · ${sources}`}</p>
        </div>
        <div className="cta">
          <button className="btn b1" onClick={() => playIds(d.ids)}>
            <Icon name="play" />
            Putar
          </button>
          <FollowButton index={a.i} className="btn b2 fol" />
        </div>
      </Reveal>
      <h2>Populer</h2>
      <TrackList ids={d.ids}>
        {ts.map((x, i) => (
          <TrackRow key={x.i} track={x} k={i} />
        ))}
      </TrackList>
      <h2>Diskografi</h2>
      {al.length ? (
        <div className="row">
          {al.map((x, i) => (
            <AlbumCard key={x.k} album={x} k={i} />
          ))}
        </div>
      ) : (
        <p>Belum ada album. Lagu rilisan tunggal.</p>
      )}
      <h2>Tentang</h2>
      <p className="bio">
        {sample
          ? `${a.n} adalah musisi ${a.g} asal Indonesia. Dikenal lewat perpaduan nada yang hangat, ritme yang mengalir, dan produksi yang bersih. ${ts.length} lagu tersedia di ZMusic.`
          : `${ts.length} lagu dari ${a.n} tersedia di ZMusic lewat ${sources}.`}
      </p>
      {others.length ? (
        <>
          <h2>Penggemar juga suka</h2>
          <div className="row">
            {others.map((x, i) => (
              <ArtistCard key={x.k} artist={x} k={i} />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

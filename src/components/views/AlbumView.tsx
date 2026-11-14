'use client';
import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { TrackList } from '@/components/lists/TrackList';
import { TrackRow } from '@/components/lists/TrackRow';
import { LoadError } from '@/components/shell/LoadError';
import { Reveal } from '@/components/shell/Reveal';
import { RouteSkeleton } from '@/components/shell/RouteSkeleton';
import { playIds, shareTrack } from '@/lib/actions';
import { coverStyle } from '@/lib/cover-art';
import { useAlbum } from '@/lib/data/hooks';
import { safeDecode } from '@/lib/url';
import { useCatalog } from '@/stores/catalog';
import { NotFoundView } from './NotFoundView';

/** Halaman album (albV di HTML). `id` = kunci album (`<slug artis>~<slug judul>`; mode contoh: indeks). */
export function AlbumView({ id }: { id: string }) {
  const res = useAlbum(safeDecode(id));
  const tracks = useCatalog((s) => s.tracks);
  const artists = useCatalog((s) => s.artists);
  const albums = useCatalog((s) => s.albums);
  if (res.status === 'error') return <LoadError error={res.error} onRetry={res.reload} />;
  if (res.status === 'ready' && !res.data) return <NotFoundView />;
  const d = res.data;
  if (!d) return <RouteSkeleton />;
  const al = albums[d.album];
  const ts = d.ids.map((i) => tracks[i]);
  const mins = Math.round(ts.reduce((s, x) => s + x.d, 0) / 60);
  const artist = artists[al.ak];
  return (
    <>
      <Reveal className="dh">
        <div className="cv" style={coverStyle({ h: al.h, s: al.i + 3, art: al.art })} />
        <div>
          <p>{al.y !== undefined ? `Album · ${al.y}` : 'Album'}</p>
          <h1>{al.n}</h1>
          <p>
            <Link className="lkx" href={`/artist/${encodeURIComponent(artist.k)}`}>
              {al.a}
            </Link>
            {` · ${ts.length} lagu · ${mins} mnt`}
          </p>
          <div className="cta">
            <button className="btn b1" onClick={() => playIds(d.ids)}>
              <Icon name="play" />
              Putar
            </button>
            <button className="btn b3" onClick={() => playIds(d.ids, true)}>
              <Icon name="shuffle" />
              Acak
            </button>
            <button className="btn b3" onClick={shareTrack}>
              <Icon name="share" />
              Bagikan
            </button>
          </div>
        </div>
      </Reveal>
      <h2>Daftar lagu</h2>
      <TrackList ids={d.ids}>
        {ts.map((x, i) => (
          <TrackRow key={x.i} track={x} k={i} />
        ))}
      </TrackList>
    </>
  );
}

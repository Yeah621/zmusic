'use client';
import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { TrackRow } from '@/components/lists/TrackRow';
import { Reveal } from '@/components/shell/Reveal';
import { A, AL, T } from '@/data/mock';
import { playIds, shareTrack } from '@/lib/actions';
import { coverStyle } from '@/lib/cover-art';
import { NotFoundView } from './NotFoundView';

/** Halaman album (albV di HTML). `id` = indeks album. */
export function AlbumView({ id }: { id: string }) {
  const k = Number(id);
  const al = AL[k];
  if (!al) return <NotFoundView />;
  const ts = al.t.map((i) => T[i]);
  const mins = Math.round(ts.reduce((s, x) => s + x.d, 0) / 60);
  const artist = A.findIndex((a) => a.n === al.a);
  return (
    <>
      <Reveal className="dh">
        <div className="cv" style={coverStyle({ h: al.h, s: k + 3 })} />
        <div>
          <p>{`Album · ${al.y}`}</p>
          <h1>{al.n}</h1>
          <p>
            <Link className="lkx" href={`/artist/${artist}`}>
              {al.a}
            </Link>
            {` · ${ts.length} lagu · ${mins} mnt`}
          </p>
          <div className="cta">
            <button className="btn b1" onClick={() => playIds(al.t)}>
              <Icon name="play" />
              Putar
            </button>
            <button className="btn b3" onClick={() => playIds(al.t, true)}>
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
      {ts.map((x, i) => (
        <TrackRow key={x.i} track={x} k={i} />
      ))}
    </>
  );
}

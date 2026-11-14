'use client';
import Link from 'next/link';
import { SOURCE_LABEL } from '@/lib/constants';
import { artistBg } from '@/lib/cover-art';
import { delayStyle, useReveal } from '@/lib/use-reveal';
import type { Artist } from '@/stores/catalog';

/** Baris kedua kartu artis: pendengar (hanya data contoh), selain itu sumber lagunya. Angka pendengar tidak pernah dikarang. */
export const artistLine = (a: Pick<Artist, 'f' | 'src'>): string => (a.f !== undefined ? `${a.f} rb pendengar` : a.src.map((s) => SOURCE_LABEL[s]).join(' · '));

export function ArtistCard({ artist: a, k }: { artist: Artist; k: number }) {
  const { ref, cls } = useReveal<HTMLAnchorElement>();
  return (
    <Link ref={ref} className={`ar rv${cls}`} style={delayStyle(k * 60)} href={`/artist/${encodeURIComponent(a.k)}`}>
      <div className="avt" style={artistBg(a.h)}>
        {a.n[0]}
      </div>
      <h4>{a.n}</h4>
      <p>{artistLine(a)}</p>
    </Link>
  );
}

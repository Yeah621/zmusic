'use client';
import Link from 'next/link';
import { A, type Artist } from '@/data/mock';
import { artistBg } from '@/lib/cover-art';
import { delayStyle, useReveal } from '@/lib/use-reveal';

export function ArtistCard({ artist: a, k }: { artist: Artist; k: number }) {
  const { ref, cls } = useReveal<HTMLAnchorElement>();
  return (
    <Link ref={ref} className={`ar rv${cls}`} style={delayStyle(k * 60)} href={`/artist/${A.indexOf(a)}`}>
      <div className="avt" style={artistBg(a.h)}>
        {a.n[0]}
      </div>
      <h4>{a.n}</h4>
      <p>{a.f} rb pendengar</p>
    </Link>
  );
}

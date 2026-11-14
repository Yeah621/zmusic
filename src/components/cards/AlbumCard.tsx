'use client';
import Link from 'next/link';
import { coverStyle } from '@/lib/cover-art';
import { delayStyle, useReveal } from '@/lib/use-reveal';
import type { Album } from '@/stores/catalog';

export function AlbumCard({ album: a, k }: { album: Album; k: number }) {
  const { ref, cls } = useReveal<HTMLAnchorElement>();
  return (
    <Link ref={ref} className={`card rv${cls}`} style={delayStyle(k * 60)} href={`/album/${encodeURIComponent(a.k)}`}>
      <div className="cv" style={coverStyle({ h: a.h, s: a.i + 3, art: a.art })} />
      <h4>{a.n}</h4>
      <p>{a.y !== undefined ? `${a.y} · ${a.a}` : a.a}</p>
    </Link>
  );
}

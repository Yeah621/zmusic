'use client';
import Link from 'next/link';
import { AL, type Album } from '@/data/mock';
import { coverStyle } from '@/lib/cover-art';
import { delayStyle, useReveal } from '@/lib/use-reveal';

export function AlbumCard({ album: a, k }: { album: Album; k: number }) {
  const { ref, cls } = useReveal<HTMLAnchorElement>();
  const i = AL.indexOf(a);
  return (
    <Link ref={ref} className={`card rv${cls}`} style={delayStyle(k * 60)} href={`/album/${i}`}>
      <div className="cv" style={coverStyle({ h: a.h, s: i + 3 })} />
      <h4>{a.n}</h4>
      <p>
        {a.y} · {a.a}
      </p>
    </Link>
  );
}

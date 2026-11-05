'use client';
import type { CSSProperties } from 'react';
import type { GenreTile as GenreTileData } from '@/data/mock';
import { useReveal } from '@/lib/use-reveal';

export function GenreTile({ tile, k, onOpen }: { tile: GenreTileData; k: number; onOpen: (slug: string) => void }) {
  const { ref, cls } = useReveal<HTMLButtonElement>();
  return (
    <button ref={ref} className={`tile rv${cls}`} style={{ '--h': String(tile[2]), '--d': `${k * 50}ms` } as CSSProperties} onClick={() => onOpen(tile[1])}>
      {tile[0]}
    </button>
  );
}

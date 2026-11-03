'use client';
import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import type { QuickPlaylist } from '@/data/mock';
import { playQuickPlaylist } from '@/lib/actions';
import { coverStyle } from '@/lib/cover-art';
import { delayStyle, useReveal } from '@/lib/use-reveal';

/** Pintasan cepat "Lagu Disukai" di atas Beranda (.qt). */
export function QuickLiked() {
  const { ref, cls } = useReveal<HTMLAnchorElement>();
  return (
    <Link ref={ref} className={`qt rv${cls}`} href="/library/3">
      <div className="cv" style={{ background: 'linear-gradient(135deg,#7c5cff,#2de3b2)' }}>
        <Icon name="heart" />
      </div>
      <span className="qn">Lagu Disukai</span>
    </Link>
  );
}

/** Pintasan cepat playlist bawaan: klik langsung memutar. */
export function QuickPlaylistTile({ playlist: p, k }: { playlist: QuickPlaylist; k: number }) {
  const { ref, cls } = useReveal<HTMLButtonElement>();
  return (
    <button ref={ref} className={`qt rv${cls}`} style={delayStyle((k + 1) * 50)} onClick={() => playQuickPlaylist(p)}>
      <div className="cv" style={coverStyle({ h: p.h, s: k + 1 })} />
      <span className="qn">{p.n}</span>
      <span className="qp">
        <Icon name="play" />
      </span>
    </button>
  );
}

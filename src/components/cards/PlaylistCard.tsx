'use client';
import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { coverStyle } from '@/lib/cover-art';
import type { PlaylistInfo } from '@/lib/playlists';
import { delayStyle, useReveal } from '@/lib/use-reveal';
import { useUiStore } from '@/stores/ui';

export function PlaylistCard({ playlist: p, k }: { playlist: PlaylistInfo; k: number }) {
  const { ref, cls } = useReveal<HTMLAnchorElement>();
  return (
    <Link ref={ref} className={`card rv${cls}`} style={delayStyle((k + 1) * 50)} href={`/playlist/${k}`}>
      <div className="cv" style={coverStyle({ h: p.h, s: k + 1 })} />
      <h4>{p.n}</h4>
      <p>{p.tracks ? `${p.tracks.length} lagu${p.own ? ' · Milikmu' : ''}` : 'Memuat…'}</p>
    </Link>
  );
}

/** Kartu "Playlist baru" di tab Playlist: membuka dialog. */
export function NewPlaylistCard() {
  const { ref, cls } = useReveal<HTMLDivElement>();
  const openDialog = useUiStore((s) => s.openDialog);
  const open = () => openDialog({ kind: 'playlist' });
  return (
    <div
      ref={ref}
      className={`card newc rv${cls}`}
      data-a="npl"
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
    >
      <div className="cv nw">
        <Icon name="plus" />
      </div>
      <h4>Playlist baru</h4>
      <p>Buat koleksimu</p>
    </div>
  );
}

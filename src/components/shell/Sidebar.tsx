'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icons/Icon';
import { PB } from '@/data/mock';
import { toast, useUiStore } from '@/stores/ui';
import { NAV_ITEMS, navIndex } from './nav';
import { requireLogin } from '@/lib/auth/gate';

export function Sidebar() {
  const active = navIndex(usePathname());
  const openDialog = useUiStore((s) => s.openDialog);
  return (
    <aside className="side pn gl" aria-label="Navigasi utama">
      <Link className="logo" href="/" aria-label="ZMusic beranda">
        <b>Z</b>ZMusic
      </Link>
      {NAV_ITEMS.map((n, i) => (
        <Link key={n.href} className={`nv${i === active ? ' on' : ''}`} href={n.href} aria-current={i === active ? 'page' : undefined}>
          <Icon name={n.icon} />
          {n.label}
        </Link>
      ))}
      <small>Playlist cepat</small>
      <div id="sidepl">
        {PB.slice(0, 4).map((p, k) => (
          <Link key={p.n} className="nv" href={`/playlist/${k}`}>
            <Icon name="play" />
            {p.n}
          </Link>
        ))}
      </div>
      <button
        className="nv"
        onClick={() => {
          if (requireLogin('Masuk untuk membuat playlist')) openDialog({ kind: 'playlist' });
        }}
      >
        <Icon name="plus" />
        Playlist baru
      </button>
      <div className="promo">
        <h4>ZMusic Premium</h4>
        <p>Tanpa iklan, kualitas Hi-Fi, unduh offline.</p>
        <button onClick={() => toast('Kamu sudah Premium ✦')}>Kelola paket</button>
      </div>
    </aside>
  );
}

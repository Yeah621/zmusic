'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icons/Icon';
import { NAV_ITEMS, navIndex } from './nav';

export function BottomNav() {
  const active = navIndex(usePathname());
  return (
    <nav className="bn gl" aria-label="Navigasi bawah">
      {NAV_ITEMS.map((n, i) => (
        <Link key={n.href} href={n.href} className={i === active ? 'on' : undefined} aria-current={i === active ? 'page' : undefined}>
          <Icon name={n.icon} />
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

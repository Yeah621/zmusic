import type { IconName } from '@/components/icons/Icon';

export const NAV_ITEMS: readonly { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Beranda', icon: 'home' },
  { href: '/search', label: 'Cari', icon: 'search' },
  { href: '/library', label: 'Koleksi', icon: 'lib' },
  { href: '/upload', label: 'Unggah', icon: 'upload' },
  { href: '/profile', label: 'Profil', icon: 'user' },
];

// Padanan NAV di HTML: segmen pertama rute → tab yang aktif
const SECTION = new Map<string, number>([
  ['', 0], ['search', 1], ['library', 2], ['playlist', 2], ['upload', 3], ['profile', 4], ['settings', 4], ['login', 4], ['register', 4],
]);

export const navIndex = (pathname: string | null): number => SECTION.get((pathname ?? '').split('/')[1] ?? '') ?? -1;

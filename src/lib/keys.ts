import { hueFrom } from '@/lib/sources/ids';

/** Slug stabil dari nama: huruf kecil, tanpa tanda baca dan `%`, huruf non-Latin dipertahankan. Dipakai kunci URL dan identitas artis/album. */
export const slug = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
export const artistKeyOf = (name: string): string => slug(name) || `a${hueFrom(name)}`;
export const albumKeyOf = (artist: string, title: string): string => `${artistKeyOf(artist)}~${slug(title) || `a${hueFrom(title)}`}`;
/** Tebakan nama dari kunci (untuk memuat artis/album saat dibuka langsung lewat URL). */
export const wordsOfKey = (k: string): string => k.replace(/-/g, ' ').trim();

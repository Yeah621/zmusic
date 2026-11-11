import type { SourceId } from './types';

const SOURCES: readonly SourceId[] = ['upload', 'audius', 'jamendo', 'deezer'];

export const makeId = (source: SourceId, raw: string): string => `${source}:${raw}`;

/** Pisahkan id global; null bila sumber tidak dikenal. */
export function parseId(id: string): { source: SourceId; rawId: string } | null {
  const i = id.indexOf(':');
  const source = id.slice(0, i) as SourceId;
  return i > 0 && i < id.length - 1 && SOURCES.includes(source) ? { source, rawId: id.slice(i + 1) } : null;
}

/** Hue 0–359 yang stabil dari teks (cadangan cover generatif bila lagu tak punya artwork). */
export function hueFrom(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

/** Kunci untuk membuang lagu ganda antar sumber: judul + artis tanpa tanda baca dan huruf besar. */
export const dedupeKey = (title: string, artist: string): string => `${title}|${artist}`.toLowerCase().replace(/[^\p{L}\p{N}|]+/gu, '');

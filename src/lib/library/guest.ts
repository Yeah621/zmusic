import type { SourceTrack } from '@/lib/sources/types';

const KEY = 'zm-guest';

/** Data koleksi tamu di localStorage: riwayat cari dan riwayat putar (lagu disimpan utuh agar bisa tampil lagi setelah muat ulang). */
export interface GuestData {
  recents: string[];
  history: SourceTrack[];
}
const empty = (): GuestData => ({ recents: [], history: [] });

export function loadGuest(): GuestData {
  try {
    const j: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (typeof j !== 'object' || j === null) return empty();
    const o = j as { recents?: unknown; history?: unknown };
    const recents = Array.isArray(o.recents) ? o.recents.filter((x): x is string => typeof x === 'string').slice(0, 6) : [];
    const history = Array.isArray(o.history) ? (o.history as unknown[]).filter((x): x is SourceTrack => typeof x === 'object' && x !== null && typeof (x as SourceTrack).id === 'string' && typeof (x as SourceTrack).title === 'string').slice(0, 8) : [];
    return { recents, history };
  } catch {
    return empty();
  }
}

export function saveGuest(d: GuestData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // penyimpanan penuh atau diblokir: riwayat tamu tidak tersimpan, tidak fatal
  }
}

export function clearGuest(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // diabaikan
  }
}

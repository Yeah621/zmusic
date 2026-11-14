import { G } from '@/data/mock';
import { sampleSearch } from '@/lib/data/sample';
import type { SearchData } from '@/lib/data/types';
import { useCatalog, type Album, type Artist, type Track } from '@/stores/catalog';

export interface Suggestion {
  kind: 't' | 'a' | 'al' | 'g';
  /** indeks lagu (kind 't') */
  i?: number;
  /** kunci artis atau album untuk URL (kind 'a' dan 'al') */
  key?: string;
  label: string;
  sub: string;
}

export interface SearchResults {
  songs: Track[];
  artists: Artist[];
  albums: Album[];
}

/** Ubah indeks hasil pemuatan menjadi objek katalog. */
export function resultsOf(d: SearchData): SearchResults {
  const { tracks, artists, albums } = useCatalog.getState();
  return { songs: d.ids.map((i) => tracks[i]), artists: d.artists.map((i) => artists[i]), albums: d.albums.map((i) => albums[i]) };
}

/** Pencarian lokal atas data contoh (padanan srchV di HTML). Data nyata datang dari loadSearch (lib/data/client.ts). */
export function searchAll(q: string): SearchResults {
  return resultsOf(sampleSearch(q));
}

/**
 * Saran saat mengetik: maks 3 lagu, 2 artis, 1 album, 1 genre (padanan sug() di HTML).
 * `strict` (data contoh): lagu harus cocok pada judul/artis seperti di HTML. Data nyata: hasil server dipakai apa adanya,
 * karena sumber boleh mencocokkan lebih longgar (mis. nama album).
 */
export function suggestFrom(v: string, r: SearchResults, strict: boolean): Suggestion[] {
  const l = v.trim().toLowerCase();
  if (!l) return [];
  const songs = strict ? r.songs.filter((x) => `${x.t} ${x.a}`.toLowerCase().includes(l)) : r.songs;
  return [
    ...songs.slice(0, 3).map((x): Suggestion => ({ kind: 't', i: x.i, label: x.t, sub: `Lagu · ${x.a}` })),
    ...r.artists.filter((a) => a.n.toLowerCase().includes(l)).slice(0, 2).map((a): Suggestion => ({ kind: 'a', key: a.k, label: a.n, sub: 'Artis' })),
    ...r.albums.filter((a) => a.n.toLowerCase().includes(l)).slice(0, 1).map((a): Suggestion => ({ kind: 'al', key: a.k, label: a.n, sub: `Album · ${a.a}` })),
    ...G.slice(1).filter((x) => x.toLowerCase().includes(l)).slice(0, 1).map((x): Suggestion => ({ kind: 'g', label: x, sub: 'Genre' })),
  ];
}

/** Saran dari data contoh. */
export const suggest = (v: string): Suggestion[] => suggestFrom(v, searchAll(v), true);

/** Kata kunci dari rute /search/<q> (kosong bila bukan halaman cari). */
export function searchQueryFromPath(pathname: string | null): string {
  const seg = (pathname ?? '').split('/').filter(Boolean);
  if (seg[0] !== 'search') return '';
  return seg
    .slice(1)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    })
    .join('/');
}
